import SvgAsset, { SvgAssetIconNames } from "@/renderer/components/SvgAsset";
import "./index.scss";

interface IProps {
    selected?: boolean;
    onClick?: () => void;
    onContextMenu?: (...args: any) => void;
    iconName?: SvgAssetIconNames;
    title?: string;
    /** 自定义封面（用户手动设置的歌单封面），有值时优先显示 */
    artwork?: string;
}

export default function ListItem(props: IProps) {
    const { selected, onClick, iconName, title, onContextMenu, artwork } = props ?? {};
    return (
        <div
            onClick={onClick}
            onContextMenu={onContextMenu}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick?.();
                }
            }}
            title={title}
            role="button"
            tabIndex={0}
            aria-current={selected ? "page" : undefined}
            className="side-bar--list-item-container"
            data-selected={selected}
        >
            {artwork ? (
                <img
                    className="side-bar--list-item-cover"
                    src={artwork}
                    alt={title ?? ""}
                    draggable={false}
                />
            ) : null}
            {iconName && !artwork ? <SvgAsset iconName={iconName}></SvgAsset> : null}
            <span>{title ?? ""}</span>
        </div>
    );
}
