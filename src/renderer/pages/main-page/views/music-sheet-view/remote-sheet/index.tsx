import React from "react";
import { useParams } from "react-router-dom";
import usePluginSheetMusicList from "./hooks/usePluginSheetMusicList";
import MusicSheetlikeView from "@/renderer/components/MusicSheetlikeView";
import { isSameMedia } from "@/common/media-util";

import MusicSheet from "@/renderer/core/music-sheet";
import { useTranslation } from "react-i18next";
import SvgAsset from "@/renderer/components/SvgAsset";
import { useCustomSheetArtwork } from "@/renderer/utils/use-custom-sheet-artwork";

export default function RemoteSheet() {
    const { platform, id } = useParams() ?? {};

    const [state, sheetItem, musicList, getSheetDetail] = usePluginSheetMusicList(
        platform ?? "",
        id ?? "",
        history.state?.usr?.sheetItem,
    );

    // 收藏歌单允许用户自定义封面：本地保存的自定义封面优先于插件返回的封面
    const getCustomArtwork = useCustomSheetArtwork();
    const customArtwork = getCustomArtwork({
        id: id ?? "",
        platform: platform ?? "",
    });
    const mergedSheetItem = customArtwork
        ? { ...sheetItem, artwork: customArtwork }
        : sheetItem;

    return (
        <MusicSheetlikeView
            musicSheet={mergedSheetItem}
            musicList={musicList}
            state={state}
            onLoadMore={() => {
                getSheetDetail();
            }}
            options={sheetItem ? <RemoteSheetOptions sheetItem={sheetItem}></RemoteSheetOptions> : null}
        />
    );
}

interface IProps {
    sheetItem: IMusic.IMusicSheetItem;
}
function RemoteSheetOptions(props: IProps) {
    const { sheetItem } = props;
    const starredMusicSheets = MusicSheet.frontend.useAllStarredSheets();
    const { t } = useTranslation();

    const isStarred = starredMusicSheets.find((item) =>
        isSameMedia(sheetItem, item),
    );

    return (
        <>
            <div
                role="button"
                className="option-button"
                data-type="normalButton"
                onClick={() => {
                    if (isStarred) {
                        MusicSheet.frontend.unstarMusicSheet(sheetItem);
                    } else {
                        MusicSheet.frontend.starMusicSheet(sheetItem);
                    }
                }}
            >
                <SvgAsset
                    iconName={isStarred ? "heart" : "heart-outline"}
                    color={isStarred ? "red" : undefined}
                ></SvgAsset>
                <span>{t("music_sheet_like_view.star")}</span>
            </div>
        </>
    );
}
