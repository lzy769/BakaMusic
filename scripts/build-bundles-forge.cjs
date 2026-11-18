/**
 * 使用 electron-forge webpack 插件自带的配置生成器，
 * 生成与官方构建完全一致的 .webpack 产物（main + renderer + preload）。
 *
 * 不需要 electron 二进制，也不需要原生模块编译，因此比 `forge package` 轻量得多。
 */
const path = require("node:path");
const webpack = require("webpack");
const webpackConfigModule = require("@electron-forge/plugin-webpack/dist/WebpackConfig");
const WebpackConfigGenerator = webpackConfigModule.default ?? webpackConfigModule;
const forgeConfigModule = require("../forge.config.ts");
const forgeConfig = forgeConfigModule.default ?? forgeConfigModule;

const root = path.resolve(__dirname, "..");
const webpackDir = path.join(root, ".webpack");
const isProd = process.env.NODE_ENV === "production";

function runWebpack(config, label) {
    return new Promise((resolve, reject) => {
        webpack(config).run((err, stats) => {
            if (err) {
                reject(err);
                return;
            }
            if (stats.hasErrors()) {
                const info = stats.toJson({ errors: true });
                reject(new Error(`[${label}] ${info.errors.map((e) => e.message || e).join("\n\n")}`));
                return;
            }
            if (stats.hasWarnings()) {
                const info = stats.toJson({ warnings: true });
                console.warn(`[${label}] ${info.warnings.length} warnings`);
            }
            console.log(`✓ ${label}`);
            resolve();
        });
    });
}

async function main() {
    const plugin = forgeConfig.plugins.find(
        (item) => item.name === "webpack",
    );
    const pluginConfig = plugin.config ?? {};

    const generator = new WebpackConfigGenerator(
        pluginConfig,
        root,
        isProd ? 9000 : 9200,
    );

    // main
    const mainConfig = await generator.getMainConfig();
    await runWebpack(mainConfig, "main");

    // renderers（含 preload）
    const rendererConfigs = await generator.getRendererConfig(pluginConfig.renderer);
    for (const config of rendererConfigs) {
        const label = Object.keys(config.entry ?? {}).join(",") || "renderer";
        await runWebpack(config, `renderer:${label}`);
    }

    console.log(`\n完成，产物目录: ${webpackDir}`);
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});