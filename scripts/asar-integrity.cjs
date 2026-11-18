/**
 * 计算 Electron asar 完整性校验用的 header SHA256，
 * 并把新哈希写回 exe 内嵌的完整性清单。
 *
 * Electron 的 asar integrity 校验针对的是 header 区
 * （即 asar 头部 JSON 那一段），alg 为 SHA256。
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const EXE = process.argv[2] || "E:/BakaMusic/BakaMusic.exe";
const ASAR = process.argv[3] || path.resolve(__dirname, "..", "..", "baka-196-patched.asar");

// Electron 校验的是 header（含 pickle 头的那段）
function computeAsarHeaderHash(asarPath) {
    const buf = fs.readFileSync(asarPath);
    const headerSize = buf.readUInt32LE(12);
    // header 区 = 4字节pickle + 4 + 4 + 4 + headerString
    const headerEnd = 16 + headerSize;
    return crypto.createHash("sha256").update(buf.slice(0, headerEnd)).digest("hex");
}

// 反过来：Electron 实际校验的区间
function computeVariantHashes(asarPath) {
    const buf = fs.readFileSync(asarPath);
    const headerSize = buf.readUInt32LE(12);
    const variants = {};
    variants.header_with_pickle = crypto.createHash("sha256").update(buf.slice(0, 16 + headerSize)).digest("hex");
    variants.header_json_only = crypto.createHash("sha256").update(buf.slice(16, 16 + headerSize)).digest("hex");
    variants.header_string = crypto.createHash("sha256")
        .update(buf.slice(16, 16 + headerSize - 4)).digest("hex");
    variants.whole_file = crypto.createHash("sha256").update(buf).digest("hex");
    return variants;
}

const asar = process.argv[3] || path.resolve(__dirname, "..", "..", "baka-196-patched.asar");
const official = process.argv[4];

const variants = computeVariantHashes(asar);
console.log("新 asar 的各种哈希:");
for (const [k, v] of Object.entries(variants)) {
    console.log(`  ${k} = ${v}`);
}

if (official) {
    const off = computeVariantHashes(official);
    console.log("\n官方 asar 的各种哈希:");
    for (const [k, v] of Object.entries(off)) {
        const match = v === "53262f576032f0d20b6669e6b278cf4f8ad54e6047fdb32d233c0d5b9846cba4";
        console.log(`  ${k} = ${v}${match ? "  ← 匹配官方清单！" : ""}`);
    }
}
