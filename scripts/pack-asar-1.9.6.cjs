/**
 * 用官方 unpack 规则打包 app.asar。
 *
 * 官方 1.9.6 的 asar 只把 JS/HTML 等文本文件放进包内，
 * 原生二进制（*.node）与 sharp 平台包留在 app.asar.unpacked，
 * 必须严格对齐，否则 Electron 找不到原生模块会启动即崩。
 */
const fs = require("node:fs");
const path = require("node:path");

const asar = require("@electron/asar");

const SRC = path.resolve(__dirname, "..", "..", "baka-196");
const OUT = path.resolve(__dirname, "..", "..", "baka-196-patched.asar");

// 与官方 app.asar.unpacked 完全一致的规则：
//  - 原生二进制（*.node）
//  - sharp 平台包（sharp 的原生 addon 需要同目录的 DLL 一起落在包外）
// asar 的 unpack 使用 matchBase（只看文件名），unpackDir 用于整个目录。
const UNPACK_PATTERN = "*.node";
const UNPACK_DIR = "node_modules/@img/sharp-win32-x64";

async function main() {
    if (fs.existsSync(OUT)) {
        fs.unlinkSync(OUT);
    }
    const unpackedOut = `${OUT}.unpacked`;
    if (fs.existsSync(unpackedOut)) {
        fs.rmSync(unpackedOut, { recursive: true, force: true });
    }

    await asar.createPackageWithOptions(SRC, OUT, {
        unpack: UNPACK_PATTERN,
        unpackDir: UNPACK_DIR,
    });

    const buf = fs.readFileSync(OUT);
    const headerSize = buf.readUInt32LE(12);
    const header = JSON.parse(buf.slice(16, 16 + headerSize).toString("utf8"));
    const dataStart = 16 + headerSize;

    let nonUnpacked = 0;
    let nonUnpackedSize = 0;
    let unpacked = 0;
    (function walk(node) {
        for (const child of Object.values(node.files || {})) {
            if (child.files) {
                walk(child);
            } else if (child.unpacked) {
                unpacked += 1;
            } else {
                nonUnpacked += 1;
                nonUnpackedSize += child.size || 0;
            }
        }
    })(header);

    console.log(`asar: ${OUT}`);
    console.log(`  总大小        : ${buf.length}`);
    console.log(`  数据区大小    : ${buf.length - dataStart}`);
    console.log(`  包内文件(size合计): ${nonUnpackedSize} (${nonUnpacked} 个)`);
    console.log(`  unpacked 条目 : ${unpacked}`);
    console.log(`  unpacked 目录 : ${fs.existsSync(unpackedOut) ? "已生成" : "缺失 ❌"}`);

    // 校验：包内文件 size 合计应等于数据区大小（无空洞）
    const consistent = nonUnpackedSize === buf.length - dataStart;
    console.log(`  布局自洽      : ${consistent ? "✓" : "✗"}`);
    if (!consistent) {
        console.log(`    size合计=${nonUnpackedSize} 数据区=${buf.length - dataStart}`);
    }

    const unpackedOk = unpacked > 0 && fs.existsSync(unpackedOut);
    console.log(`\n${consistent && unpackedOk ? "✅ 打包正确" : "❌ 打包有问题"}`);
    process.exit(consistent && unpackedOk ? 0 : 1);
}

main().catch((error) => {
    console.error("ERR:", error);
    process.exit(1);
});
