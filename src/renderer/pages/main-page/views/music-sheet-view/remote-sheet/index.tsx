import MusicSheet from "@/renderer/core/music-sheet";
import { useLocation, useParams } from "react-router-dom";
import usePluginSheetMusicList from "./hooks/usePluginSheetMusicList";
import MusicSheetlikeView from "@/renderer/components/MusicSheetlikeView";
import MusicSheetFavoriteOption from "@/renderer/components/MusicSheetFavoriteOption";
import { useCustomSheetArtwork } from "@/renderer/utils/use-custom-sheet-artwork";

export default function RemoteSheet() {
    const { platform, id } = useParams() ?? {};
    const location = useLocation();
    const routeState = location.state as {
        sheetItem?: IMusic.IMusicSheetItem;
    } | null;

    const starredSheets = MusicSheet.frontend.useAllStarredSheets();
    const savedSheet = starredSheets.find((item) => item.platform === platform && String(item.id) === id) as IMusic.IMusicSheetItem | undefined;
    const importedSheet = savedSheet?.isImported ? savedSheet : routeState?.sheetItem;

    const [state, sheetItem, musicList, getSheetDetail] = usePluginSheetMusicList(
        platform ?? "",
        id ?? "",
        importedSheet,
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
            options={sheetItem ? (
                <MusicSheetFavoriteOption
                    musicSheet={sheetItem}
                    type="sheet"
                ></MusicSheetFavoriteOption>
            ) : null}
        />
    );
}
