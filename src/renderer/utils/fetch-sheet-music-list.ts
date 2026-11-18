import PluginManager from "@shared/plugin-manager/renderer";
import MusicSheet from "@/renderer/core/music-sheet";
import { localPluginName } from "@/common/constant";

/**
 * 取歌单里的歌曲列表，用于挑选歌单封面。
 *
 * - 本地歌单（我的歌单）：直接从本地数据库读取
 * - 插件歌单（我的收藏）：通过插件的 getMusicSheetInfo 获取
 */
export async function fetchSheetMusicList(
    sheet: IMedia.IMediaBase,
    maxCount = 200,
): Promise<IMusic.IMusicItem[]> {
    if (!sheet) {
        return [];
    }

    // 本地歌单
    if (!sheet.platform || sheet.platform === localPluginName) {
        const detail = await MusicSheet.frontend.getSheetItemDetail?.(sheet.id);
        return (detail?.musicList ?? []).slice(0, maxCount);
    }

    // 插件歌单
    try {
        const result = await PluginManager.callPluginDelegateMethod(
            sheet as never,
            "getMusicSheetInfo",
            sheet as never,
            1,
        );
        return (result?.musicList ?? []).slice(0, maxCount);
    } catch {
        return [];
    }
}
