/**
 * CDP 连接的底层实现：原始 socket 完成 WebSocket 握手，
 * 避免 Electron 对 Origin 头的校验。
 */
const http = require("node:http");
const crypto = require("node:crypto");
const net = require("node:net");

const PORT = Number(process.env.CDP_PORT || 9333);

function httpGet(path) {
    return new Promise((resolve, reject) => {
        http.get({ host: "127.0.0.1", port: PORT, path }, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => resolve(JSON.parse(data)));
        }).on("error", reject);
    });
}

function sendFrame(socket, text) {
    const payload = Buffer.from(text, "utf8");
    const len = payload.length;
    let header;
    if (len < 126) {
        header = Buffer.from([0x81, 0x80 | len]);
    } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 0x80 | 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 0x80 | 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }
    const mask = crypto.randomBytes(4);
    const masked = Buffer.alloc(len);
    for (let i = 0; i < len; i += 1) {
        masked[i] = payload[i] ^ mask[i % 4];
    }
    socket.write(Buffer.concat([header, mask, masked]));
}

function decodeFrame(buffer) {
    if (buffer.length < 2) {
        return null;
    }
    const opcode = buffer[0] & 0x0f;
    const masked = (buffer[1] & 0x80) !== 0;
    let len = buffer[1] & 0x7f;
    let offset = 2;
    if (len === 126) {
        if (buffer.length < 4) return null;
        len = buffer.readUInt16BE(2);
        offset = 4;
    } else if (len === 127) {
        if (buffer.length < 10) return null;
        len = Number(buffer.readBigUInt64BE(2));
        offset = 10;
    }
    let maskKey = null;
    if (masked) {
        if (buffer.length < offset + 4) return null;
        maskKey = buffer.slice(offset, offset + 4);
        offset += 4;
    }
    if (buffer.length < offset + len) {
        return null;
    }
    const payload = Buffer.from(buffer.slice(offset, offset + len));
    if (maskKey) {
        for (let i = 0; i < payload.length; i += 1) {
            payload[i] ^= maskKey[i % 4];
        }
    }
    return { opcode, payload, consumed: offset + len };
}

function wsConnect(url) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const key = crypto.randomBytes(16).toString("base64");
        const socket = net.connect(Number(parsed.port), parsed.hostname, () => {
            socket.write(
                `GET ${parsed.pathname}${parsed.search} HTTP/1.1\r\n` +
                `Host: ${parsed.hostname}:${parsed.port}\r\n` +
                "Upgrade: websocket\r\n" +
                "Connection: Upgrade\r\n" +
                `Sec-WebSocket-Key: ${key}\r\n` +
                "Sec-WebSocket-Version: 13\r\n\r\n",
            );
        });

        let buffer = Buffer.alloc(0);
        let upgraded = false;
        const listeners = [];
        const queue = [];

        socket.on("data", (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            if (!upgraded) {
                const headerEnd = buffer.indexOf("\r\n\r\n");
                if (headerEnd < 0) {
                    return;
                }
                const header = buffer.slice(0, headerEnd).toString();
                if (!/HTTP\/1\.1 101/.test(header)) {
                    reject(new Error("handshake failed: " + header.split("\r\n")[0]));
                    socket.destroy();
                    return;
                }
                buffer = buffer.slice(headerEnd + 4);
                upgraded = true;
                resolve({
                    socket,
                    send: (text) => sendFrame(socket, text),
                    onMessage: (cb) => {
                        listeners.push(cb);
                        while (queue.length) {
                            cb(queue.shift());
                        }
                    },
                });
            }
            while (true) {
                const frame = decodeFrame(buffer);
                if (!frame) {
                    break;
                }
                buffer = buffer.slice(frame.consumed);
                if (frame.opcode === 0x1) {
                    const text = frame.payload.toString("utf8");
                    if (listeners.length) {
                        for (const cb of listeners) {
                            cb(text);
                        }
                    } else {
                        queue.push(text);
                    }
                }
            }
        });
        socket.on("error", reject);
    });
}

async function withPage(fn, timeoutMs = 30000) {
    const targets = await httpGet("/json/list");
    const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    if (!page) {
        throw new Error("no page target");
    }
    const conn = await wsConnect(page.webSocketDebuggerUrl);
    // id 必须是数字，否则 Electron 的 CDP 会返回 -32600
    let seq = Date.now() % 1000000;

    try {
        return await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                conn.socket.destroy();
                reject(new Error("timeout"));
            }, timeoutMs);
            const pending = new Map();

            conn.onMessage((raw) => {
                let msg;
                try { msg = JSON.parse(raw); } catch { return; }
                const resolver = pending.get(msg.id);
                if (!resolver) {
                    return;
                }
                pending.delete(msg.id);
                clearTimeout(timer);
                conn.socket.destroy();
                if (msg.error) {
                    resolver.reject(new Error(JSON.stringify(msg.error)));
                    return;
                }
                resolver.resolve(msg.result);
            });

            const call = (method, params) => new Promise((resolve, reject) => {
                seq += 1;
                const id = seq;
                pending.set(id, { resolve, reject });
                conn.send(JSON.stringify({ id, method, params: params ?? {} }));
            });

            fn(call).then(
                (value) => resolve(value),
                (error) => reject(error),
            );
        });
    } finally {
        // socket 已在 resolve/reject 时关闭
    }
}

async function evaluate(expression, timeoutMs = 30000) {
    const result = await withPage(async (call) => {
        const res = await call("Runtime.evaluate", {
            expression,
            awaitPromise: true,
            returnByValue: true,
        });
        return res;
    }, timeoutMs);

    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text + " " +
            (result.exceptionDetails.exception?.description ?? ""));
    }
    return result.result?.value;
}

async function cdpCall(method, params, timeoutMs = 30000) {
    return await withPage((call) => call(method, params), timeoutMs);
}

module.exports = { evaluate, cdpCall };
