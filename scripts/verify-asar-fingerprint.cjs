/**
 * 用 i18n key 作为功能指纹，对比官方 asar 与打包后 asar，
 * 确认没有任何功能丢失。
 */
const fs = require("node:fs");

function collect(p) {
    const buf = fs.readFileSync(p);
    const s = buf.readUInt32LE(12);
    const h = JSON.parse(buf.slice(16, 16 + s).toString("utf8"));
    const ds = 16 + s;
    const out = [];
    (function walk(node, prefix) {
        for (const [n, c] of Object.entries(node.files || {})) {
            const f = prefix ? `${prefix}/${n}` : n;
            if (c.files) {
                walk(c, f);
            } else if (!c.unpacked && f.endsWith(".js")) {
                out.push(buf.slice(ds + Number(c.offset), ds + Number(c.offset) + c.size).toString("utf8"));
            }
        }
    })(h, "");
    return out.join("\n");
}

const a = collect(process.argv[2]);
const b = collect(process.argv[3]);

// 匹配形如 "side_bar.xxx" / "plugin.yyy" 的 i18n key
const re = /["']([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)["']/g;
const keysOf = (s) => new Set([...s.matchAll(re)].map((m) => m[1]));

const ka = keysOf(a);
const kb = keysOf(b);
const lost = [...ka].filter((k) => !kb.has(k));
const added = [...kb].filter((k) => !ka.has(k));

console.log(`官方标识数: ${ka.size}   我的: ${kb.size}`);
console.log(`\n=== 官方有、我的没有（功能丢失，必须为 0）===`);
console.log(lost.length ? lost.join("\n") : "  （无）");
console.log(`\n=== 我新增的（应为我的封面功能）===`);
console.log(added.length ? added.slice(0, 20).join("\n") : "  （无）");

process.exit(lost.length ? 1 : 0);
