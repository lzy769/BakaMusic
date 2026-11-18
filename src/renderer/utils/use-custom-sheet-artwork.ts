import { useCallback } from "react";
import { isSameMedia } from "@/common/media-util";
import MusicSheet from "@/renderer/core/music-sheet";

/**
 * 读取收藏歌单中用户自定义的封面。
 *
 * 收藏歌单的 artwork 由插件提供，用户手动更换的封面单独存放在 customArtwork，
 * 这里把它取出来用于覆盖展示。
 */
export function useCustomSheetArtwork() {
    const starredSheets = MusicSheet.frontend.useAllStarredSheets();

    return useCallback(
        (sheetItem?: IMedia.IMediaBase | null) => {
            if (!sheetItem) {
                return undefined;
            }
            const matched = starredSheets.find((item) =>
                isSameMedia(item, sheetItem),
            );
            return matched?.customArtwork || undefined;
        },
        [starredSheets],
    );
}
