/**
 * 更新 exe 内嵌的 asar 完整性清单（Electron asar integrity）。
 *
 * exe 资源里有一份 JSON：
 *   [{"file":"resources\\app.asar","alg":"SHA256","value":"<header 的 sha256>"}]
 * 替换 app.asar 后必须同步更新这里的哈希，否则 Electron 会以
 * "Integrity check failed for asar archive entry '<header>'" 直接退出。
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const EXE = process.argv[2] || "E:/BakaMusic/BakaMusic.exe";
const ASAR = process.argv[3];

function computeHeaderHash(asarPath) {
    const buf = fs.readFileSync(asarPath);
    const headerSize = buf.readUInt32LE(12);
    return crypto.createHash("sha256")
        .update(buf.slice(16, 16 + headerSize))
        .digest("hex");
}

function main() {
    if (!ASAR) {
        console.error("usage: node patch-asar-integrity.cjs <exe> <app.asar>");
        process.exit(1);
    }

    const newHash = computeHeaderHash(ASAR);
    console.log(`新 asar header sha256 = ${newHash}`);

    const exeBuf = fs.readFileSync(EXE);

    // 定位完整性清单 JSON
    const marker = Buffer.from('"file":"resources\\\\app.asar"');
    let idx = exeBuf.indexOf(marker);
    if (idx < 0) {
        // 尝试另一种转义形式
        const alt = Buffer.from('"file":"resources\\app.asar"');
        idx = exeBuf.indexOf(alt);
    }
    if (idx < 0) {
        console.error("未在 exe 中找到 asar 完整性清单");
        process.exit(1);
    }

    // 找到 "value":"<64 hex>" 并替换
    const searchStart = idx;
    const valueMarker = Buffer.from('"value":"');
    const vIdx = exeBuf.indexOf(valueMarker, searchStart);
    if (vIdx < 0) {
        console.error("未找到 value 字段");
        process.exit(1);
    }
    const hashStart = vIdx + valueMarker.length;
    const oldHash = exeBuf.slice(hashStart, hashStart + 64).toString("utf8");
    console.log(`exe 中的旧哈希 = ${oldHash}`);

    if (oldHash === newHash) {
        console.log("哈希已一致，无需修改");
        return;
    }

    const out = Buffer.concat([
        exeBuf.slice(0, hashStart),
        Buffer.from(newHash, "utf8"),
        exeBuf.slice(hashStart + 64),
    ]);
    fs.writeFileSync(EXE, out);
    console.log(`✅ 已更新 exe 中的哈希为 ${newHash}`);
    console.log(`   exe 大小: ${exeBuf.length} -> ${out.length}`);
}

main();
