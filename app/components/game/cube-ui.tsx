"use client";
import { useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type {
  CanvasDefinition,
  CanvasSquare,
  PaintColor,
  PaintCube,
  PlayerAvatar,
  PlayerAvatarColor,
} from "../../lib/types";
import {
  PLAYER_AVATAR_COLORS,
  PLAYER_AVATAR_OPTIONS,
} from "../../lib/player-identities";
import { COLOR_LABELS, CUBE_IMAGES } from "./config";

export function CubeArtwork({
  color,
  className = "",
}: {
  color: PaintColor;
  className?: string;
}) {
  return (
    <img
      className={`cube-artwork${className ? ` ${className}` : ""}`}
      src={CUBE_IMAGES[color]}
      alt=""
      draggable={false}
    />
  );
}

export function CubeRequirementArtwork({ colors }: { colors: PaintColor[] }) {
  return (
    <span className={`cube-requirement-art${colors.length > 1 ? " split" : ""}`}>
      <CubeArtwork color={colors[0]} />
      {colors.length > 1 && (
        <CubeArtwork color={colors[1]} className="cube-artwork-alternate" />
      )}
    </span>
  );
}

export function RandomizedTextField({
  id,
  label,
  value,
  placeholder,
  maxLength,
  onChange,
  onRandomize,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  maxLength: number;
  onChange: (value: string) => void;
  onRandomize: () => void;
}) {
  return (
    <div className="randomized-field">
      <div className="field-label-row">
        <label htmlFor={id}>{label}</label>
        <button
          type="button"
          className="randomize-button"
          onClick={onRandomize}
          aria-label={`Randomize ${label.toLowerCase()}`}
          title={`Randomize ${label.toLowerCase()}`}
        >
          ⚄
        </button>
      </div>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required
      />
    </div>
  );
}

export function AvatarPicker({
  selected,
  usedColors = [],
  onChange,
}: {
  selected: PlayerAvatar;
  usedColors?: PlayerAvatarColor[];
  onChange: (avatar: PlayerAvatar) => void;
}) {
  const used = new Set(usedColors);
  const activeOptions = PLAYER_AVATAR_OPTIONS[selected.color];

  return (
    <fieldset className="avatar-picker">
      <legend>Food icon</legend>
      <div className="avatar-color-rail" aria-label="Icon color">
        {PLAYER_AVATAR_COLORS.map((color) => {
          const unavailable = used.has(color);
          return (
            <button
              type="button"
              className={`avatar-color-button color-${color}${
                selected.color === color ? " selected" : ""
              }`}
              key={color}
              disabled={unavailable}
              aria-label={`${color} icons${
                unavailable ? ", already chosen" : ""
              }`}
              aria-pressed={selected.color === color}
              title={
                unavailable
                  ? `${color} is already used by another player`
                  : `Choose ${color}`
              }
              onClick={() =>
                onChange({
                  color,
                  icon: PLAYER_AVATAR_OPTIONS[color][0].id,
                })
              }
            >
              <i />
              <span>{color}</span>
            </button>
          );
        })}
      </div>
      <div className="avatar-icon-grid" aria-label={`${selected.color} foods`}>
        {activeOptions.map((option) => (
          <button
            type="button"
            className={selected.icon === option.id ? "selected" : ""}
            key={option.id}
            aria-label={option.label}
            aria-pressed={selected.icon === option.id}
            onClick={() =>
              onChange({ color: selected.color, icon: option.id })
            }
          >
            <img src={option.image} alt="" />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Cube({
  cube,
  selected = false,
  disabled = false,
  draggable = false,
  onClick,
  onPointerDrop,
}: {
  cube: PaintCube;
  selected?: boolean;
  disabled?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onPointerDrop?: (
    canvasInstanceId: string,
    squareId: string,
    cubeId: string,
  ) => void;
}) {
  const [dragPoint, setDragPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const dragOverlayRoot =
    typeof document === "undefined" ? null : document.body;
  const touchMoved = useRef(false);

  return (
    <button
      type="button"
      className={`paint-cube cube-${cube.color}${selected ? " selected" : ""}${
        cube.id.startsWith("pending-") ? " pending" : ""
      }`}
      aria-label={`${COLOR_LABELS[cube.color]} paint cube`}
      aria-pressed={selected}
      disabled={disabled}
      draggable={draggable && !disabled}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/paint-cube", cube.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onPointerDown={(event) => {
        if (
          disabled ||
          !draggable ||
          event.pointerType === "mouse" ||
          !onPointerDrop
        ) {
          return;
        }
        event.preventDefault();
        touchMoved.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragPoint({ x: event.clientX, y: event.clientY });
      }}
      onPointerMove={(event) => {
        if (!dragPoint || event.pointerType === "mouse") return;
        event.preventDefault();
        touchMoved.current = true;
        setDragPoint({ x: event.clientX, y: event.clientY });
      }}
      onPointerUp={(event) => {
        if (!dragPoint || event.pointerType === "mouse") return;
        event.preventDefault();
        event.currentTarget.releasePointerCapture(event.pointerId);
        const target = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest<HTMLElement>(
            "[data-paint-canvas][data-paint-square]",
          );
        const canvasInstanceId = target?.dataset.paintCanvas;
        const squareId = target?.dataset.paintSquare;
        if (canvasInstanceId && squareId) {
          onPointerDrop?.(canvasInstanceId, squareId, cube.id);
        }
        setDragPoint(null);
      }}
      onPointerCancel={() => setDragPoint(null)}
      onClick={(event) => {
        if (touchMoved.current) {
          event.preventDefault();
          touchMoved.current = false;
          return;
        }
        onClick?.();
      }}
    >
      <CubeArtwork color={cube.color} />
      {dragPoint &&
        dragOverlayRoot &&
        createPortal(
          <span
            className="cube-drag-ghost"
            style={{ left: dragPoint.x, top: dragPoint.y }}
            aria-hidden="true"
          >
            <CubeArtwork color={cube.color} />
          </span>,
          dragOverlayRoot,
        )}
    </button>
  );
}

export function RequirementMark({
  square,
  cube,
  pendingCube,
  selectedCubeId,
  canvasInstanceId,
  onCanvas = false,
  onDropCube,
}: {
  square: CanvasSquare;
  cube?: PaintCube;
  pendingCube?: PaintCube;
  selectedCubeId: string | null;
  canvasInstanceId: string;
  onCanvas?: boolean;
  onDropCube?: (squareId: string, cubeId: string) => void;
}) {
  const colors = square.allowedColors;
  const label =
    colors.length === 1
      ? COLOR_LABELS[colors[0]]
      : colors.map((color) => COLOR_LABELS[color]).join(" or ");
  const placed = pendingCube ?? cube;
  return (
    <button
      type="button"
      className={`requirement ${square.shape} requirement-${colors[0]}${
        placed ? " filled" : ""
      }${onCanvas ? " canvas-requirement" : ""}`}
      data-paint-canvas={canvasInstanceId}
      data-paint-square={square.id}
      style={
        {
          ...(colors.length > 1
            ? {
                "--requirement-a": `var(--cube-${colors[0]})`,
                "--requirement-b": `var(--cube-${colors[1]})`,
              }
            : {}),
          ...(onCanvas
            ? {
                left: `${square.x * 100}%`,
                top: `${square.y * 100}%`,
              }
            : {}),
        } as CSSProperties
      }
      disabled={!onDropCube || Boolean(cube)}
      aria-label={`${label} paint space${placed ? `, filled with ${COLOR_LABELS[placed.color]}` : ""}`}
      onDragOver={(event) => {
        if (onDropCube && !cube) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const cubeId = event.dataTransfer.getData("text/paint-cube");
        if (cubeId && onDropCube) onDropCube(square.id, cubeId);
      }}
      onClick={() => {
        if (selectedCubeId && onDropCube) onDropCube(square.id, selectedCubeId);
      }}
    >
      {placed ? (
        <span className="mini-cube">
          <CubeArtwork color={placed.color} />
        </span>
      ) : (
        <span>{colors.length > 1 ? "◇" : ""}</span>
      )}
    </button>
  );
}

export function CanvasCard({
  definition,
  cost,
  compact = false,
  selected = false,
  onClick,
}: {
  definition: CanvasDefinition;
  cost?: number;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const orientation =
    definition.aspectRatio > 1.08
      ? "landscape"
      : definition.aspectRatio < 0.92
        ? "portrait"
        : "square";

  return (
    <button
      type="button"
      className={`canvas-card canvas-${orientation}${compact ? " compact" : ""}${
        selected ? " selected" : ""
      }`}
      style={
        {
          "--canvas-ratio": definition.aspectRatio,
          "--canvas-basis": `${Math.round(definition.aspectRatio * 150)}px`,
          "--canvas-mobile-basis": `${Math.round(
            definition.aspectRatio * 172,
          )}px`,
        } as CSSProperties
      }
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="canvas-art">
        <img src={definition.image} alt="" loading="lazy" />
      </span>
      <span className="canvas-card-meta">
        <span>
          <strong>{definition.title}</strong>
          <small>
            {definition.artist}
            {definition.year ? ` · ${definition.year}` : ""}
          </small>
        </span>
        <span className="reward-row" aria-label="Canvas rewards">
          <b title="Fame">★ {definition.starValue}</b>
          <b title="Food">● {definition.foodValue}</b>
          <b title="Paint">▰ {definition.paintValue}</b>
        </span>
      </span>
      {cost !== undefined && (
        <span className="canvas-cost">
          {cost} cube{cost === 1 ? "" : "s"}
        </span>
      )}
    </button>
  );
}

export function CanvasCubeReference({
  definition,
}: {
  definition: CanvasDefinition;
}) {
  const requirements = definition.squares.reduce<
    Array<{ key: string; colors: PaintColor[]; count: number }>
  >((groups, square) => {
    const key = square.allowedColors.join("|");
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.push({ key, colors: square.allowedColors, count: 1 });
    }
    return groups;
  }, []);

  return (
    <>
      <div className="modal-row-heading">
        <strong>Paint reference</strong>
        <span>{definition.squares.length}</span>
      </div>
      <div className="canvas-cube-reference" aria-label="Required paint cubes">
        {requirements.map(({ key, colors, count }) => (
          <span
            className={`cube-reference${colors.length > 1 ? " split" : ""}`}
            key={key}
          >
            <CubeRequirementArtwork colors={colors} />
            <b>×{count}</b>
          </span>
        ))}
      </div>
    </>
  );
}

