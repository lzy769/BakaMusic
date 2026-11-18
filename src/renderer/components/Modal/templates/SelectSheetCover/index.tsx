import { useEffect, useMemo, useState } from "react";
import Base from "../Base";
import { hideModal } from "../..";
import { useTranslation } from "react-i18next";
import getCompactArtworkSrc from "@/renderer/utils/get-compact-artwork-src";
import Loading from "@/renderer/components/Loading";
import "./index.scss";

interface IProps {
    /** 歌单里的歌曲，用于提供可选封面 */
    musicList: IMusic.IMusicItem[];
    /** 选中封面后回调 */
    onSelect: (artwork: string) => void;
    /** 从本地文件选择 */
    onPickLocalFile?: () => void;
}

export default function SelectSheetCover(props: IProps) {
    const { t } = useTranslation();
    const { musicList = [], onSelect, onPickLocalFile } = props;
    const [loading, setLoading] = useState(true);

    // 收集所有歌曲的封面（去重）
    const covers = useMemo(() => {
        const seen = new Set<string>();
        const result: string[] = [];
        for (const item of musicList) {
            const src = getCompactArtworkSrc(item, 320);
            if (!src || seen.has(src)) {
                continue;
            }
            seen.add(src);
            result.push(src);
        }
        return result;
    }, [musicList]);

    useEffect(() => {
        // 封面来自插件返回的歌曲信息，等首屏渲染完再解除 loading
        const timer = window.setTimeout(() => {
            setLoading(false);
        }, 200);
        return () => {
            window.clearTimeout(timer);
        };
    }, []);

    return (
        <Base>
            <div className="modal--select-sheet-cover-container shadow backdrop-color">
                <Base.Header>
                    <span>{t("side_bar.change_sheet_cover")}</span>
                </Base.Header>
                <div className="select-sheet-cover--body">
                    {onPickLocalFile ? (
                        <div
                            role="button"
                            className="select-sheet-cover--local-file opacity-button"
                            onClick={() => {
                                onPickLocalFile();
                            }}
                        >
                            {t("side_bar.sheet_cover_pick_local_file")}
                        </div>
                    ) : null}
                    {loading ? (
                        <Loading></Loading>
                    ) : covers.length ? (
                        <div className="select-sheet-cover--grid">
                            {covers.map((src) => (
                                <img
                                    key={src}
                                    className="select-sheet-cover--item"
                                    src={src}
                                    alt=""
                                    draggable={false}
                                    role="button"
                                    onClick={() => {
                                        onSelect(src);
                                        hideModal();
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="select-sheet-cover--empty">
                            {t("side_bar.sheet_cover_no_song_cover")}
                        </div>
                    )}
                </div>
            </div>
        </Base>
    );
}
