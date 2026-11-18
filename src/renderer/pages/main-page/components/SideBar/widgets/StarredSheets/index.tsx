import { syncImportedSheetMenu } from "@/renderer/utils/sync-imported-sheet-menu";
import "./index.scss";
import ListItem from "../ListItem";
import CollapsiblePanel from "../CollapsiblePanel";
import { useMatch, useNavigate } from "react-router-dom";
import { Disclosure } from "@headlessui/react";
import MusicSheet, { defaultSheet } from "@/renderer/core/music-sheet";
import { localPluginName } from "@/common/constant";
import { showContextMenu } from "@/renderer/components/ContextMenu";
import { useTranslation } from "react-i18next";
import SvgAsset from "@/renderer/components/SvgAsset";
import { openSheetCoverPicker } from "@/renderer/utils/open-sheet-cover-picker";
import { toast } from "react-toastify";

export default function StarredSheets() {
    const sheetIdMatch = useMatch("/main/musicsheet/:platform/:sheetId");

    const currentPlatform = sheetIdMatch?.params?.platform;
    const currentSheetId = sheetIdMatch?.params?.sheetId;

    const starredSheets = MusicSheet.frontend.useAllStarredSheets();

    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className="side-bar-container--starred-sheets">
            <Disclosure defaultOpen>
                {({ open }) => (
                    <>
                        <Disclosure.Button className="title side-bar-section-title" as="div" role="button">
                            <div className="side-bar-section-title-main">
                                <div className="side-bar-section-chevron">
                                    <SvgAsset iconName="chevron-right"></SvgAsset>
                                </div>
                                <div className="side-bar-section-text">{t("side_bar.starred_sheets")}</div>
                            </div>
                        </Disclosure.Button>
                        <CollapsiblePanel className="side-bar-sheet-list" open={open}>
                            {starredSheets.map((item) => (
                                <ListItem
                                    key={item.id}
                                    iconName={"musical-note"}
                                    artwork={item.customArtwork}
                                    onClick={() => {
                                        if (
                                            !(
                                                currentSheetId === item.id &&
                            currentPlatform === item.platform
                                            )
                                        ) {
                                            const favoriteType = item.$$favoriteType;
                                            if (favoriteType === "album") {
                                                navigate(`/main/album/${item.platform}/${item.id}`, {
                                                    state: {
                                                        albumItem: item,
                                                    },
                                                });
                                            } else if (favoriteType === "toplist") {
                                                navigate(`/main/toplist-detail/${item.platform}`, {
                                                    state: {
                                                        toplist: item,
                                                    },
                                                });
                                            } else {
                                                // 旧收藏项和远程歌单继续走歌单详情。
                                                navigate(`/main/musicsheet/${item.platform}/${item.id}`, {
                                                    state: {
                                                        sheetItem: item,
                                                    },
                                                });
                                            }
                                        }
                                    }}
                                    onContextMenu={(e) => {
                                        showContextMenu({
                                            x: e.clientX,
                                            y: e.clientY,
                                            menuItems: [
                                                syncImportedSheetMenu(item, t, true),
                                                {
                                                    title: t("side_bar.change_sheet_cover"),
                                                    icon: "picture-in-picture-line",
                                                    // 仅歌单支持更换封面（专辑/榜单封面由来源决定）
                                                    show: !item.$$favoriteType
                                                        || item.$$favoriteType === "sheet",
                                                    async onClick() {
                                                        await openSheetCoverPicker(item, async (artwork) => {
                                                            await MusicSheet.frontend.updateStarredSheet(item, {
                                                                customArtwork: artwork,
                                                            });
                                                        });
                                                    },
                                                },
                                                {
                                                    title: t("side_bar.reset_sheet_cover"),
                                                    icon: "arrow-path",
                                                    show: (!!item.customArtwork)
                                                        && (!item.$$favoriteType
                                                            || item.$$favoriteType === "sheet"),
                                                    async onClick() {
                                                        try {
                                                            await MusicSheet.frontend.updateStarredSheet(item, {
                                                                customArtwork: "",
                                                            });
                                                            toast.success(t("side_bar.reset_sheet_cover_success"));
                                                        } catch (error) {
                                                            toast.error(error instanceof Error
                                                                ? error.message
                                                                : t("side_bar.change_sheet_cover_failed"));
                                                        }
                                                    },
                                                },
                                                {
                                                    title: t("side_bar.unstar_sheet"),
                                                    icon: "trash",
                                                    onClick() {
                                                        MusicSheet.frontend.unstarMusicSheet(item).then(() => {
                                                            if (
                                                                currentSheetId === item.id &&
                            currentPlatform === item.platform
                                                            ) {
                                                                navigate(
                                                                    `/main/musicsheet/${localPluginName}/${defaultSheet.id}`,
                                                                    {
                                                                        replace: true,
                                                                    },
                                                                );
                                                            }
                                                        });
                                                    },
                                                },
                                            ],
                                        });
                                    }}
                                    selected={
                                        currentSheetId === item.id && currentPlatform === item.platform
                                    }
                                    title={item.title}
                                ></ListItem>
                            ))}
                        </CollapsiblePanel>
                    </>
                )}
            </Disclosure>
        </div>
    );
}
