/**
 * 通过 Chrome DevTools Protocol 驱动 BakaMusic 渲染进程。
 *
 * 用法：
 *   node scripts\cdp-eval.cjs "expr"        # 执行 JS 表达式
 *   node scripts\cdp-eval.cjs --click x y    # 在坐标处点击
 *   node scripts\cdp-eval.cjs --right x y    # 在坐标处右键
 *   node scripts\cdp-eval.cjs --shot file    # 截图
 */
const fs = require("node:fs");
const { evaluate, cdpCall } = require("./cdp-helper.cjs");

async function main() {
    const args = process.argv.slice(2);
    if (!args.length) {
        console.error("no args");
        process.exit(1);
    }
    if (args[0] === "--click" || args[0] === "--right") {
        const x = Number(args[1]);
        const y = Number(args[2]);
        const button = args[0] === "--click" ? "left" : "right";
        await cdpCall("Input.dispatchMouseEvent", {
            type: "mousePressed",
            x, y, button,
            buttons: button === "left" ? 1 : 2,
            clickCount: 1,
        });
        await cdpCall("Input.dispatchMouseEvent", {
            type: "mouseReleased",
            x, y, button,
            buttons: 0,
            clickCount: 1,
        });
        console.log(`${button} click at ${x},${y}`);
        return;
    }
    if (args[0] === "--shot") {
        const result = await cdpCall("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(args[1], Buffer.from(result.data, "base64"));
        console.log(`saved ${args[1]}`);
        return;
    }
    const value = await evaluate(args.join(" "));
    console.log(typeof value === "string" ? value : JSON.stringify(value, null, 2));
}

main().catch((error) => {
    console.error("ERR:", error.message);
    process.exit(1);
});
