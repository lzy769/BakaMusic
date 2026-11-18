import { hideModal, showModal } from "@/renderer/components/Modal";
import { dialogUtil, fsUtil } from "@shared/utils/renderer";
import { toast } from "react-toastify";
import { i18n } from "@/shared/i18n/renderer";
import { fetchSheetMusicList } from "@/renderer/utils/fetch-sheet-music-list";

/**
 * 打开「选择歌单封面」弹窗。
 *
 * 弹窗里可以直接从歌单已有歌曲的封面里挑，也可以从本地图片文件里选。
 * @param sheet 目标歌单
 * @param onApply 选中封面后的回调（写入 artwork / customArtwork）
 */
export async function openSheetCoverPicker(
    sheet: IMedia.IMediaBase,
    onApply: (artwork: string) => Promise<void> | void,
) {
    const t = i18n.t.bind(i18n);

    const musicList = await fetchSheetMusicList(sheet);

    showModal("SelectSheetCover", {
        musicList,
        onSelect: async (artwork: string) => {
            try {
                await onApply(artwork);
                toast.success(t("side_bar.change_sheet_cover_success"));
            } catch (error) {
                toast.error(error instanceof Error
                    ? error.message
                    : t("side_bar.change_sheet_cover_failed"));
            }
        },
        onPickLocalFile: async () => {
            hideModal();
            const result = await dialogUtil.showOpenDialog({
                title: t("side_bar.change_sheet_cover"),
                properties: ["openFile"],
                filters: [
                    {
                        name: t("side_bar.sheet_cover_image_filter"),
                        extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"],
                    },
                ],
            });
            const filePath = result.filePaths?.[0];
            if (result.canceled || !filePath) {
                return;
            }
            try {
                const dataUrl = await fsUtil.readFileAsDataUrl(filePath);
                await onApply(dataUrl);
                toast.success(t("side_bar.change_sheet_cover_success"));
            } catch (error) {
                toast.error(error instanceof Error
                    ? error.message
                    : t("side_bar.change_sheet_cover_failed"));
            }
        },
    });
}
