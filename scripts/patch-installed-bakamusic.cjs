/**
 * 一键把「更换歌单封面」功能适配到已安装的 BakaMusic。
 *
 * 流程：
 *   1. 用仓库里的源码重新构建 bundle（main / renderer / preload）
 *   2. 解包 app.asar，替换对应文件
 *   3. 按官方规则重新打包 asar（unpack 原生二进制与 sharp 平台包）
 *   4. 同步更新 exe 内嵌的 asar 完整性哈希（否则 Electron 启动即崩）
 *   5. 补齐语言包里的封面相关文案
 *
 * 用法：
 *   node scripts\patch-installed-bakamusic.cjs [安装目录]
 *   默认安装目录 E:\BakaMusic
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const INSTALL = process.argv[2] || "E:\\BakaMusic";
const RESOURCES = path.join(INSTALL, "resources");
const ASAR = path.join(RESOURCES, "app.asar");
const EXE = path.join(INSTALL, "BakaMusic.exe");
const WORK = path.join(ROOT, ".patch-work");

function run(cmd, args, opts = {}) {
    console.log(`  > ${path.basename(cmd)} ${args.join(" ")}`);
    execFileSync(cmd, args, { stdio: "inherit", cwd: ROOT, ...opts });
}

function computeHeaderHash(asarPath) {
    const buf = fs.readFileSync(asarPath);
    const headerSize = buf.readUInt32LE(12);
    return crypto.createHash("sha256")
        .update(buf.slice(16, 16 + headerSize))
        .digest("hex");
}

function patchExeIntegrity(exePath, newHash) {
    const buf = fs.readFileSync(exePath);
    const marker = Buffer.from('"file":"resources\\\\app.asar"');
    let idx = buf.indexOf(marker);
    if (idx < 0) {
        idx = buf.indexOf(Buffer.from('"file":"resources\\app.asar"'));
    }
    if (idx < 0) {
        console.log("  ! exe 中未找到 asar 完整性清单，跳过");
        return false;
    }
    const valueMarker = Buffer.from('"value":"');
    const vIdx = buf.indexOf(valueMarker, idx);
    if (vIdx < 0) {
        return false;
    }
    const hashStart = vIdx + valueMarker.length;
    const oldHash = buf.slice(hashStart, hashStart + 64).toString("utf8");
    if (oldHash === newHash) {
        console.log("  ✓ exe 哈希已是最新的");
        return false;
    }
    const out = Buffer.concat([
        buf.slice(0, hashStart),
        Buffer.from(newHash, "utf8"),
        buf.slice(hashStart + 64),
    ]);
    fs.writeFileSync(exePath, out);
    console.log(`  ✓ exe 完整性哈希已更新: ${oldHash.slice(0, 12)}… -> ${newHash.slice(0, 12)}…`);
    return true;
}

function main() {
    if (!fs.existsSync(ASAR)) {
        console.error(`找不到 ${ASAR}`);
        process.exit(1);
    }

    console.log("== 0/5 停止 BakaMusic ==");
    try {
        execFileSync("taskkill", ["/IM", "BakaMusic.exe", "/F"], { stdio: "ignore" });
        console.log("  ✓ 已停止");
    } catch {
        console.log("  · 未在运行");
    }
    process.exitCode = 0;

    console.log("== 1/5 构建 bundle ==");
    fs.rmSync(path.join(ROOT, ".webpack"), { recursive: true, force: true });
    run(process.execPath, [
        "-r", "ts-node/register/transpile-only",
        path.join(ROOT, "scripts", "build-bundles-forge.cjs"),
    ], { env: { ...process.env, NODE_ENV: "production" } });

    console.log("== 2/5 解包 app.asar ==");
    fs.rmSync(WORK, { recursive: true, force: true });
    fs.mkdirSync(WORK, { recursive: true });
    const asarBin = path.join(ROOT, "node_modules", "@electron", "asar", "bin", "asar.js");
    run(process.execPath, [asarBin, "extract", ASAR, WORK]);

    console.log("== 3/5 替换 bundle ==");
    const copyDir = (from, to, skipExisting = false) => {
        fs.mkdirSync(to, { recursive: true });
        for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
            const src = path.join(from, entry.name);
            const dst = path.join(to, entry.name);
            if (entry.isDirectory()) {
                copyDir(src, dst, skipExisting);
            } else if (!skipExisting || !fs.existsSync(dst)) {
                fs.copyFileSync(src, dst);
            }
        }
    };
    copyDir(path.join(ROOT, ".webpack", "main"), path.join(WORK, ".webpack", "main"));
    copyDir(path.join(ROOT, ".webpack", "renderer"), path.join(WORK, ".webpack", "renderer"));
    console.log("  ✓ bundle 已替换");

    console.log("== 4/5 重新打包并同步 exe 哈希 ==");
    const packed = path.join(ROOT, ".patch-app.asar");
    fs.rmSync(packed, { force: true });
    fs.rmSync(`${packed}.unpacked`, { recursive: true, force: true });
    const asar = require("@electron/asar");
    asar.createPackageWithOptions(WORK, packed, {
        unpack: "*.node",
        unpackDir: "node_modules/@img/sharp-win32-x64",
    }).then(() => {
        // 备份原版
        const backup = `${ASAR}.bak`;
        if (!fs.existsSync(backup)) {
            fs.copyFileSync(ASAR, backup);
            console.log(`  ✓ 已备份原版 asar -> ${backup}`);
        }
        fs.copyFileSync(packed, ASAR);
        // unpacked 目录：这些是原生二进制，本次改动不涉及，
        // 只在目标缺失时补齐（应用运行中会锁住 .node 文件）。
        const unpackedSrc = `${packed}.unpacked`;
        const unpackedDst = `${ASAR}.unpacked`;
        if (fs.existsSync(unpackedSrc)) {
            copyDir(unpackedSrc, unpackedDst, true);
            console.log("  ✓ unpacked 目录已就绪");
        }
        console.log("  ✓ asar 已替换");

        const newHash = computeHeaderHash(ASAR);
        patchExeIntegrity(EXE, newHash);

        console.log("== 5/5 补齐语言包 ==");
        run(process.execPath, [path.join(ROOT, "scripts", "patch-lang-packs.cjs"),
            path.join(RESOURCES, "res", "lang")]);

        console.log("\n✅ 适配完成，重新启动 BakaMusic 即可生效");
    }).catch((error) => {
        console.error("打包失败:", error);
        process.exit(1);
    });
}

main();
