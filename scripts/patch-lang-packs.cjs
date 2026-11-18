/**
 * 把「更换封面」相关文案合并进已安装 BakaMusic 的语言包。
 *
 * 只新增缺失的 key，不动官方已有文案，避免覆盖新版翻译。
 */
const fs = require("node:fs");
const path = require("node:path");

const LANG_DIR = process.argv[2] || "E:/BakaMusic/resources/res/lang";
const SRC_DIR = path.resolve(__dirname, "..", "..", "baka-140", "res", "lang");

// 注意：这些 key 是挂在 side_bar 对象下的，名字里不能再带 "side_bar." 前缀
const ADDITIONS = {
    "change_sheet_cover": {
        "zh-CN": "更换封面",
        "zh-TW": "更換封面",
        "en-US": "Change Cover",
    },
    "sheet_cover_image_filter": {
        "zh-CN": "图片",
        "zh-TW": "圖片",
        "en-US": "Image",
    },
    "change_sheet_cover_success": {
        "zh-CN": "歌单封面已更新",
        "zh-TW": "歌單封面已更新",
        "en-US": "Sheet cover updated",
    },
    "change_sheet_cover_failed": {
        "zh-CN": "更换封面失败",
        "zh-TW": "更換封面失敗",
        "en-US": "Failed to change cover",
    },
    "reset_sheet_cover": {
        "zh-CN": "恢复默认封面",
        "zh-TW": "恢復預設封面",
        "en-US": "Reset Cover",
    },
    "reset_sheet_cover_success": {
        "zh-CN": "已恢复默认封面",
        "zh-TW": "已恢復預設封面",
        "en-US": "Cover reset to default",
    },
    "sheet_cover_pick_local_file": {
        "zh-CN": "从本地图片文件中选择",
        "zh-TW": "從本機圖片檔案中選擇",
        "en-US": "Choose from local image files",
    },
    "sheet_cover_no_song_cover": {
        "zh-CN": "歌单里的歌曲还没有封面",
        "zh-TW": "歌單裡的歌曲還沒有封面",
        "en-US": "Songs in this playlist have no cover yet",
    },
};

for (const locale of ["zh-CN", "zh-TW", "en-US"]) {
    const target = path.join(LANG_DIR, `${locale}.json`);
    const json = JSON.parse(fs.readFileSync(target, "utf8"));
    json.side_bar = json.side_bar ?? {};

    let added = 0;
    for (const [key, texts] of Object.entries(ADDITIONS)) {
        if (!(key in json.side_bar)) {
            json.side_bar[key] = texts[locale];
            added += 1;
        }
    }

    fs.writeFileSync(target, JSON.stringify(json, null, 4), "utf8");
    console.log(`${locale}.json: 新增 ${added} 个 key（共 ${Object.keys(json.side_bar).length} 个 side_bar key）`);
}
