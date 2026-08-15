"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { PlayerAvatar, PlayerState } from "../../lib/types";
import { initials } from "./config";
import { avatarOption } from "../../lib/player-identities";

export function PlayerIcon({
  name,
  avatar,
  className = "",
}: {
  name: string;
  avatar?: PlayerAvatar;
  className?: string;
}) {
  const option = avatarOption(avatar);
  return (
    <i
      className={`player-avatar${
        avatar ? ` avatar-${avatar.color}` : ""
      }${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {option ? (
        <img src={option.image} alt="" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </i>
  );
}

export const WAITING_PIXEL_COLORS = [
  "#d82438",
  "#f4b73f",
  "#2b75c9",
  "#4ea96b",
  "#8157b5",
  "#f0eee8",
] as const;

export const WAITING_PIXEL_ROWS = 6;
export const WAITING_PIXEL_GAP = 2;

export function waitingPixelHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function TurnWaitOverlay({
  player,
  animationKey,
}: {
  player: PlayerState;
  animationKey: string;
}) {
  const pixelGridRef = useRef<HTMLDivElement>(null);
  const [pixelGrid, setPixelGrid] = useState({ columns: 24, size: 10 });

  useEffect(() => {
    const grid = pixelGridRef.current;
    if (!grid) return;

    const measureGrid = () => {
      const { width, height } = grid.getBoundingClientRect();
      const size = Math.max(
        5,
        Math.floor(
          (height - WAITING_PIXEL_GAP * (WAITING_PIXEL_ROWS - 1)) /
            WAITING_PIXEL_ROWS,
        ),
      );
      const columns = Math.max(
        1,
        Math.floor((width + WAITING_PIXEL_GAP) / (size + WAITING_PIXEL_GAP)),
      );

      setPixelGrid((current) =>
        current.columns === columns && current.size === size
          ? current
          : { columns, size },
      );
    };

    measureGrid();
    const observer = new ResizeObserver(measureGrid);
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  const pixels = useMemo(() => {
    const { columns } = pixelGrid;
    const seed = waitingPixelHash(animationKey);
    const entries: Array<{
      column: number;
      row: number;
      color: string;
      sort: number;
    }> = [];

    for (let row = 0; row < WAITING_PIXEL_ROWS; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const frameColumn = column % 8;
        const isFrame =
          row === 0 ||
          row === WAITING_PIXEL_ROWS - 1 ||
          frameColumn === 0 ||
          frameColumn === 7;
        const mixed = waitingPixelHash(
          `${seed}:${row}:${column}:${frameColumn}`,
        );
        entries.push({
          column,
          row,
          color: isFrame
            ? "#171717"
            : WAITING_PIXEL_COLORS[mixed % WAITING_PIXEL_COLORS.length],
          sort: mixed,
        });
      }
    }

    const order = [...entries].sort((left, right) => left.sort - right.sort);
    const delayByPosition = new Map(
      order.map((pixel, index) => [`${pixel.row}:${pixel.column}`, index]),
    );

    return entries.map((pixel) => ({
      ...pixel,
      delay: Math.round(
        ((delayByPosition.get(`${pixel.row}:${pixel.column}`) ?? 0) /
          Math.max(1, entries.length - 1)) *
          96,
      ),
    }));
  }, [animationKey, pixelGrid]);

  return (
    <div className="turn-wait-overlay" role="status" aria-live="polite">
      <div
        ref={pixelGridRef}
        className="turn-wait-pixels"
        aria-hidden="true"
        style={
          {
            "--wait-columns": pixelGrid.columns,
            "--wait-pixel-size": `${pixelGrid.size}px`,
          } as CSSProperties
        }
      >
        {pixels.map((pixel) => (
          <i
            key={`${pixel.row}:${pixel.column}`}
            className="turn-wait-pixel"
            style={
              {
                "--wait-column": pixel.column + 1,
                "--wait-row": pixel.row + 1,
                "--wait-color": pixel.color,
                "--wait-delay": pixel.delay,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="turn-wait-message">
        <PlayerIcon
          name={player.displayName}
          avatar={player.avatar}
          className="turn-wait-avatar"
        />
        <span>
          <strong>{player.displayName}</strong>
          <small>is taking their turn</small>
        </span>
      </div>
    </div>
  );
}


