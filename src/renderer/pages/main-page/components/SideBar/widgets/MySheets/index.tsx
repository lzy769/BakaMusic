import "./index.scss";
import ListItem from "../ListItem";
import { useMatch, useNavigate } from "react-router-dom";
import { Disclosure } from "@headlessui/react";
import MusicSheet, { defaultSheet } from "@/renderer/core/music-sheet";
import SvgAsset from "@/renderer/components/SvgAsset";
import { hideModal, showModal } from "@/renderer/components/Modal";
import { localPluginName } from "@/common/constant";
import { showContextMenu } from "@/renderer/components/ContextMenu";
import { useTranslation } from "react-i18next";
import { useSortedSupportedPlugin } from "@shared/plugin-manager/renderer";
import { dialogUtil, fsUtil } from "@shared/utils/renderer";
import { toast } from "react-toastify";


export default function MySheets() {
    const sheetIdMatch = useMatch(
        `/main/musicsheet/${encodeURIComponent(localPluginName)}/:sheetId`,
    );
    const currentSheetId = sheetIdMatch?.params?.sheetId;
    const musicSheets = MusicSheet.frontend.useAllSheets();
    const navigate = useNavigate();
    const { t } = useTranslation();

    // Follow plugin-manager order (private.pluginMeta.order)
    const importablePlugins = useSortedSupportedPlugin("importMusicSheet");

    return (
        <div className="side-bar-container--my-sheets">
            <Disclosure defaultOpen>
                <Disclosure.Button className="title side-bar-section-title" as="div" role="button">
                    <div className="side-bar-section-title-main">
                        <div className="side-bar-section-chevron">
                            <SvgAsset iconName="chevron-right"></SvgAsset>
                        </div>
                        <div className="side-bar-section-text">{t("side_bar.my_sheets")}</div>
                    </div>
                    <div className="side-bar-section-actions">
                        <div
                            role="button"
                            className="option-btn"
                            title={t("plugin.method_import_music_sheet")}
                            onClick={(e) => {
                                e.stopPropagation();
                                showModal("ImportMusicSheet", {
                                    plugins: importablePlugins,
                                });
                            }}
                        >
                            <SvgAsset iconName="arrow-left-end-on-rectangle"></SvgAsset>
                        </div>
                        <div
                            role="button"
                            className="option-btn"
                            title={t("side_bar.create_local_sheet")}
                            onClick={(e) => {
                                e.stopPropagation();
                                showModal("AddNewSheet");
                            }}
                        >
                            <SvgAsset iconName="plus"></SvgAsset>
                        </div>
                    </div>
                </Disclosure.Button>
                <Disclosure.Panel className="side-bar-sheet-list">
                    {musicSheets.map((item) => (
                        <ListItem
                            key={item.id}
                            iconName={
                                item.id === defaultSheet.id ? "heart-outline" : "musical-note"
                            }
                            onClick={() => {
                                if (currentSheetId !== item.id) {
                                    navigate(`/main/musicsheet/${encodeURIComponent(localPluginName)}/${encodeURIComponent(item.id)}`);
                                }
                            }}
                            onContextMenu={(e) => {
                                if (item.id === defaultSheet.id) {
                                    return;
                                }
                                showContextMenu({
                                    x: e.clientX,
                                    y: e.clientY,
                                    menuItems: [
                                        {
                                            title: t("side_bar.rename_sheet"),
                                            icon: "pencil-square",
                                            show: item.id !== defaultSheet.id,
                                            onClick() {
                                                showModal("SimpleInputWithState", {
                                                    placeholder: t(
                                                        "modal.create_local_sheet_placeholder",
                                                    ),
                                                    maxLength: 30,
                                                    title: t("side_bar.rename_sheet"),
                                                    defaultValue: item.title,
                                                    async onOk(text) {
                                                        await MusicSheet.frontend.updateSheet(item.id, {
                                                            title: text,
                                                        });
                                                        hideModal();
                                                    },
                                                });
                                            },
                                        },
                                        {
                                            title: t("side_bar.change_sheet_cover"),
                                            icon: "picture-in-picture-line",
                                            show: item.id !== defaultSheet.id,
                                            async onClick() {
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
                                                    await MusicSheet.frontend.updateSheet(item.id, {
                                                        artwork: dataUrl,
                                                    });
                                                    toast.success(t("side_bar.change_sheet_cover_success"));
                                                } catch (error) {
                                                    toast.error(error instanceof Error
                                                        ? error.message
                                                        : t("side_bar.change_sheet_cover_failed"));
                                                }
                                            },
                                        },
                                        {
                                            title: t("side_bar.reset_sheet_cover"),
                                            icon: "arrow-path",
                                            show: item.id !== defaultSheet.id && !!item.artwork,
                                            async onClick() {
                                                try {
                                                    await MusicSheet.frontend.updateSheet(item.id, {
                                                        artwork: "",
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
                                            title: t("side_bar.delete_sheet"),
                                            icon: "trash",
                                            show: item.id !== defaultSheet.id,
                                            onClick() {
                                                MusicSheet.frontend.removeSheet(item.id).then(() => {
                                                    if (currentSheetId === item.id) {
                                                        navigate(
                                                            `/main/musicsheet/${encodeURIComponent(localPluginName)}/${defaultSheet.id}`,
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
                            selected={currentSheetId === item.id}
                            title={
                                item.id === defaultSheet.id
                                    ? t("media.default_favorite_sheet_name")
                                    : item.title
                            }
                        ></ListItem>
                    ))}
                </Disclosure.Panel>
            </Disclosure>
        </div>
    );
}
