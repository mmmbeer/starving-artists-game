"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import type {
  CanvasDefinition,
  CanvasSquare,
  GameAction,
  GameEnvelope,
  OwnedCanvas,
  PaintColor,
  PaintCube,
  PlayerAvatar,
  PlayerAvatarColor,
  PlayerCredential,
  PlayerState,
} from "../lib/types";
import {
  avatarOption,
  defaultPlayerAvatar,
  PLAYER_AVATAR_COLORS,
  PLAYER_AVATAR_OPTIONS,
  randomPlayerName,
  randomStudioName,
} from "../lib/player-identities";
import {
  selectTutorialCanvases,
  TUTORIAL_CANVAS_IDS,
} from "../lib/tutorial-canvases";
import { predictGameAction } from "../lib/optimistic-game";

const CREDENTIAL_KEY = "starving-artists-players";
const MAX_STORED_CREDENTIALS = 12;

const COLOR_LABELS: Record<PaintColor, string> = {
  red: "Red",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  black: "Black",
  wild: "Wild",
};

const CUBE_IMAGES: Record<PaintColor, string> = {
  red: "/cubes/red.png",
  orange: "/cubes/orange.png",
  yellow: "/cubes/yellow.png",
  green: "/cubes/green.png",
  blue: "/cubes/blue.png",
  purple: "/cubes/purple.png",
  black: "/cubes/black.png",
  wild: "/cubes/clear.png",
};

const DAY_PHASES = [
  { phase: "MORNING", label: "Morning", detail: "First actions" },
  { phase: "AFTERNOON", label: "Afternoon", detail: "Second actions" },
  { phase: "SELLING", label: "Evening", detail: "Sell actions" },
] as const;

type ActionPanel =
  | "none"
  | "buy"
  | "trade"
  | "paint"
  | "sale"
  | "collect";

type CanvasPreviewAction =
  | { kind: "buy"; slotIndex: number }
  | { kind: "sale"; canvasInstanceId: string };

type PendingPaintPlacement = {
  canvasInstanceId: string;
  squareId: string;
  cubeId: string;
};

type MuseumArtwork = Pick<
  CanvasDefinition,
  "id" | "title" | "artist" | "year" | "image" | "aspectRatio"
>;

type MuseumSlot = {
  artIndex: number;
  phase: "resting" | "departing" | "arriving";
  placement: MuseumPlacement;
};

type MuseumPlacement = {
  x: number;
  y: number;
  artWidth: number;
  artHeight: number;
  placardWidth: number;
  gap: number;
  tilt: number;
  band: number;
  reverse: boolean;
};

type MuseumCrop = {
  aspectRatio: number;
  imageWidth: number;
  imageHeight: number;
  imageLeft: number;
  imageTop: number;
};

type RecentGame = {
  code: string;
  name: string;
  status: "LOBBY" | "ACTIVE";
  day: number;
  updatedAt: string;
  player: PlayerState;
  isHost: boolean;
};

const MUSEUM_FALLBACK_ART: MuseumArtwork[] = [
  {
    id: "vincent-van-gogh-starry-night-1889",
    title: "Starry Night",
    artist: "Vincent van Gogh",
    year: "1889",
    image: "/canvases/vincent-van-gogh-starry-night-1889.webp",
    aspectRatio: 1.53333,
  },
  {
    id: "katsushika-hokusai-the-great-wave-off-kanagawa-c-1830",
    title: "The Great Wave off Kanagawa",
    artist: "Katsushika Hokusai",
    year: "c. 1830",
    image:
      "/canvases/katsushika-hokusai-the-great-wave-off-kanagawa-c-1830.webp",
    aspectRatio: 1.53333,
  },
  {
    id: "vincent-van-gogh-caf-terrace-at-night-1888",
    title: "Café Terrace at Night",
    artist: "Vincent van Gogh",
    year: "1888",
    image: "/canvases/vincent-van-gogh-caf-terrace-at-night-1888.webp",
    aspectRatio: 0.65217,
  },
];

const TUTORIAL_CANVASES_FALLBACK: CanvasDefinition[] = [
  {
    id: "katsushika-hokusai-the-great-wave-off-kanagawa-c-1830",
    title: "The Great Wave off Kanagawa",
    artist: "Katsushika Hokusai",
    year: "c. 1830",
    image:
      "/canvases/katsushika-hokusai-the-great-wave-off-kanagawa-c-1830.webp",
    aspectRatio: 1.53333,
    starValue: 1,
    foodValue: 2,
    paintValue: 9,
    squares: [
      { id: "wave-1", x: 0.2, y: 0.33333, allowedColors: ["orange"], shape: "square" },
      { id: "wave-2", x: 0.4, y: 0.33333, allowedColors: ["orange"], shape: "square" },
      { id: "wave-3", x: 0.6, y: 0.33333, allowedColors: ["blue"], shape: "square" },
      { id: "wave-4", x: 0.8, y: 0.33333, allowedColors: ["blue"], shape: "square" },
      { id: "wave-5", x: 0.2, y: 0.66667, allowedColors: ["blue"], shape: "square" },
    ],
  },
  {
    id: "vincent-van-gogh-caf-terrace-at-night-1888",
    title: "Café Terrace at Night",
    artist: "Vincent van Gogh",
    year: "1888",
    image: "/canvases/vincent-van-gogh-caf-terrace-at-night-1888.webp",
    aspectRatio: 0.65217,
    starValue: 3,
    foodValue: 2,
    paintValue: 6,
    squares: [
      { id: "cafe-1", x: 0.2, y: 0.5, allowedColors: ["orange"], shape: "square" },
      { id: "cafe-2", x: 0.4, y: 0.5, allowedColors: ["green"], shape: "square" },
      { id: "cafe-3", x: 0.6, y: 0.5, allowedColors: ["blue"], shape: "square" },
      { id: "cafe-4", x: 0.8, y: 0.5, allowedColors: ["black"], shape: "square" },
    ],
  },
  {
    id: "vincent-van-gogh-starry-night-1889",
    title: "Starry Night",
    artist: "Vincent van Gogh",
    year: "1889",
    image: "/canvases/vincent-van-gogh-starry-night-1889.webp",
    aspectRatio: 1.53333,
    starValue: 4,
    foodValue: 3,
    paintValue: 15,
    squares: [
      { id: "star-1", x: 0.16667, y: 0.25, allowedColors: ["orange"], shape: "square" },
      { id: "star-2", x: 0.33333, y: 0.25, allowedColors: ["yellow"], shape: "square" },
      { id: "star-3", x: 0.5, y: 0.25, allowedColors: ["yellow"], shape: "square" },
      { id: "star-4", x: 0.66667, y: 0.25, allowedColors: ["blue"], shape: "square" },
      { id: "star-5", x: 0.83333, y: 0.25, allowedColors: ["blue"], shape: "square" },
      { id: "star-6", x: 0.16667, y: 0.5, allowedColors: ["blue"], shape: "square" },
      { id: "star-7", x: 0.33333, y: 0.5, allowedColors: ["blue"], shape: "square" },
      { id: "star-8", x: 0.5, y: 0.5, allowedColors: ["black"], shape: "square" },
      { id: "star-9", x: 0.66667, y: 0.5, allowedColors: ["black"], shape: "square" },
      { id: "star-10", x: 0.83333, y: 0.5, allowedColors: ["yellow", "blue"], shape: "diamond" },
      { id: "star-11", x: 0.16667, y: 0.75, allowedColors: ["yellow", "blue"], shape: "diamond" },
    ],
  },
];

function resolveTutorialCanvases(
  canvases: CanvasDefinition[],
): CanvasDefinition[] {
  const selected = new Map(
    selectTutorialCanvases(canvases).map((canvas) => [canvas.id, canvas]),
  );
  return TUTORIAL_CANVAS_IDS.map(
    (id, index) => selected.get(id) ?? TUTORIAL_CANVASES_FALLBACK[index],
  );
}

const TUTORIAL_PAGES = [
  {
    eyebrow: "The goal",
    title: "Paint. Sell. Survive.",
    summary:
      "Complete famous canvases, sell them for fame and food, and keep your artist fed long enough to build the best gallery.",
    bullets: [
      "Your studio starts with six paint cubes and five nutrition.",
      "The shared Canvas Market holds three real works of art.",
      "Fame wins the game. Food keeps you alive. Paint value controls your evening reward.",
    ],
  },
  {
    eyebrow: "Start of the day",
    title: "The market grows. Hunger follows.",
    summary:
      "At the beginning of each new day, four paint cubes are added to the shared market and every artist loses one nutrition.",
    bullets: [
      "The first-player marker moves to the next surviving artist.",
      "An artist who reaches zero nutrition starves and stops taking turns.",
      "The day then begins with the Morning action phase.",
    ],
  },
  {
    eyebrow: "Morning + afternoon",
    title: "Take two actions each day.",
    summary:
      "Starting with the first player, everyone takes one Morning action. Then everyone takes one Afternoon action in the same order.",
    bullets: [
      "Work: draw three random paint cubes.",
      "Buy a canvas, paint, trade with the market, or pass.",
      "One action finishes your turn. You may inspect markets and studios at any time.",
    ],
  },
  {
    eyebrow: "Buy a canvas",
    title: "Position sets the price.",
    summary:
      "Choose one of the three canvases in the market. The left canvas costs one cube, the middle costs two, and the right costs three.",
    bullets: [
      "Pay with any cubes from your studio.",
      "Paid cubes go into the Paint Market for everyone to trade or collect later.",
      "The empty Canvas Market slot is refilled immediately.",
    ],
  },
  {
    eyebrow: "Paint",
    title: "Place up to four cubes.",
    summary:
      "A Paint action lets you place one to four cubes from your studio onto open paint spaces across one or more of your canvases.",
    bullets: [
      "A square accepts its shown color. A split diamond accepts either color.",
      "A clear wild cube can fill any space, but each canvas may use only one.",
      "A canvas is complete when every paint space is filled.",
    ],
  },
  {
    eyebrow: "Trade",
    title: "Exchange quantity for precision.",
    summary:
      "Give cubes from your studio to the shared Paint Market and take the exact colors you need.",
    bullets: [
      "Give 2 cubes to take 1.",
      "Give 5 cubes to take 2.",
      "Give 9 cubes to take 3.",
    ],
  },
  {
    eyebrow: "Evening",
    title: "Sell completed canvases.",
    summary:
      "After both action phases, each artist chooses which completed canvases to sell. The rewards printed on every sold card resolve together.",
    bullets: [
      "Stars add fame. Food restores nutrition up to five.",
      "Food above five becomes random paint cubes from the bag.",
      "Paint value gives you a claim on cubes in the Paint Market.",
    ],
  },
  {
    eyebrow: "End of the day",
    title: "Collect paint, then check the exhibition.",
    summary:
      "Artists collect from the Paint Market in order of total paint value sold, then the game checks whether the exhibition is over.",
    bullets: [
      "The highest seller takes up to four cubes per pick, second takes two, and everyone else takes one.",
      "The game ends after a target is reached or after the final starvation day.",
      "Highest fame wins. Completed sales, nutrition, and cubes break ties.",
    ],
  },
] as const;

const MUSEUM_DEFAULT_PLACEMENTS: MuseumPlacement[] = [
  {
    x: 24,
    y: 30,
    artWidth: 218,
    artHeight: 142,
    placardWidth: 132,
    gap: 18,
    tilt: -0.4,
    band: 0,
    reverse: false,
  },
  {
    x: 54,
    y: 230,
    artWidth: 218,
    artHeight: 142,
    placardWidth: 132,
    gap: 18,
    tilt: 0.55,
    band: 1,
    reverse: true,
  },
  {
    x: 16,
    y: 430,
    artWidth: 93,
    artHeight: 142,
    placardWidth: 132,
    gap: 18,
    tilt: -0.25,
    band: 2,
    reverse: false,
  },
];

function credentials(): Record<string, PlayerCredential> {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(CREDENTIAL_KEY) ?? "{}",
    ) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, PlayerCredential] => {
          const [key, value] = entry;
          const candidate = value as Partial<PlayerCredential> | null;
          return (
            /^[A-HJ-NP-Z2-9]{6,12}$/.test(key) &&
            Boolean(candidate) &&
            candidate?.gameCode === key &&
            typeof candidate.playerId === "string" &&
            candidate.playerId.length <= 80 &&
            typeof candidate.token === "string" &&
            /^[a-f0-9]{48}$/i.test(candidate.token)
          );
        })
        .slice(-MAX_STORED_CREDENTIALS),
    );
  } catch {
    return {};
  }
}

function saveCredential(credential: PlayerCredential) {
  const stored = credentials();
  stored[credential.gameCode] = credential;
  const bounded = Object.fromEntries(
    Object.entries(stored).slice(-MAX_STORED_CREDENTIALS),
  );
  localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(bounded));
}

function removeCredential(gameCode: string) {
  const stored = credentials();
  delete stored[gameCode.toUpperCase()];
  localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(stored));
}

function randomId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const values = new Uint32Array(4);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    values.forEach((_, index) => {
      values[index] = Math.floor(Math.random() * 0xffffffff);
    });
  }
  return `${Date.now().toString(36)}-${[...values]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("")}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function PlayerIcon({
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

const WAITING_PIXEL_COLORS = [
  "#d82438",
  "#f4b73f",
  "#2b75c9",
  "#4ea96b",
  "#8157b5",
  "#f0eee8",
] as const;

const WAITING_PIXEL_ROWS = 6;
const WAITING_PIXEL_GAP = 2;

function waitingPixelHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function TurnWaitOverlay({
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

function CubeArtwork({
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

function CubeRequirementArtwork({ colors }: { colors: PaintColor[] }) {
  return (
    <span className={`cube-requirement-art${colors.length > 1 ? " split" : ""}`}>
      <CubeArtwork color={colors[0]} />
      {colors.length > 1 && (
        <CubeArtwork color={colors[1]} className="cube-artwork-alternate" />
      )}
    </span>
  );
}

function RandomizedTextField({
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

function AvatarPicker({
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

function Cube({
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

function RequirementMark({
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
        } as React.CSSProperties
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

function CanvasCard({
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
        } as React.CSSProperties
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

function CanvasCubeReference({
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

function FeatureModal({
  title,
  onClose,
  children,
  footer,
  footerRail,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  footerRail?: React.ReactNode;
  className?: string;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      const openModals = document.querySelectorAll(".modal-backdrop");
      const topModal = openModals.item(openModals.length - 1);
      if (event.key === "Escape" && topModal === backdropRef.current) {
        onClose();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`feature-modal${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="feature-modal-body">{children}</div>
        <footer className="feature-modal-footer">
          {footerRail && (
            <div className="modal-footer-rail">{footerRail}</div>
          )}
          <div className="modal-actions">{footer}</div>
        </footer>
      </section>
    </div>
  );
}

function TutorialCube({
  color,
  className = "",
}: {
  color: PaintColor;
  className?: string;
}) {
  return (
    <span
      className={`tutorial-cube cube-${color}${className ? ` ${className}` : ""}`}
      aria-label={`${COLOR_LABELS[color]} paint cube`}
    >
      <CubeArtwork color={color} />
    </span>
  );
}

function TutorialCanvas({
  definition,
  painted = 0,
  cost,
  className = "",
}: {
  definition: CanvasDefinition;
  painted?: number;
  cost?: number;
  className?: string;
}) {
  return (
    <article
      className={`tutorial-canvas${className ? ` ${className}` : ""}`}
      style={
        {
          "--tutorial-canvas-ratio": definition.aspectRatio,
        } as CSSProperties
      }
    >
      <div className="tutorial-canvas-art">
        <img
          src={definition.image}
          alt={`${definition.title} by ${definition.artist}`}
        />
        {definition.squares.map((square, index) => {
          const cubeColor =
            index < painted ? square.allowedColors[0] ?? null : null;
          return (
            <span
              className={`tutorial-requirement ${square.shape}${
                square.allowedColors.length > 1 ? " split" : ""
              }${cubeColor ? " painted" : ""}`}
              key={square.id}
              style={
                {
                  left: `${square.x * 100}%`,
                  top: `${square.y * 100}%`,
                  "--tutorial-requirement-a": `var(--cube-${square.allowedColors[0]})`,
                  "--tutorial-requirement-b": `var(--cube-${
                    square.allowedColors[1] ?? square.allowedColors[0]
                  })`,
                  "--tutorial-cube-delay": `${index * 180}ms`,
                } as CSSProperties
              }
            >
              {cubeColor && <TutorialCube color={cubeColor} />}
            </span>
          );
        })}
        {cost !== undefined && (
          <span className="tutorial-canvas-cost">
            {cost} cube{cost === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="tutorial-canvas-meta">
        <span>
          <strong>{definition.title}</strong>
          <small>
            {definition.artist} · {definition.year}
          </small>
        </span>
        <b>
          ★ {definition.starValue} · ● {definition.foodValue} · ▰{" "}
          {definition.paintValue}
        </b>
      </div>
    </article>
  );
}

function TutorialScene({
  page,
  canvases,
}: {
  page: number;
  canvases: CanvasDefinition[];
}) {
  const starryNight = canvases[2];

  if (page === 0) {
    return (
      <div className="tutorial-scene tutorial-goal-scene">
        <TutorialCanvas
          definition={starryNight}
          painted={4}
          className="hero-tutorial-canvas"
        />
        <div className="tutorial-goal-score">
          <span>★</span>
          <strong>{starryNight.starValue} fame</strong>
          <small>Build the best exhibition</small>
        </div>
      </div>
    );
  }

  if (page === 1) {
    return (
      <div className="tutorial-scene tutorial-morning-scene">
        <div className="tutorial-market-arrival">
          <span>Paint Market</span>
          <div>
            {(["red", "yellow", "blue", "purple"] as PaintColor[]).map(
              (color, index) => (
                <TutorialCube
                  color={color}
                  className={`arrival-cube arrival-${index + 1}`}
                  key={color}
                />
              ),
            )}
          </div>
        </div>
        <div className="tutorial-nutrition-drop">
          <strong>Nutrition</strong>
          <div>
            {[0, 1, 2, 3, 4].map((index) => (
              <span className={index === 4 ? "fading" : ""} key={index}>
                ●
              </span>
            ))}
          </div>
          <small>5 → 4</small>
        </div>
        <div className="tutorial-first-player">
          <i>1st</i>
          <span>Marker passes clockwise</span>
        </div>
      </div>
    );
  }

  if (page === 2) {
    return (
      <div className="tutorial-scene tutorial-turn-scene">
        <div className="tutorial-phase-line">
          <span className="active">1 Morning</span>
          <i />
          <span>2 Afternoon</span>
          <i />
          <span>3 Evening</span>
        </div>
        <div className="tutorial-player-turns">
          {["Georgia", "Vincent", "Frida"].map((name, index) => (
            <span className={index === 0 ? "acting" : ""} key={name}>
              <i>{initials(name)}</i>
              <b>{name}</b>
              {index === 0 && <small>Choose 1 action</small>}
            </span>
          ))}
        </div>
        <div className="tutorial-action-strip">
          {["Work +3", "Buy", "Paint 1–4", "Trade"].map((action) => (
            <b key={action}>{action}</b>
          ))}
        </div>
      </div>
    );
  }

  if (page === 3) {
    return (
      <div className="tutorial-scene tutorial-buy-scene">
        <div className="tutorial-market-canvases">
          {canvases.map((canvas, index) => (
            <TutorialCanvas
              definition={canvas}
              cost={index + 1}
              className={index === 1 ? "chosen" : ""}
              key={canvas.id}
            />
          ))}
        </div>
        <div className="tutorial-payment">
          <span>Your studio</span>
          <div>
            <TutorialCube color="green" className="pay-one" />
            <TutorialCube color="purple" className="pay-two" />
          </div>
          <b>Pay 2 →</b>
          <span>Paint Market</span>
        </div>
      </div>
    );
  }

  if (page === 4) {
    return (
      <div className="tutorial-scene tutorial-paint-scene">
        <div className="tutorial-paint-rack">
          {(["orange", "yellow", "blue", "wild"] as PaintColor[]).map(
            (color, index) => (
              <TutorialCube
                color={color}
                className={`paint-flight paint-flight-${index + 1}`}
                key={color}
              />
            ),
          )}
        </div>
        <TutorialCanvas
          definition={starryNight}
          painted={4}
          className="painting-demo"
        />
        <span className="tutorial-wild-note">
          <TutorialCube color="wild" /> Wild: one per canvas
        </span>
      </div>
    );
  }

  if (page === 5) {
    return (
      <div className="tutorial-scene tutorial-trade-scene">
        <div className="tutorial-trade-side">
          <span>Give</span>
          <div>
            <TutorialCube color="red" />
            <TutorialCube color="black" />
          </div>
        </div>
        <div className="tutorial-trade-arrow">
          <strong>2 : 1</strong>
          <span>→</span>
        </div>
        <div className="tutorial-trade-side take">
          <span>Take</span>
          <div>
            <TutorialCube color="blue" />
          </div>
        </div>
        <div className="tutorial-trade-rates">
          <b>2 → 1</b>
          <b>5 → 2</b>
          <b>9 → 3</b>
        </div>
      </div>
    );
  }

  if (page === 6) {
    return (
      <div className="tutorial-scene tutorial-sale-scene">
        <TutorialCanvas
          definition={starryNight}
          painted={4}
          className="sale-canvas"
        />
        <div className="tutorial-sale-rewards">
          <span>
            <i>★</i>
            <strong>+{starryNight.starValue} fame</strong>
          </span>
          <span>
            <i>●</i>
            <strong>+{starryNight.foodValue} food</strong>
          </span>
          <span>
            <i>▰</i>
            <strong>{starryNight.paintValue} paint claim</strong>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="tutorial-scene tutorial-end-scene">
      <div className="tutorial-collection-order">
        <span className="first">
          <b>1st seller</b>
          <strong>Pick up to 4</strong>
        </span>
        <span className="second">
          <b>2nd seller</b>
          <strong>Pick up to 2</strong>
        </span>
        <span>
          <b>Others</b>
          <strong>Pick 1</strong>
        </span>
      </div>
      <div className="tutorial-finish-line">
        <span>2 players</span>
        <b>16 fame or 7 sold</b>
        <span>3 players</span>
        <b>14 fame or 6 sold</b>
        <span>4 players</span>
        <b>12 fame or 5 sold</b>
      </div>
    </div>
  );
}

function TutorialModal({
  onClose,
  onOpenRules,
  canvases,
}: {
  onClose: () => void;
  onOpenRules: () => void;
  canvases: CanvasDefinition[];
}) {
  const [page, setPage] = useState(0);
  const content = TUTORIAL_PAGES[page];

  useEffect(() => {
    const changePage = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        setPage((current) =>
          Math.min(TUTORIAL_PAGES.length - 1, current + 1),
        );
      }
      if (event.key === "ArrowLeft") {
        setPage((current) => Math.max(0, current - 1));
      }
    };
    window.addEventListener("keydown", changePage);
    return () => window.removeEventListener("keydown", changePage);
  }, []);

  return (
    <FeatureModal
      title="How to Play"
      className="tutorial-modal"
      onClose={onClose}
      footerRail={
        <div className="tutorial-progress" aria-label="Tutorial progress">
          {TUTORIAL_PAGES.map((item, index) => (
            <button
              type="button"
              className={index === page ? "current" : ""}
              aria-label={`Go to ${item.title}`}
              aria-current={index === page ? "step" : undefined}
              onClick={() => setPage(index)}
              key={item.title}
            />
          ))}
        </div>
      }
      footer={
        <>
          <button
            type="button"
            className="rules-text-button"
            onClick={onOpenRules}
          >
            Read full rules
          </button>
          {page > 0 && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => setPage((current) => current - 1)}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              if (page === TUTORIAL_PAGES.length - 1) onClose();
              else setPage((current) => current + 1);
            }}
          >
            {page === TUTORIAL_PAGES.length - 1 ? "Done" : "Next"}
          </button>
        </>
      }
    >
      <div className="tutorial-page" key={page}>
        <div className="tutorial-copy">
          <span>{content.eyebrow}</span>
          <h3>{content.title}</h3>
          <p>{content.summary}</p>
          <ul>
            {content.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
        <TutorialScene page={page} canvases={canvases} />
      </div>
    </FeatureModal>
  );
}

function RulesCanvasExample({
  canvases,
}: {
  canvases: CanvasDefinition[];
}) {
  const starryNight = canvases[2];

  return (
    <div className="rules-canvas-example">
      <TutorialCanvas definition={starryNight} painted={4} />
      <dl>
        <div>
          <dt>★ Fame</dt>
          <dd>{starryNight.starValue} points when sold</dd>
        </div>
        <div>
          <dt>● Food</dt>
          <dd>Restore {starryNight.foodValue} nutrition</dd>
        </div>
        <div>
          <dt>▰ Paint</dt>
          <dd>Claim up to {starryNight.paintValue} market cubes</dd>
        </div>
      </dl>
    </div>
  );
}

function WrittenRulesModal({
  onClose,
  onOpenTutorial,
  canvases,
}: {
  onClose: () => void;
  onOpenTutorial: () => void;
  canvases: CanvasDefinition[];
}) {
  return (
    <FeatureModal
      title="Complete Rules"
      className="rules-modal"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="secondary-button"
            onClick={onOpenTutorial}
          >
            View tutorial
          </button>
          <button type="button" className="primary-button" onClick={onClose}>
            Close rules
          </button>
        </>
      }
    >
      <div className="rules-layout">
        <nav className="rules-contents" aria-label="Rules contents">
          {[
            ["rules-goal", "Goal"],
            ["rules-setup", "Setup"],
            ["rules-day", "The day"],
            ["rules-actions", "Actions"],
            ["rules-paint", "Painting"],
            ["rules-evening", "Evening"],
            ["rules-end", "End game"],
          ].map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
        </nav>
        <article className="rules-document">
          <section id="rules-goal">
            <span className="rules-section-number">01</span>
            <h3>Goal of the game</h3>
            <p>
              You are an artist trying to complete and sell the strongest
              exhibition before hunger ends your career. Paint canvases, sell
              them for fame, and use their food rewards to maintain your
              nutrition.
            </p>
            <p>
              The player with the most fame at the end wins. Starving Artists
              supports one to four players.
            </p>
          </section>

          <section id="rules-setup">
            <span className="rules-section-number">02</span>
            <h3>Setup</h3>
            <ol>
              <li>Every artist begins with six random paint cubes.</li>
              <li>Every artist begins at five nutrition and zero fame.</li>
              <li>Three canvases are revealed in the Canvas Market.</li>
              <li>Four cubes are placed in the Paint Market.</li>
              <li>A random artist receives the first-player marker.</li>
            </ol>
            <div className="rules-cube-key">
              {(
                [
                  "red",
                  "orange",
                  "yellow",
                  "green",
                  "blue",
                  "purple",
                  "black",
                  "wild",
                ] as PaintColor[]
              ).map((color) => (
                <span key={color}>
                  <TutorialCube color={color} />
                  {COLOR_LABELS[color]}
                </span>
              ))}
            </div>
          </section>

          <section id="rules-day">
            <span className="rules-section-number">03</span>
            <h3>How a day works</h3>
            <div className="rules-phase-table">
              <div>
                <b>Morning</b>
                <span>Each artist takes one action in turn order.</span>
              </div>
              <div>
                <b>Afternoon</b>
                <span>Each artist takes a second action in the same order.</span>
              </div>
              <div>
                <b>Evening</b>
                <span>Complete canvases may be sold and paint is collected.</span>
              </div>
            </div>
            <h4>Starting a new day</h4>
            <p>
              Add four cubes from the bag to the Paint Market. Reduce every
              artist&apos;s nutrition by one. Pass the first-player marker to
              the next surviving artist, then begin Morning.
            </p>
          </section>

          <section id="rules-actions">
            <span className="rules-section-number">04</span>
            <h3>Actions</h3>
            <p>
              On your Morning and Afternoon turns, choose exactly one action.
              After it resolves, play passes to the next artist.
            </p>
            <div className="rules-action-list">
              <div>
                <b>Work</b>
                <p>Draw three random paint cubes from the bag.</p>
              </div>
              <div>
                <b>Buy a canvas</b>
                <p>
                  Buy the left, middle, or right Canvas Market card for one,
                  two, or three cubes respectively. Payment cubes move to the
                  Paint Market and the empty card slot is refilled.
                </p>
              </div>
              <div>
                <b>Paint</b>
                <p>
                  Place one to four cubes on open spaces across any number of
                  canvases in your studio.
                </p>
              </div>
              <div>
                <b>Trade</b>
                <p>
                  Give studio cubes to the Paint Market and take market cubes
                  at one of three exact rates: 2→1, 5→2, or 9→3.
                </p>
              </div>
              <div>
                <b>Pass</b>
                <p>Take no action and end your turn.</p>
              </div>
            </div>
            <div className="rules-market-example">
              {canvases.map((canvas, index) => (
                <TutorialCanvas
                  definition={canvas}
                  cost={index + 1}
                  key={canvas.id}
                />
              ))}
            </div>
          </section>

          <section id="rules-paint">
            <span className="rules-section-number">05</span>
            <h3>Reading and painting a canvas</h3>
            <p>
              Each paint space shows the cube it accepts. A solid square accepts
              one color. A split diamond accepts either of its two colors. A
              wild cube may fill any open space, but no canvas may contain more
              than one wild cube.
            </p>
            <p>
              Cubes stay on a canvas until it is sold. A canvas is complete only
              when every space is filled.
            </p>
            <RulesCanvasExample canvases={canvases} />
          </section>

          <section id="rules-evening">
            <span className="rules-section-number">06</span>
            <h3>Evening sales</h3>
            <p>
              In turn order, each artist declares any number of completed
              canvases for sale or declines to sell. After all declarations,
              every declared sale resolves.
            </p>
            <ul>
              <li>
                <strong>Fame:</strong> Add the card&apos;s star value to your
                score.
              </li>
              <li>
                <strong>Food:</strong> Restore nutrition up to the maximum of
                five. Each excess food draws one random cube from the bag.
              </li>
              <li>
                <strong>Paint:</strong> The card&apos;s paint value becomes
                your collection quota for the Paint Market.
              </li>
            </ul>
            <p>
              Cubes used on sold canvases return to the paint bag. Artists with
              a paint quota collect in descending order of total paint value
              sold that evening. The top seller may take up to four cubes per
              pick, the second seller up to two, and every other seller one.
              Collection continues until quotas are spent or the Paint Market
              is empty.
            </p>
          </section>

          <section id="rules-end">
            <span className="rules-section-number">07</span>
            <h3>Starvation and the end game</h3>
            <p>
              When an artist reaches zero nutrition at the start of a day, that
              artist starves and takes no more turns. That day becomes the final
              day for all remaining artists. If everyone starves, the game ends
              immediately.
            </p>
            <div className="rules-thresholds">
              <span>
                <b>2 players</b>
                <strong>16 fame or 7 canvases</strong>
              </span>
              <span>
                <b>3 players</b>
                <strong>14 fame or 6 canvases</strong>
              </span>
              <span>
                <b>4 players</b>
                <strong>12 fame or 5 canvases</strong>
              </span>
            </div>
            <p>
              In a multiplayer game, the exhibition ends after the evening in
              which any artist reaches either target. In a solo game, play
              continues until the 35-card canvas deck is exhausted or starvation
              ends the game.
            </p>
            <h4>Winner and ties</h4>
            <p>
              Highest fame wins. Ties are broken by most canvases sold, then
              nutrition, then paint cubes remaining in the studio. If all four
              values are equal, the players share the win.
            </p>
          </section>
        </article>
      </div>
    </FeatureModal>
  );
}

function GameHelpControls({
  compact = false,
  emphasizeTutorial = false,
  canvases,
}: {
  compact?: boolean;
  emphasizeTutorial?: boolean;
  canvases: CanvasDefinition[];
}) {
  const [openHelp, setOpenHelp] = useState<"tutorial" | "rules" | null>(null);

  return (
    <>
      <div className={`game-help-controls${compact ? " compact" : ""}`}>
        <button
          type="button"
          className={emphasizeTutorial ? "tutorial-header-button emphasized" : "tutorial-header-button"}
          onClick={() => setOpenHelp("tutorial")}
        >
          Tutorial
        </button>
        <button
          type="button"
          className="rules-header-button"
          onClick={() => setOpenHelp("rules")}
        >
          Rules
        </button>
        <button
          type="button"
          className="help-icon-button"
          onClick={() => setOpenHelp("rules")}
          aria-label="Open game rules"
          title="Game rules"
        >
          ?
        </button>
      </div>
      {openHelp === "tutorial" && (
        <TutorialModal
          onClose={() => setOpenHelp(null)}
          onOpenRules={() => setOpenHelp("rules")}
          canvases={canvases}
        />
      )}
      {openHelp === "rules" && (
        <WrittenRulesModal
          onClose={() => setOpenHelp(null)}
          onOpenTutorial={() => setOpenHelp("tutorial")}
          canvases={canvases}
        />
      )}
    </>
  );
}

function AbandonGameControl({
  gameName,
  busy,
  onConfirm,
}: {
  gameName: string;
  busy: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        type="button"
        className="abandon-game-button"
        onClick={() => setConfirming(true)}
      >
        Abandon game
      </button>
      {confirming && (
        <FeatureModal
          title="Abandon Game?"
          onClose={() => setConfirming(false)}
          footer={
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setConfirming(false)}
              >
                Keep game
              </button>
              <button
                type="button"
                className="danger-button"
                disabled={busy}
                onClick={onConfirm}
              >
                {busy ? "Abandoning…" : "Abandon game"}
              </button>
            </>
          }
        >
          <div className="abandon-game-warning">
            <strong>{gameName}</strong>
            <span>
              This closes the game for every player. It cannot be resumed.
            </span>
          </div>
        </FeatureModal>
      )}
    </>
  );
}

function KickPlayerControl({
  player,
  inLobby,
  busy,
  onConfirm,
}: {
  player: PlayerState;
  inLobby: boolean;
  busy: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        type="button"
        className="kick-player-button"
        disabled={busy}
        onClick={() => setConfirming(true)}
        aria-label={`Kick ${player.displayName}`}
        title={`Kick ${player.displayName}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 19c0-2.2-2-4-4.5-4S6 16.8 6 19" />
          <circle cx="10.5" cy="8.5" r="3.2" />
          <path d="m16.5 8 5 5m0-5-5 5" />
        </svg>
      </button>
      {confirming && (
        <FeatureModal
          title={`Kick ${player.displayName}?`}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setConfirming(false)}
              >
                Keep player
              </button>
              <button
                type="button"
                className="danger-button"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                  onConfirm();
                }}
              >
                {busy ? "Removing…" : "Kick player"}
              </button>
            </>
          }
        >
          <div className="kick-player-warning">
            <PlayerIcon
              name={player.displayName}
              avatar={player.avatar}
              className="kick-player-avatar"
            />
            <div>
              <strong>Remove {player.displayName} from this game?</strong>
              <span>
                {inLobby
                  ? "Their seat will open immediately. They can only return by joining again."
                  : "Their studio and turn will be removed. If they are taking their turn, play advances immediately."}
              </span>
            </div>
          </div>
        </FeatureModal>
      )}
    </>
  );
}

function StudioCanvas({
  owned,
  definition,
  active,
  pending,
  selectedCubeId,
  cubes,
  onSelect,
  onPreview,
  onPlace,
  onClear,
}: {
  owned: OwnedCanvas;
  definition: CanvasDefinition;
  active: boolean;
  pending: PendingPaintPlacement[];
  selectedCubeId: string | null;
  cubes: PaintCube[];
  onSelect: () => void;
  onPreview: () => void;
  onPlace?: (squareId: string, cubeId: string) => void;
  onClear?: () => void;
}) {
  const pendingMap = Object.fromEntries(
    pending.map((placement) => [
      placement.squareId,
      cubes.find((cube) => cube.id === placement.cubeId),
    ]),
  );
  const appliedPaintCount =
    Object.keys(owned.placedCubes).length + pending.length;
  const filled = appliedPaintCount === definition.squares.length;
  return (
    <article className={`studio-canvas${active ? " active" : ""}`}>
      <button
        className={`studio-canvas-heading${active ? "" : " collapsed"}`}
        type="button"
        onClick={onSelect}
        style={
          {
            "--studio-canvas-image": `url("${definition.image}")`,
          } as React.CSSProperties
        }
        aria-expanded={active}
      >
        <span className="studio-canvas-title">
          <strong>{definition.title}</strong>
          <small>{definition.artist}</small>
        </span>
        <span
          className="studio-paint-palette"
          aria-label={`${appliedPaintCount} of ${definition.squares.length} paints applied`}
        >
          {definition.squares.map((square) => {
            const appliedCube =
              pendingMap[square.id] ?? owned.placedCubes[square.id];
            const paletteColors = appliedCube
              ? [appliedCube.color]
              : square.allowedColors;
            return (
              <i
                key={square.id}
                className={`studio-paint-swatch${
                  appliedCube ? " applied" : " needed"
                }${paletteColors.length > 1 ? " split" : ""}`}
                style={
                  paletteColors.length > 1
                    ? ({
                        "--studio-paint-a": `var(--cube-${paletteColors[0]})`,
                        "--studio-paint-b": `var(--cube-${paletteColors[1]})`,
                      } as React.CSSProperties)
                    : ({
                        "--studio-paint-a": `var(--cube-${paletteColors[0]})`,
                      } as React.CSSProperties)
                }
                title={`${paletteColors.map((color) => COLOR_LABELS[color]).join(" or ")} paint ${
                  appliedCube ? "applied" : "needed"
                }`}
              >
                <CubeRequirementArtwork colors={paletteColors} />
                {appliedCube ? <span className="paint-applied-mark">✓</span> : ""}
              </i>
            );
          })}
          {filled && <b>Complete</b>}
        </span>
      </button>
      {active && (
        <div className="studio-workspace">
          <div
            className="studio-art"
            style={{ aspectRatio: definition.aspectRatio }}
          >
            <button
              type="button"
              className="studio-art-preview"
              onClick={onPreview}
              aria-label={`View ${definition.title}`}
            >
              <img src={definition.image} alt="" />
            </button>
            <div
              className="studio-paint-targets"
              aria-label={`Paint spaces for ${definition.title}`}
            >
              {definition.squares.map((square) => (
                <RequirementMark
                  key={square.id}
                  square={square}
                  cube={owned.placedCubes[square.id]}
                  pendingCube={pendingMap[square.id]}
                  selectedCubeId={selectedCubeId}
                  canvasInstanceId={owned.instanceId}
                  onCanvas
                  onDropCube={onPlace}
                />
              ))}
            </div>
          </div>
          <div className="studio-workspace-footer">
            <span>Drag paint directly onto a marked space.</span>
            {pending.length > 0 && (
              <button className="clear-paint" type="button" onClick={onClear}>
                Clear pending
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function shuffleMuseumQueue(indices: number[]) {
  const shuffled = [...indices];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[selected]] = [
      shuffled[selected],
      shuffled[index],
    ];
  }
  return shuffled;
}

function clampMuseumValue(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function museumArtworkCrop(artwork: MuseumArtwork): MuseumCrop {
  const landscape = artwork.aspectRatio > 1;
  const crop = landscape
    ? { left: 0.043, top: 0.066, width: 0.913, height: 0.689 }
    : { left: 0.066, top: 0.044, width: 0.87, height: 0.777 };

  return {
    aspectRatio: artwork.aspectRatio * (crop.width / crop.height),
    imageWidth: 100 / crop.width,
    imageHeight: 100 / crop.height,
    imageLeft: (-crop.left / crop.width) * 100,
    imageTop: (-crop.top / crop.height) * 100,
  };
}

function createMuseumPlacement(
  artwork: MuseumArtwork,
  bounds: { width: number; height: number },
  band: number,
  bandCount: number,
): MuseumPlacement {
  const artworkCrop = museumArtworkCrop(artwork);
  const margin = clampMuseumValue(bounds.width * 0.035, 10, 22);
  const floorSpace = clampMuseumValue(bounds.height * 0.07, 28, 48);
  const usableHeight = Math.max(300, bounds.height - floorSpace);
  const bandHeight = usableHeight / Math.max(1, bandCount);
  const maximumArtHeight = Math.min(
    156,
    bandHeight * 0.72,
    bounds.width * 0.32,
  );
  const minimumArtHeight = Math.min(102, maximumArtHeight);
  const artHeight =
    minimumArtHeight +
    Math.random() * Math.max(0, maximumArtHeight - minimumArtHeight);
  const artWidth = clampMuseumValue(
    artHeight * artworkCrop.aspectRatio,
    artHeight * 0.62,
    bounds.width * 0.52,
  );
  const placardWidth = clampMuseumValue(bounds.width * 0.245, 82, 138);
  const gap = clampMuseumValue(bounds.width * 0.032, 9, 18);
  const totalWidth = artWidth + placardWidth + gap;
  const maximumX = Math.max(margin, bounds.width - totalWidth - margin);
  const x = margin + Math.random() * Math.max(0, maximumX - margin);
  const bandTop = band * bandHeight + margin;
  const figureHeight = Math.max(artHeight, 78);
  const maximumY = Math.max(
    bandTop,
    (band + 1) * bandHeight - figureHeight - margin,
  );

  return {
    x,
    y: bandTop + Math.random() * Math.max(0, maximumY - bandTop),
    artWidth,
    artHeight,
    placardWidth,
    gap,
    tilt: -1.15 + Math.random() * 2.3,
    band,
    reverse: Math.random() > 0.72,
  };
}

function museumBackgroundWorkPaused(): boolean {
  if (typeof document === "undefined" || typeof navigator === "undefined") {
    return true;
  }
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean };
    }
  ).connection;
  return (
    document.hidden ||
    connection?.saveData === true ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function museumSlotRange(bounds: { width: number; height: number }) {
  const maximum = Math.round(
    clampMuseumValue(
      Math.floor((bounds.height - 32) / 108),
      bounds.width < 390 ? 3 : 4,
      6,
    ),
  );
  return {
    minimum: Math.max(2, maximum - 2),
    maximum,
  };
}

function chooseMuseumSlotCount(
  bounds: { width: number; height: number },
  artworkCount: number,
) {
  const range = museumSlotRange(bounds);
  const maximum = Math.min(range.maximum, artworkCount);
  const minimum = Math.min(range.minimum, maximum);
  return (
    minimum + Math.floor(Math.random() * Math.max(1, maximum - minimum + 1))
  );
}

function arrangeMuseumSlots(
  current: MuseumSlot[],
  count: number,
  artworks: MuseumArtwork[],
  bounds: { width: number; height: number },
) {
  const selected = shuffleMuseumQueue(
    current.map((_, index) => index),
  )
    .slice(0, count)
    .map((index) => current[index]);
  const visible = new Set(selected.map((slot) => slot.artIndex));
  const additions = shuffleMuseumQueue(
    artworks
      .map((_, index) => index)
      .filter((index) => !visible.has(index)),
  );

  while (selected.length < count) {
    const artIndex = additions.shift();
    if (artIndex === undefined) break;
    selected.push({
      artIndex,
      phase: "arriving",
      placement: MUSEUM_DEFAULT_PLACEMENTS[
        selected.length % MUSEUM_DEFAULT_PLACEMENTS.length
      ],
    });
  }

  const bands = shuffleMuseumQueue(
    Array.from({ length: selected.length }, (_, index) => index),
  );
  return selected.map((slot, index) => ({
    ...slot,
    placement: createMuseumPlacement(
      artworks[slot.artIndex] ?? MUSEUM_FALLBACK_ART[0],
      bounds,
      bands[index],
      selected.length,
    ),
  }));
}

function MuseumWall() {
  const [artworks, setArtworks] =
    useState<MuseumArtwork[]>(MUSEUM_FALLBACK_ART);
  const [slots, setSlots] = useState<MuseumSlot[]>(
    MUSEUM_FALLBACK_ART.map((_, artIndex) => ({
      artIndex,
      phase: "arriving",
      placement: MUSEUM_DEFAULT_PLACEMENTS[artIndex],
    })),
  );
  const wallRef = useRef<HTMLElement>(null);
  const slotsRef = useRef(slots);
  const boundsRef = useRef({ width: 520, height: 650 });
  const hasMeasuredRef = useRef(false);

  useEffect(() => {
    let active = true;
    import("../lib/canvas-data").then(({ CANVASES }) => {
      if (!active) return;
      const completeCollection = CANVASES.map(
        ({ id, title, artist, year, image, aspectRatio }) => ({
          id,
          title,
          artist,
          year,
          image,
          aspectRatio,
        }),
      );
      setSlots((current) =>
        current.map((slot) => {
          const fallback = MUSEUM_FALLBACK_ART[slot.artIndex];
          if (!fallback) {
            return {
              ...slot,
              artIndex: Math.min(
                Math.max(slot.artIndex, 0),
                completeCollection.length - 1,
              ),
              phase: "resting",
            };
          }
          const artIndex = completeCollection.findIndex(
            (artwork) => artwork.id === fallback.id,
          );
          return {
            artIndex: artIndex >= 0 ? artIndex : 0,
            phase: "resting",
            placement: slot.placement,
          };
        }),
      );
      setArtworks(completeCollection);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;

    const updateLayout = (width: number, height: number, force = false) => {
      if (width < 1 || height < 1) return;
      const previous = boundsRef.current;
      if (
        !force &&
        hasMeasuredRef.current &&
        Math.abs(previous.width - width) < 8 &&
        Math.abs(previous.height - height) < 8
      ) {
        return;
      }
      const bounds = { width, height };
      hasMeasuredRef.current = true;
      boundsRef.current = bounds;
      setSlots((current) => {
        const next = arrangeMuseumSlots(
          current,
          chooseMuseumSlotCount(bounds, artworks.length),
          artworks,
          bounds,
        );
        slotsRef.current = next;
        return next;
      });
    };

    const observer = new ResizeObserver(([entry]) => {
      updateLayout(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(wall);
    updateLayout(wall.clientWidth, wall.clientHeight, true);

    return () => observer.disconnect();
  }, [artworks]);

  useEffect(() => {
    if (artworks.length <= MUSEUM_FALLBACK_ART.length) return;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    const scheduleRehang = () => {
      timer = setTimeout(
        () => {
          if (stopped) return;
          if (museumBackgroundWorkPaused()) {
            scheduleRehang();
            return;
          }
          const bounds = boundsRef.current;
          const range = museumSlotRange(bounds);
          setSlots((current) => {
            const availableCounts = Array.from(
              {
                length:
                  Math.min(range.maximum, artworks.length) - range.minimum + 1,
              },
              (_, index) => range.minimum + index,
            ).filter((count) => count !== current.length);
            const count =
              availableCounts[
                Math.floor(Math.random() * availableCounts.length)
              ] ?? current.length;
            const next = arrangeMuseumSlots(
              current,
              count,
              artworks,
              bounds,
            );
            slotsRef.current = next;
            return next;
          });
          scheduleRehang();
        },
        12000 + Math.random() * 14000,
      );
    };

    scheduleRehang();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [artworks]);

  const museumSlotCount = slots.length;

  useEffect(() => {
    if (artworks.length <= MUSEUM_FALLBACK_ART.length) return;
    let stopped = false;
    let queue: number[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const setTrackedTimeout = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
    };

    const refillQueue = () => {
      const visible = new Set(
        slotsRef.current.map((slot) => slot.artIndex),
      );
      queue = shuffleMuseumQueue(
        artworks
          .map((_, index) => index)
          .filter((index) => !visible.has(index)),
      );
    };

    const nextArtwork = () => {
      if (queue.length === 0) refillQueue();
      return queue.shift() ?? 0;
    };

    const updateSlot = (
      slotIndex: number,
      update: (slot: MuseumSlot) => MuseumSlot,
    ) => {
      setSlots((current) => {
        const next = current.map((slot, index) =>
          index === slotIndex ? update(slot) : slot,
        );
        slotsRef.current = next;
        return next;
      });
    };

    const scheduleChange = (slotIndex: number, firstChange = false) => {
      const baseDelay = firstChange ? 2800 : 5200;
      const irregularDelay =
        baseDelay + Math.random() * 6500 + slotIndex * 730;
      setTrackedTimeout(() => {
        if (stopped) return;
        if (museumBackgroundWorkPaused()) {
          scheduleChange(slotIndex);
          return;
        }
        const artIndex = nextArtwork();
        const preload = new Image();
        preload.src = artworks[artIndex].image;
        updateSlot(slotIndex, (slot) => ({
          ...slot,
          phase: "departing",
        }));
        setTrackedTimeout(() => {
          if (stopped) return;
          updateSlot(slotIndex, (slot) => ({
            artIndex,
            phase: "arriving",
            placement: createMuseumPlacement(
              artworks[artIndex],
              boundsRef.current,
              slot.placement.band,
              slotsRef.current.length,
            ),
          }));
          setTrackedTimeout(() => {
            if (stopped) return;
            updateSlot(slotIndex, (slot) => ({
              ...slot,
              phase: "resting",
            }));
            scheduleChange(slotIndex);
          }, 1150);
        }, 720);
      }, irregularDelay);
    };

    refillQueue();
    Array.from({ length: museumSlotCount }, (_, slotIndex) =>
      scheduleChange(slotIndex, true),
    );

    return () => {
      stopped = true;
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [artworks, museumSlotCount]);

  return (
    <section
      className="museum-wall"
      aria-label="Rotating museum collection"
      ref={wallRef}
    >
      <span className="museum-wall-light" aria-hidden="true" />
      {slots.map((slot, slotIndex) => {
        const artwork = artworks[slot.artIndex] ?? MUSEUM_FALLBACK_ART[0];
        const artworkCrop = museumArtworkCrop(artwork);
        return (
          <figure
            className={`museum-piece museum-piece-${slotIndex + 1} ${slot.phase}`}
            key={slotIndex}
            style={
              {
                "--museum-art-ratio": artworkCrop.aspectRatio,
                "--museum-x": `${slot.placement.x}px`,
                "--museum-y": `${slot.placement.y}px`,
                "--museum-art-width": `${slot.placement.artWidth}px`,
                "--museum-art-height": `${slot.placement.artHeight}px`,
                "--museum-placard-width": `${slot.placement.placardWidth}px`,
                "--museum-gap": `${slot.placement.gap}px`,
                "--hang-tilt": `${slot.placement.tilt}deg`,
                "--museum-image-width": `${artworkCrop.imageWidth}%`,
                "--museum-image-height": `${artworkCrop.imageHeight}%`,
                "--museum-image-left": `${artworkCrop.imageLeft}%`,
                "--museum-image-top": `${artworkCrop.imageTop}%`,
                flexDirection: slot.placement.reverse ? "row-reverse" : "row",
              } as React.CSSProperties
            }
          >
            <div className="museum-frame">
              <div className="museum-art">
                <img
                  src={artwork.image}
                  alt={`${artwork.title} by ${artwork.artist}`}
                />
              </div>
            </div>
            <figcaption className="museum-placard">
              <strong>{artwork.title}</strong>
              <span>{artwork.artist}</span>
              {artwork.year && <small>{artwork.year}</small>}
            </figcaption>
          </figure>
        );
      })}
      <span className="museum-floor-line" aria-hidden="true" />
    </section>
  );
}

function Landing({
  tutorialCanvases,
  gameCode,
  knownGame,
  recentGames,
  busy,
  error,
  onCreate,
  onJoin,
  onFind,
}: {
  tutorialCanvases: CanvasDefinition[];
  gameCode: string;
  knownGame: GameEnvelope | null;
  recentGames: RecentGame[];
  busy: boolean;
  error: string;
  onCreate: (
    hostName: string,
    gameName: string,
    avatar: PlayerAvatar,
  ) => void;
  onJoin: (displayName: string, avatar: PlayerAvatar) => void;
  onFind: (code: string) => void;
}) {
  const [hostName, setHostName] = useState("");
  const [gameName, setGameName] = useState("Saturday Studio");
  const [joinName, setJoinName] = useState("");
  const [code, setCode] = useState(gameCode);
  const [hostAvatar, setHostAvatar] = useState<PlayerAvatar>(
    defaultPlayerAvatar(),
  );
  const usedAvatarColors = useMemo(
    () =>
      (knownGame?.game.players ?? [])
        .map((player) => player.avatar?.color)
        .filter((color): color is PlayerAvatarColor => Boolean(color)),
    [knownGame],
  );
  const existingNames = useMemo(
    () => (knownGame?.game.players ?? []).map((player) => player.displayName),
    [knownGame],
  );
  const [joinAvatar, setJoinAvatar] = useState<PlayerAvatar>(
    defaultPlayerAvatar(),
  );
  const effectiveJoinAvatar = usedAvatarColors.includes(joinAvatar.color)
    ? defaultPlayerAvatar(usedAvatarColors)
    : joinAvatar;

  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link className="brand" href="/" aria-label="Starving Artists home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Starving Artists</strong>
          </span>
        </Link>
        <GameHelpControls compact canvases={tutorialCanvases} />
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <h1>Paint. Sell. Survive.</h1>

          {recentGames.length > 0 && (
            <section className="recent-games" aria-label="Your active games">
              <div className="recent-games-heading">
                <strong>Your games</strong>
                <span>{recentGames.length}</span>
              </div>
              <div className="recent-game-rail">
                {recentGames.map((recent) => (
                  <Link
                    className="recent-game-link"
                    href={`/game/${recent.code}`}
                    key={recent.code}
                  >
                    <PlayerIcon
                      name={recent.player.displayName}
                      avatar={recent.player.avatar}
                      className="compact"
                    />
                    <span>
                      <strong>{recent.name}</strong>
                      <small>
                        {recent.status === "LOBBY"
                          ? "Lobby"
                          : `Day ${recent.day}`}{" "}
                        · {recent.player.displayName}
                      </small>
                    </span>
                    <b>→</b>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="entry-card">
            {knownGame ? (
              <>
                <div className="entry-heading">
                  <span className="status-dot live" />
                  <div>
                    <p>Join studio</p>
                    <h2>{knownGame.game.name}</h2>
                  </div>
                  <span className="join-code">{knownGame.game.code}</span>
                </div>
                <div className="lobby-preview">
                  {knownGame.game.players.map((player) => (
                    <span key={player.id}>
                      <PlayerIcon
                        name={player.displayName}
                        avatar={player.avatar}
                        className="compact"
                      />
                      {player.displayName}
                    </span>
                  ))}
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    onJoin(joinName, effectiveJoinAvatar);
                  }}
                >
                  <RandomizedTextField
                    id="join-artist-name"
                    label="Your artist name"
                    value={joinName}
                    onChange={setJoinName}
                    onRandomize={() =>
                      setJoinName(randomPlayerName(existingNames))
                    }
                    placeholder="Georgia"
                    maxLength={32}
                  />
                  <AvatarPicker
                    selected={effectiveJoinAvatar}
                    usedColors={usedAvatarColors}
                    onChange={setJoinAvatar}
                  />
                  <button className="primary-button" disabled={busy}>
                    {busy ? "Joining…" : "Enter the studio"}
                  </button>
                </form>
              </>
            ) : (
              <div className="entry-tabs">
                <details open>
                  <summary>Create a game</summary>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      onCreate(hostName, gameName, hostAvatar);
                    }}
                  >
                    <div className="form-grid">
                      <RandomizedTextField
                        id="host-artist-name"
                        label="Your artist name"
                        value={hostName}
                        onChange={setHostName}
                        onRandomize={() =>
                          setHostName(randomPlayerName())
                        }
                        placeholder="Vincent"
                        maxLength={32}
                      />
                      <RandomizedTextField
                        id="studio-name"
                        label="Studio name"
                        value={gameName}
                        onChange={setGameName}
                        onRandomize={() =>
                          setGameName(randomStudioName())
                        }
                        maxLength={48}
                      />
                    </div>
                    <AvatarPicker
                      selected={hostAvatar}
                      onChange={setHostAvatar}
                    />
                    <button className="primary-button" disabled={busy}>
                      {busy ? "Opening…" : "Open a new studio"}
                    </button>
                  </form>
                </details>
                <details>
                  <summary>Join with a code</summary>
                  <form
                    className="join-code-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onFind(code);
                    }}
                  >
                    <label>
                      Six-character game code
                      <input
                        className="code-input"
                        value={code}
                        onChange={(event) =>
                          setCode(event.target.value.toUpperCase())
                        }
                        placeholder="MUSE24"
                        maxLength={6}
                        required
                      />
                    </label>
                    <button className="secondary-button" disabled={busy}>
                      Find game
                    </button>
                  </form>
                </details>
              </div>
            )}
            {error && <p className="form-error">{error}</p>}
          </div>
        </div>

        <div className="hero-gallery">
          <MuseumWall />
        </div>
      </section>
    </main>
  );
}

function Lobby({
  tutorialCanvases,
  envelope,
  credential,
  busy,
  error,
  onAction,
  onAbandon,
}: {
  tutorialCanvases: CanvasDefinition[];
  envelope: GameEnvelope;
  credential: PlayerCredential;
  busy: boolean;
  error: string;
  onAction: (action: GameAction) => void;
  onAbandon: () => void;
}) {
  const game = envelope.game;
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/game/${game.code}`;
  const isHost = game.hostPlayerId === credential.playerId;

  return (
    <main className="lobby-page">
      <header className="lobby-header">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Starving Artists</strong>
          </span>
        </Link>
        <div className="lobby-header-actions">
          <GameHelpControls
            emphasizeTutorial
            canvases={tutorialCanvases}
          />
          {isHost && (
            <AbandonGameControl
              gameName={game.name}
              busy={busy}
              onConfirm={onAbandon}
            />
          )}
        </div>
      </header>
      <section className="lobby-shell">
        <div className="lobby-title">
          <h1>{game.name}</h1>
        </div>
        <div className="share-panel">
          <div>
            <span>Game code</span>
            <strong>{game.code}</strong>
          </div>
          <button
            className="secondary-button"
            onClick={async () => {
              await navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? "Link copied" : "Copy invite link"}
          </button>
        </div>
        <div className="player-seats">
          {[0, 1, 2, 3].map((index) => {
            const player = game.players[index];
            return player ? (
              <article className="player-seat filled" key={player.id}>
                <PlayerIcon
                  name={player.displayName}
                  avatar={player.avatar}
                />
                <div>
                  <strong>{player.displayName}</strong>
                  {player.id === game.hostPlayerId && <span>Host</span>}
                </div>
                <b>✓</b>
                {isHost && player.id !== game.hostPlayerId && (
                  <KickPlayerControl
                    player={player}
                    inLobby
                    busy={busy}
                    onConfirm={() =>
                      onAction({
                        type: "KICK_PLAYER",
                        playerId: player.id,
                      })
                    }
                  />
                )}
              </article>
            ) : (
              <article className="player-seat" key={index}>
                <i>+</i>
                <div>
                  <strong>Open seat</strong>
                </div>
              </article>
            );
          })}
        </div>
        <div className="lobby-actions">
          {isHost ? (
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => onAction({ type: "START_GAME" })}
            >
              {busy ? "Setting the easels…" : "Start the game"}
            </button>
          ) : (
            <p>
              <span className="spinner" /> Waiting for host
            </p>
          )}
          {error && <p className="form-error">{error}</p>}
        </div>
      </section>
    </main>
  );
}

function GameBoard({
  tutorialCanvases,
  envelope,
  credential,
  busy,
  error,
  connected,
  onAction,
  onAbandon,
}: {
  tutorialCanvases: CanvasDefinition[];
  envelope: GameEnvelope;
  credential: PlayerCredential;
  busy: boolean;
  error: string;
  connected: boolean;
  onAction: (action: GameAction) => void;
  onAbandon: () => void;
}) {
  const game = envelope.game;
  const me = game.players.find((player) => player.id === credential.playerId);
  const currentPlayer = game.players.find(
    (player) => player.id === game.turnOrder[game.currentTurnIndex],
  );
  const myTurn = currentPlayer?.id === credential.playerId;
  const isHost = game.hostPlayerId === credential.playerId;
  const [panel, setPanel] = useState<ActionPanel>("none");
  const [buySlot, setBuySlot] = useState<number | null>(null);
  const [selectedStudioCubes, setSelectedStudioCubes] = useState<string[]>([]);
  const [selectedMarketCubes, setSelectedMarketCubes] = useState<string[]>([]);
  const [selectedCanvas, setSelectedCanvas] = useState<string | null>(null);
  const [selectedCube, setSelectedCube] = useState<string | null>(null);
  const [pendingPaint, setPendingPaint] = useState<PendingPaintPlacement[]>([]);
  const [saleSelection, setSaleSelection] = useState<string[]>([]);
  const [studioPeekPlayerId, setStudioPeekPlayerId] = useState<string | null>(
    null,
  );
  const [studioPeekCanvasId, setStudioPeekCanvasId] = useState<string | null>(
    null,
  );
  const [dismissedNutritionWarningDay, setDismissedNutritionWarningDay] =
    useState<number | null>(null);
  const [canvasPreview, setCanvasPreview] = useState<{
    definitionId: string;
    action?: CanvasPreviewAction;
  } | null>(null);
  const previousVersion = useRef(game.version);

  useEffect(() => {
    if (previousVersion.current !== game.version) {
      previousVersion.current = game.version;
      setSelectedStudioCubes([]);
      setSelectedMarketCubes([]);
      setPendingPaint([]);
      setSelectedCube(null);
      setPanel("none");
      setBuySlot(null);
      setSaleSelection([]);
      setCanvasPreview((preview) => (preview?.action ? null : preview));
    }
  }, [game.version]);

  const activeOwned = me?.canvases.find(
    (canvas) => canvas.instanceId === selectedCanvas,
  );
  const previewDefinition = canvasPreview
    ? envelope.canvases[canvasPreview.definitionId]
    : undefined;
  const availableCubes =
    me?.studioCubes.filter(
      (cube) => !pendingPaint.some((placement) => placement.cubeId === cube.id),
    ) ?? [];
  const completeCanvases =
    me?.canvases.filter((canvas) => {
      const definition = envelope.canvases[canvas.definitionId];
      return (
        definition &&
        Object.keys(canvas.placedCubes).length === definition.squares.length
      );
    }) ?? [];
  const collectionLimit =
    myTurn && game.selling?.stage === "COLLECTION" && me
      ? Math.min(
          game.selling.pickSizes[me.id] ?? 1,
          game.selling.quotas[me.id] ?? 0,
          game.paintMarket.length,
        )
      : 0;
  const tradeValid =
    (selectedStudioCubes.length === 2 &&
      selectedMarketCubes.length === 1) ||
    (selectedStudioCubes.length === 5 &&
      selectedMarketCubes.length === 2) ||
    (selectedStudioCubes.length === 9 &&
      selectedMarketCubes.length === 3);
  const dayPhaseIndex = DAY_PHASES.findIndex(
    (entry) => entry.phase === game.phase,
  );
  const dayPhase = DAY_PHASES[dayPhaseIndex];
  const myOrderIndex = me ? game.turnOrder.indexOf(me.id) : -1;
  const hasDeclaredSale = Boolean(
    me &&
      game.selling &&
      Object.prototype.hasOwnProperty.call(
        game.selling.declarations,
        me.id,
      ),
  );
  const personalActionsRemaining =
    !me || me.starved || myOrderIndex < 0
      ? 0
      : game.phase === "MORNING"
        ? myOrderIndex >= game.currentTurnIndex
          ? 2
          : 1
        : game.phase === "AFTERNOON"
          ? myOrderIndex >= game.currentTurnIndex
            ? 1
            : 0
          : game.phase === "SELLING" &&
              game.selling?.stage === "DECLARATIONS" &&
              !hasDeclaredSale
            ? 1
            : 0;
  const phaseActionsRemaining =
    game.phase === "MORNING" || game.phase === "AFTERNOON"
      ? Math.max(0, game.turnOrder.length - game.currentTurnIndex)
      : game.phase === "SELLING" &&
          game.selling?.stage === "DECLARATIONS"
        ? game.turnOrder.filter(
            (playerId) =>
              !Object.prototype.hasOwnProperty.call(
                game.selling?.declarations ?? {},
                playerId,
              ),
          ).length
        : game.phase === "SELLING" &&
            game.selling?.stage === "COLLECTION"
          ? Object.values(game.selling.quotas).reduce(
              (total, quota) => total + Math.max(0, quota),
              0,
            )
          : 0;
  const phaseRemainingLabel =
    game.phase === "ENDED"
      ? "actions left"
      : game.phase === "MORNING"
      ? `first action${phaseActionsRemaining === 1 ? "" : "s"} left`
      : game.phase === "AFTERNOON"
        ? `second action${phaseActionsRemaining === 1 ? "" : "s"} left`
        : game.selling?.stage === "COLLECTION"
          ? `paint cube${phaseActionsRemaining === 1 ? "" : "s"} left`
          : `sell action${phaseActionsRemaining === 1 ? "" : "s"} left`;
  const waitingForTurn =
    Boolean(currentPlayer) && !myTurn && game.phase !== "ENDED";
  const studioPeekPlayer = studioPeekPlayerId
    ? game.players.find((player) => player.id === studioPeekPlayerId)
    : undefined;

  const closePanel = () => {
    setPanel("none");
    setBuySlot(null);
    setSelectedStudioCubes([]);
    setSelectedMarketCubes([]);
  };

  if (!me) {
    return (
      <main className="fatal-state">
        <h1>This player is not seated in the game.</h1>
        <Link href="/">Return home</Link>
      </main>
    );
  }

  const showNutritionWarning =
    game.phase !== "ENDED" &&
    !me.starved &&
    me.nutrition === 1 &&
    dismissedNutritionWarningDay !== game.day;

  const toggle = (
    id: string,
    selected: string[],
    setter: (next: string[]) => void,
    maximum?: number,
  ) => {
    if (selected.includes(id)) {
      setter(selected.filter((entry) => entry !== id));
    } else if (!maximum || selected.length < maximum) {
      setter([...selected, id]);
    }
  };

  const placeCube = (
    canvasInstanceId: string,
    squareId: string,
    cubeId: string,
  ) => {
    if (!myTurn) return;
    const targetCanvas = me.canvases.find(
      (canvas) => canvas.instanceId === canvasInstanceId,
    );
    const targetDefinition = targetCanvas
      ? envelope.canvases[targetCanvas.definitionId]
      : undefined;
    if (!targetCanvas || !targetDefinition) return;
    const cube = me.studioCubes.find((entry) => entry.id === cubeId);
    const square = targetDefinition.squares.find(
      (entry) => entry.id === squareId,
    );
    if (!cube || !square || targetCanvas.placedCubes[squareId]) return;
    const withoutCube = pendingPaint.filter(
      (placement) => placement.cubeId !== cubeId,
    );
    const withoutSquare = withoutCube.filter(
      (placement) =>
        placement.canvasInstanceId !== canvasInstanceId ||
        placement.squareId !== squareId,
    );
    const existingWild =
      Object.values(targetCanvas.placedCubes).some(
        (placed) => placed.color === "wild",
      ) ||
      withoutSquare
        .filter(
          (placement) => placement.canvasInstanceId === canvasInstanceId,
        )
        .some((placement) => {
          const placed = me.studioCubes.find(
            (entry) => entry.id === placement.cubeId,
          );
          return placed?.color === "wild";
        });
    if (
      (cube.color !== "wild" &&
        !square.allowedColors.includes(cube.color)) ||
      (cube.color === "wild" && existingWild) ||
      withoutSquare.length >= 4
    ) {
      return;
    }
    const nextPaint = [
      ...withoutSquare,
      { canvasInstanceId, squareId, cubeId },
    ];
    setPendingPaint(nextPaint);
    setSelectedCube(null);
    if (nextPaint.length === 4) {
      setPanel("paint");
    }
  };

  return (
    <main className="game-page">
      <header className="game-header">
        <Link className="brand brand-small" href="/">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Starving Artists</strong>
            <small>{game.code}</small>
          </span>
        </Link>
        <div className="turn-display">
          <i className={`status-dot ${connected ? "live" : "offline"}`} />
          {currentPlayer && (
            <PlayerIcon
              name={currentPlayer.displayName}
              avatar={currentPlayer.avatar}
              className="turn-avatar"
            />
          )}
          <span>
            {myTurn ? "Your turn" : `${currentPlayer?.displayName ?? "—"} is acting`}
          </span>
        </div>
        <div className="game-header-actions">
          <GameHelpControls compact canvases={tutorialCanvases} />
          {isHost && (
            <AbandonGameControl
              gameName={game.name}
              busy={busy}
              onConfirm={onAbandon}
            />
          )}
          <div
            className={`nutrition-meter${me.nutrition === 1 ? " critical" : ""}`}
            aria-label={`Nutrition ${me.nutrition} of 5`}
            title={`Nutrition ${me.nutrition} of 5`}
          >
            <span>Nutrition</span>
            <div>
              {Array.from({ length: me.nutrition }, (_, index) => (
                <PlayerIcon
                  key={index}
                  name={me.displayName}
                  avatar={me.avatar}
                  className="nutrition-icon"
                />
              ))}
              {me.starved && <strong>Starved</strong>}
            </div>
          </div>
        </div>
      </header>

      <section
        className={`day-status phase-${game.phase.toLowerCase()}${
          waitingForTurn ? " waiting" : ""
        }`}
        aria-label={`Day ${game.day}, ${dayPhase?.label ?? "complete"}`}
      >
        <div className="day-status-title">
          <span>Day {game.day}</span>
          <strong>{dayPhase?.label ?? "Final Gallery"}</strong>
          <small>
            {game.selling?.stage === "COLLECTION"
              ? "Paint collection"
              : dayPhase?.detail ?? "Complete"}
          </small>
        </div>

        <div className="day-phase-track" aria-label="Daily phases">
          {DAY_PHASES.map((entry, index) => {
            const state =
              game.phase === "ENDED" || index < dayPhaseIndex
                ? "complete"
                : index === dayPhaseIndex
                  ? "current"
                  : "upcoming";
            return (
              <span
                className={state}
                key={entry.phase}
                aria-current={state === "current" ? "step" : undefined}
              >
                <i>{index + 1}</i>
                <b>{entry.label}</b>
              </span>
            );
          })}
        </div>

        <div className="day-action-counts">
          <div>
            <strong>{phaseActionsRemaining}</strong>
            <span>{phaseRemainingLabel}</span>
          </div>
          <div>
            <strong>{personalActionsRemaining}</strong>
            <span>your actions left today</span>
          </div>
        </div>
        {waitingForTurn && currentPlayer && (
          <TurnWaitOverlay
            player={currentPlayer}
            animationKey={`${game.id}:${game.day}:${game.phase}:${currentPlayer.id}`}
          />
        )}
      </section>

      <section className="score-strip">
        {game.players.map((player) => (
          <article
            key={player.id}
            className={`${player.id === currentPlayer?.id ? "current" : ""}${
              player.starved ? " starved" : ""
            }`}
          >
            <button
              type="button"
              className="score-player-button"
              onClick={() => {
                setStudioPeekPlayerId(player.id);
                setStudioPeekCanvasId(null);
              }}
              aria-label={`View ${player.displayName}'s studio`}
            >
              <PlayerIcon
                name={player.displayName}
                avatar={player.avatar}
              />
              <div>
                <strong>
                  {player.displayName}
                  {player.id === credential.playerId ? " · You" : ""}
                </strong>
                <span>
                  ★ {player.score} &nbsp; ● {player.nutrition}/5 &nbsp; ◫{" "}
                  {player.soldCanvasCount}
                </span>
              </div>
              {player.id === game.firstPlayerId && (
                <b title="First player">1st</b>
              )}
            </button>
            {isHost && player.id !== game.hostPlayerId && (
              <KickPlayerControl
                player={player}
                inLobby={false}
                busy={busy}
                onConfirm={() =>
                  onAction({
                    type: "KICK_PLAYER",
                    playerId: player.id,
                  })
                }
              />
            )}
          </article>
        ))}
      </section>

      <div className="game-grid">
        <section className="shared-board">
          <div className="section-heading">
            <h2>Canvas Market</h2>
          </div>
          <div className="canvas-market">
            {game.canvasMarket.map((definitionId, index) => {
              const definition = envelope.canvases[definitionId];
              if (!definition) return null;
              return (
                <CanvasCard
                  key={definitionId}
                  definition={definition}
                  cost={index + 1}
                  compact
                  selected={buySlot === index}
                  onClick={() =>
                    setCanvasPreview({
                      definitionId,
                      action:
                        myTurn &&
                        (game.phase === "MORNING" ||
                          game.phase === "AFTERNOON")
                          ? { kind: "buy", slotIndex: index }
                          : undefined,
                    })
                  }
                />
              );
            })}
          </div>

          <div className="paint-market-section">
            <div className="section-heading small">
              <h2>Paint Market</h2>
            </div>
            <div className="cube-rack market-rack">
              {game.paintMarket.length ? (
                game.paintMarket.map((cube) => (
                  <Cube
                    cube={cube}
                    key={cube.id}
                    selected={selectedMarketCubes.includes(cube.id)}
                    disabled={
                      !myTurn ||
                      (panel !== "trade" &&
                        game.selling?.stage !== "COLLECTION")
                    }
                    onClick={() =>
                      toggle(
                        cube.id,
                        selectedMarketCubes,
                        setSelectedMarketCubes,
                        game.selling?.stage === "COLLECTION"
                          ? collectionLimit
                          : 3,
                      )
                    }
                  />
                ))
              ) : (
                <p className="empty-state">The market is empty.</p>
              )}
            </div>
          </div>
        </section>

        <section className="my-studio">
          <div className="section-heading">
            <div className="studio-owner">
              <PlayerIcon name={me.displayName} avatar={me.avatar} />
              <h2>{me.displayName}&apos;s Studio</h2>
            </div>
          </div>

          <div className="cube-rack studio-rack">
            {availableCubes.length ? (
              availableCubes.map((cube) => (
                <Cube
                  cube={cube}
                  key={cube.id}
                  draggable={
                    myTurn &&
                    Boolean(activeOwned) &&
                    (game.phase === "MORNING" ||
                      game.phase === "AFTERNOON")
                  }
                  onPointerDrop={(canvasInstanceId, squareId, cubeId) => {
                    placeCube(canvasInstanceId, squareId, cubeId);
                  }}
                  selected={
                    selectedCube === cube.id ||
                    selectedStudioCubes.includes(cube.id)
                  }
                  disabled={!myTurn}
                  onClick={() => {
                    if (activeOwned) {
                      setSelectedCube(
                        selectedCube === cube.id ? null : cube.id,
                      );
                    }
                  }}
                />
              ))
            ) : (
              <p className="empty-state">No loose paint cubes.</p>
            )}
          </div>

          <div className="studio-canvases">
            {me.canvases.length ? (
              me.canvases.map((owned) => {
                const definition = envelope.canvases[owned.definitionId];
                if (!definition) return null;
                return (
                  <StudioCanvas
                    key={owned.instanceId}
                    owned={owned}
                    definition={definition}
                    active={selectedCanvas === owned.instanceId}
                    pending={
                      pendingPaint.filter(
                        (placement) =>
                          placement.canvasInstanceId === owned.instanceId,
                      )
                    }
                    selectedCubeId={selectedCube}
                    cubes={me.studioCubes}
                    onSelect={() => {
                      setSelectedCanvas(
                        selectedCanvas === owned.instanceId
                          ? null
                          : owned.instanceId,
                      );
                      setSelectedCube(null);
                    }}
                    onPreview={() =>
                      setCanvasPreview({ definitionId: definition.id })
                    }
                    onPlace={
                      myTurn &&
                      (game.phase === "MORNING" ||
                        game.phase === "AFTERNOON")
                        ? (squareId, cubeId) =>
                            placeCube(owned.instanceId, squareId, cubeId)
                        : undefined
                    }
                    onClear={() => {
                      setPendingPaint(
                        pendingPaint.filter(
                          (placement) =>
                            placement.canvasInstanceId !== owned.instanceId,
                        ),
                      );
                      setSelectedCube(null);
                    }}
                  />
                );
              })
            ) : (
              <div className="studio-empty">
                <span>◫</span>
                <h3>No canvases</h3>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="action-dock">
        {game.phase === "ENDED" ? (
          <div className="winner-banner">
            <span>★</span>
            <strong className="winner-identities">
              {game.winnerIds.map((id) => {
                const winner = game.players.find((player) => player.id === id);
                return winner ? (
                  <span key={winner.id}>
                    <PlayerIcon
                      name={winner.displayName}
                      avatar={winner.avatar}
                    />
                    {winner.displayName}
                  </span>
                ) : null;
              })}
              <em>
                {game.winnerIds.length > 1
                  ? "share the exhibition"
                  : "wins the exhibition"}
              </em>
            </strong>
          </div>
        ) : game.phase === "SELLING" && myTurn ? (
          <div className="action-buttons selling-action">
            <button
              disabled={busy}
              onClick={() =>
                game.selling?.stage === "DECLARATIONS" &&
                completeCanvases.length === 0
                  ? onAction({
                      type: "DECLARE_SALES",
                      canvasInstanceIds: [],
                    })
                  : setPanel(
                      game.selling?.stage === "COLLECTION"
                        ? "collect"
                        : "sale",
                    )
              }
              title={
                game.selling?.stage === "DECLARATIONS" &&
                completeCanvases.length === 0
                  ? "You have no completed canvases to sell."
                  : undefined
              }
              aria-label={
                game.selling?.stage === "DECLARATIONS" &&
                completeCanvases.length === 0
                  ? "Go to sleep. You have no completed canvases to sell."
                  : undefined
              }
            >
              <b>
                {game.selling?.stage === "COLLECTION"
                  ? "↓"
                  : completeCanvases.length === 0
                    ? "☾"
                    : "★"}
              </b>
              {game.selling?.stage === "COLLECTION"
                ? "Collect"
                : completeCanvases.length === 0
                  ? "Go to sleep"
                  : "Sell"}
            </button>
          </div>
        ) : (
          <div
            className={`action-buttons${
              pendingPaint.length ? " has-pending-paint" : ""
            }`}
          >
            <button
              disabled={!myTurn || busy}
              onClick={() => onAction({ type: "WORK" })}
            >
              <b>+3</b>
              Work
            </button>
            <button
              className={panel === "buy" ? "active" : ""}
              disabled={!myTurn || busy}
              onClick={() => {
                setPanel("buy");
                setBuySlot(null);
                setSelectedStudioCubes([]);
                setPendingPaint([]);
              }}
            >
              <b>◫</b>
              Buy
            </button>
            <button
              className={panel === "trade" ? "active" : ""}
              disabled={!myTurn || busy || game.paintMarket.length === 0}
              onClick={() => {
                setPanel("trade");
                setSelectedStudioCubes([]);
                setSelectedMarketCubes([]);
                setPendingPaint([]);
              }}
            >
              <b>⇄</b>
              Trade
            </button>
            <button
              disabled={!myTurn || busy}
              onClick={() => onAction({ type: "PASS" })}
            >
              <b>→</b>
              Pass
            </button>
            {pendingPaint.length > 0 && (
              <>
                <button
                  className="undo-paint-action"
                  disabled={!myTurn || busy}
                  onClick={() => {
                    setPendingPaint(pendingPaint.slice(0, -1));
                    setSelectedCube(null);
                  }}
                >
                  <b>↶</b>
                  Undo
                </button>
                <button
                  className={panel === "paint" ? "active paint-action" : "paint-action"}
                  disabled={!myTurn || busy}
                  onClick={() => setPanel("paint")}
                >
                  <b>{pendingPaint.length}</b>
                  Paint
                </button>
              </>
            )}
          </div>
        )}
      </footer>

      {panel === "buy" && myTurn && (
        <FeatureModal
          title="Acquire Canvas"
          onClose={closePanel}
          footerRail={
            buySlot !== null ? (
              <>
                <div className="modal-row-heading">
                  <strong>Payment</strong>
                  <span>
                    {selectedStudioCubes.length}/{buySlot + 1}
                  </span>
                </div>
                <div className="cube-rack modal-cube-rack">
                  {me.studioCubes.map((cube) => (
                    <Cube
                      key={cube.id}
                      cube={cube}
                      selected={selectedStudioCubes.includes(cube.id)}
                      onClick={() =>
                        toggle(
                          cube.id,
                          selectedStudioCubes,
                          setSelectedStudioCubes,
                          buySlot + 1,
                        )
                      }
                    />
                  ))}
                </div>
              </>
            ) : undefined
          }
          footer={
            <>
              <button className="secondary-button" onClick={closePanel}>
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={
                  busy ||
                  buySlot === null ||
                  selectedStudioCubes.length !== buySlot + 1
                }
                onClick={() => {
                  if (buySlot !== null) {
                    onAction({
                      type: "BUY_CANVAS",
                      slotIndex: buySlot,
                      paymentCubeIds: selectedStudioCubes,
                    });
                  }
                }}
              >
                Acquire
              </button>
            </>
          }
        >
          <div className="modal-canvas-grid">
            {game.canvasMarket.map((definitionId, index) => {
              const definition = envelope.canvases[definitionId];
              if (!definition) return null;
              return (
                <CanvasCard
                  key={definitionId}
                  definition={definition}
                  cost={index + 1}
                  compact
                  selected={buySlot === index}
                  onClick={() =>
                    setCanvasPreview({
                      definitionId,
                      action: { kind: "buy", slotIndex: index },
                    })
                  }
                />
              );
            })}
          </div>
        </FeatureModal>
      )}

      {panel === "trade" && myTurn && (
        <FeatureModal
          title="Trade Paint"
          onClose={closePanel}
          footerRail={
            <>
              <div className="modal-row-heading">
                <strong>Give</strong>
                <span>{selectedStudioCubes.length}</span>
              </div>
              <div className="cube-rack modal-cube-rack">
                {me.studioCubes.map((cube) => (
                  <Cube
                    key={cube.id}
                    cube={cube}
                    selected={selectedStudioCubes.includes(cube.id)}
                    onClick={() =>
                      toggle(
                        cube.id,
                        selectedStudioCubes,
                        setSelectedStudioCubes,
                        9,
                      )
                    }
                  />
                ))}
              </div>
              <div className="trade-rate">2:1 · 5:2 · 9:3</div>
            </>
          }
          footer={
            <>
              <button className="secondary-button" onClick={closePanel}>
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={busy || !tradeValid}
                onClick={() =>
                  onAction({
                    type: "TRADE_MARKET",
                    giveCubeIds: selectedStudioCubes,
                    takeCubeIds: selectedMarketCubes,
                  })
                }
              >
                Trade
              </button>
            </>
          }
        >
          <div className="trade-grid">
            <section>
              <div className="modal-row-heading">
                <strong>Take</strong>
                <span>{selectedMarketCubes.length}</span>
              </div>
              <div className="cube-rack modal-cube-rack">
                {game.paintMarket.map((cube) => (
                  <Cube
                    key={cube.id}
                    cube={cube}
                    selected={selectedMarketCubes.includes(cube.id)}
                    onClick={() =>
                      toggle(
                        cube.id,
                        selectedMarketCubes,
                        setSelectedMarketCubes,
                        3,
                      )
                    }
                  />
                ))}
              </div>
            </section>
          </div>
        </FeatureModal>
      )}

      {panel === "paint" && myTurn && pendingPaint.length > 0 && (
        <FeatureModal
          title="Apply Paint"
          onClose={closePanel}
          footerRail={
            <>
              <div className="modal-row-heading">
                <strong>Placement</strong>
                <span>{pendingPaint.length}</span>
              </div>
              <div className="cube-rack modal-cube-rack placement-rail">
                {pendingPaint.map((placement) => {
                  const cube = me.studioCubes.find(
                    (entry) => entry.id === placement.cubeId,
                  );
                  return cube ? (
                    <Cube key={placement.cubeId} cube={cube} disabled />
                  ) : null;
                })}
              </div>
            </>
          }
          footer={
            <>
              <button className="secondary-button" onClick={closePanel}>
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={busy || pendingPaint.length === 0}
                onClick={() =>
                  onAction({
                    type: "PAINT",
                    placements: pendingPaint,
                  })
                }
              >
                {pendingPaint.length < 4
                  ? `Paint ${pendingPaint.length} anyway`
                  : "Paint 4"}
              </button>
            </>
          }
        >
          {pendingPaint.length < 4 && (
            <div className="paint-action-warning" role="alert">
              <strong>Use fewer than four paints?</strong>
              <span>
                This action can place up to four cubes. Any unused placements
                are lost.
              </span>
            </div>
          )}
          <div className="paint-confirm-list">
            {pendingPaint.map((placement) => {
              const owned = me.canvases.find(
                (entry) =>
                  entry.instanceId === placement.canvasInstanceId,
              );
              const definition = owned
                ? envelope.canvases[owned.definitionId]
                : undefined;
              const cube = me.studioCubes.find(
                (entry) => entry.id === placement.cubeId,
              );
              const square = definition?.squares.find(
                (entry) => entry.id === placement.squareId,
              );
              if (!cube || !square || !definition) return null;
              return (
                <div
                  key={`${placement.canvasInstanceId}:${placement.squareId}`}
                >
                  <span className="mini-cube">
                    <CubeArtwork color={cube.color} />
                  </span>
                  <strong>{definition.title}</strong>
                  <span>
                    {COLOR_LABELS[cube.color]} ·{" "}
                    {square.allowedColors
                      .map((color) => COLOR_LABELS[color])
                      .join(" / ")}
                  </span>
                </div>
              );
            })}
          </div>
        </FeatureModal>
      )}

      {panel === "sale" && myTurn && (
        <FeatureModal
          title="Sell Canvases"
          onClose={closePanel}
          footer={
            <>
              <button className="secondary-button" onClick={closePanel}>
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={busy}
                onClick={() =>
                  onAction({
                    type: "DECLARE_SALES",
                    canvasInstanceIds: saleSelection,
                  })
                }
              >
                {saleSelection.length
                  ? `Sell ${saleSelection.length}`
                  : "Sell None"}
              </button>
            </>
          }
        >
          {completeCanvases.length > 0 ? (
            <div className="modal-canvas-grid sale-grid">
              {completeCanvases.map((canvas) => {
                const definition = envelope.canvases[canvas.definitionId];
                if (!definition) return null;
                return (
                  <CanvasCard
                    key={canvas.instanceId}
                    definition={definition}
                    compact
                    selected={saleSelection.includes(canvas.instanceId)}
                    onClick={() =>
                      setCanvasPreview({
                        definitionId: canvas.definitionId,
                        action: {
                          kind: "sale",
                          canvasInstanceId: canvas.instanceId,
                        },
                      })
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="modal-empty">No completed canvases</div>
          )}
        </FeatureModal>
      )}

      {panel === "collect" && myTurn && (
        <FeatureModal
          title={`Collect Paint · ${collectionLimit}`}
          onClose={closePanel}
          footer={
            <>
              <button className="secondary-button" onClick={closePanel}>
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={
                  busy ||
                  selectedMarketCubes.length < 1 ||
                  selectedMarketCubes.length > collectionLimit
                }
                onClick={() =>
                  onAction({
                    type: "COLLECT_PAINT",
                    cubeIds: selectedMarketCubes,
                  })
                }
              >
                Collect {selectedMarketCubes.length}
              </button>
            </>
          }
        >
          <div className="cube-rack modal-cube-rack collect-rack">
            {game.paintMarket.map((cube) => (
              <Cube
                key={cube.id}
                cube={cube}
                selected={selectedMarketCubes.includes(cube.id)}
                onClick={() =>
                  toggle(
                    cube.id,
                    selectedMarketCubes,
                    setSelectedMarketCubes,
                    collectionLimit,
                  )
                }
              />
            ))}
          </div>
        </FeatureModal>
      )}

      {canvasPreview && previewDefinition && (
        <FeatureModal
          title={previewDefinition.title}
          onClose={() => setCanvasPreview(null)}
          footerRail={
            <CanvasCubeReference definition={previewDefinition} />
          }
          footer={
            <>
              <button
                className="secondary-button"
                onClick={() => setCanvasPreview(null)}
              >
                Close
              </button>
              {canvasPreview.action && (
                <button
                  className="primary-button"
                  onClick={() => {
                    if (canvasPreview.action?.kind === "buy") {
                      setPanel("buy");
                      setBuySlot(canvasPreview.action.slotIndex);
                      setSelectedStudioCubes([]);
                      setPendingPaint([]);
                    } else if (canvasPreview.action?.kind === "sale") {
                      const canvasInstanceId =
                        canvasPreview.action.canvasInstanceId;
                      setSaleSelection((current) =>
                        current.includes(canvasInstanceId)
                          ? current.filter(
                              (entry) => entry !== canvasInstanceId,
                            )
                          : [...current, canvasInstanceId],
                      );
                    }
                    setCanvasPreview(null);
                  }}
                >
                  {canvasPreview.action.kind === "buy"
                    ? "Select Canvas"
                    : saleSelection.includes(
                          canvasPreview.action.canvasInstanceId,
                        )
                      ? "Remove"
                      : "Select to Sell"}
                </button>
              )}
            </>
          }
        >
          <div className="canvas-zoom">
            <img
              src={previewDefinition.image}
              alt={`${previewDefinition.title} by ${previewDefinition.artist}`}
            />
          </div>
          <div className="canvas-zoom-caption">
            <strong>{previewDefinition.artist}</strong>
            {previewDefinition.year && <span>{previewDefinition.year}</span>}
          </div>
        </FeatureModal>
      )}

      {studioPeekPlayer && (
        <FeatureModal
          title={`${studioPeekPlayer.displayName}'s Studio`}
          onClose={() => {
            setStudioPeekPlayerId(null);
            setStudioPeekCanvasId(null);
          }}
          footer={
            <button
              className="primary-button"
              onClick={() => {
                setStudioPeekPlayerId(null);
                setStudioPeekCanvasId(null);
              }}
            >
              Close
            </button>
          }
        >
          <div className="studio-peek-summary">
            <PlayerIcon
              name={studioPeekPlayer.displayName}
              avatar={studioPeekPlayer.avatar}
            />
            <span>
              <strong>{studioPeekPlayer.canvases.length}</strong>
              <small>
                canvas{studioPeekPlayer.canvases.length === 1 ? "" : "es"} in
                studio
              </small>
            </span>
          </div>
          {studioPeekPlayer.canvases.length ? (
            <div className="studio-peek-canvases">
              {studioPeekPlayer.canvases.map((owned) => {
                const definition = envelope.canvases[owned.definitionId];
                if (!definition) return null;
                return (
                  <StudioCanvas
                    key={owned.instanceId}
                    owned={owned}
                    definition={definition}
                    active={studioPeekCanvasId === owned.instanceId}
                    pending={[]}
                    selectedCubeId={null}
                    cubes={[]}
                    onSelect={() =>
                      setStudioPeekCanvasId((current) =>
                        current === owned.instanceId ? null : owned.instanceId,
                      )
                    }
                    onPreview={() => {
                      setStudioPeekPlayerId(null);
                      setStudioPeekCanvasId(null);
                      setCanvasPreview({ definitionId: definition.id });
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="modal-empty">No canvases in this studio</div>
          )}
        </FeatureModal>
      )}

      {showNutritionWarning && (
        <FeatureModal
          title="Nutrition Warning"
          onClose={() => setDismissedNutritionWarningDay(game.day)}
          footer={
            <button
              className="primary-button"
              onClick={() => setDismissedNutritionWarningDay(game.day)}
            >
              Continue
            </button>
          }
        >
          <div className="nutrition-warning">
            <PlayerIcon
              name={me.displayName}
              avatar={me.avatar}
              className="nutrition-warning-icon"
            />
            <div>
              <strong>One nutrition remains.</strong>
              <span>
                Sell a completed canvas tonight. If nutrition falls again at
                the start of the next day, you starve.
              </span>
            </div>
          </div>
        </FeatureModal>
      )}

      {error && <div className="game-error">{error}</div>}
    </main>
  );
}

export default function GameApp({
  initialGameCode = "",
  initialTutorialCanvases = TUTORIAL_CANVASES_FALLBACK,
}: {
  initialGameCode?: string;
  initialTutorialCanvases?: CanvasDefinition[];
}) {
  const router = useRouter();
  const [gameCode, setGameCode] = useState("");
  const [envelope, setEnvelope] = useState<GameEnvelope | null>(null);
  const [credential, setCredential] = useState<PlayerCredential | null>(null);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(true);
  const pollInFlight = useRef(false);
  const envelopeRef = useRef<GameEnvelope | null>(null);
  const pendingActionRef = useRef<string | null>(null);
  const tutorialCanvases = useMemo(
    () =>
      resolveTutorialCanvases(
        envelope
          ? Object.values(envelope.canvases)
          : initialTutorialCanvases,
      ),
    [envelope, initialTutorialCanvases],
  );

  const loadGame = useCallback(async (code: string, version?: number) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return null;
    const response = await fetch(
      `/api/games/${normalized}${version === undefined ? "" : `?version=${version}`}`,
      { cache: "no-store" },
    );
    if (response.status === 204) return "unchanged" as const;
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(body.error ?? "Game not found.");
    }
    return (await response.json()) as GameEnvelope;
  }, []);

  const loadRecentGames = useCallback(async () => {
    const stored = Object.values(credentials());
    const games = await Promise.all(
      stored.map(async (saved): Promise<RecentGame | null> => {
        try {
          const response = await fetch(`/api/games/${saved.gameCode}`, {
            cache: "no-store",
          });
          if (response.status === 404) {
            removeCredential(saved.gameCode);
            return null;
          }
          if (!response.ok) return null;
          const result = (await response.json()) as GameEnvelope;
          const player = result.game.players.find(
            (entry) => entry.id === saved.playerId,
          );
          if (
            !player ||
            (result.game.status !== "LOBBY" &&
              result.game.status !== "ACTIVE")
          ) {
            removeCredential(saved.gameCode);
            return null;
          }
          return {
            code: result.game.code,
            name: result.game.name,
            status: result.game.status,
            day: result.game.day,
            updatedAt: result.game.updatedAt,
            player,
            isHost: result.game.hostPlayerId === saved.playerId,
          };
        } catch {
          return null;
        }
      }),
    );
    setRecentGames(
      games
        .filter((game): game is RecentGame => Boolean(game))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    );
  }, []);

  useEffect(() => {
    envelopeRef.current = envelope;
  }, [envelope]);

  useEffect(() => {
    const legacyCode =
      new URLSearchParams(window.location.search).get("game")?.toUpperCase() ??
      "";
    const code = (initialGameCode || legacyCode).trim().toUpperCase();
    if (!code) {
      Promise.resolve().then(() => {
        setGameCode("");
        setEnvelope(null);
        setCredential(null);
        setError("");
      });
      void Promise.resolve().then(loadRecentGames);
      return;
    }
    if (!initialGameCode && legacyCode) {
      router.replace(`/game/${legacyCode}`);
    }
    const stored = credentials()[code] ?? null;
    Promise.resolve().then(() => {
      setGameCode(code);
      setCredential(stored);
    });
    loadGame(code)
      .then((result) => {
        if (!result || result === "unchanged") return;
        if (result.game.status === "ABANDONED") {
          removeCredential(code);
          router.replace("/");
          return;
        }
        setEnvelope(result);
      })
      .catch((reason) => setError(reason.message));
  }, [initialGameCode, loadGame, loadRecentGames, router]);

  useEffect(() => {
    if (envelope?.game.status !== "ABANDONED") return;
    removeCredential(envelope.game.code);
    Promise.resolve().then(() => {
      setGameCode("");
      setEnvelope(null);
      setCredential(null);
    });
    router.replace("/");
    void Promise.resolve().then(loadRecentGames);
  }, [envelope, loadRecentGames, router]);

  useEffect(() => {
    if (!envelopeRef.current || !gameCode || pendingActionId) return;
    let stopped = false;
    let timer: number | null = null;
    let delay = 3_500;

    const schedule = (nextDelay: number) => {
      if (stopped) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(poll, nextDelay);
    };

    const poll = async () => {
      if (stopped || pollInFlight.current || pendingActionRef.current) return;
      if (document.hidden || navigator.onLine === false) {
        schedule(30_000);
        return;
      }
      pollInFlight.current = true;
      try {
        const version = envelopeRef.current?.game.version;
        const result = await loadGame(gameCode, version);
        if (result !== "unchanged" && result) setEnvelope(result);
        delay = 3_500;
        setConnected(true);
      } catch {
        delay = Math.min(30_000, Math.max(7_000, delay * 2));
        setConnected(false);
      } finally {
        pollInFlight.current = false;
        schedule(delay + Math.floor(Math.random() * 750));
      }
    };

    const pollNow = () => {
      if (!document.hidden && navigator.onLine !== false) schedule(0);
    };
    document.addEventListener("visibilitychange", pollNow);
    window.addEventListener("online", pollNow);
    schedule(3_500 + Math.floor(Math.random() * 750));
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", pollNow);
      window.removeEventListener("online", pollNow);
    };
  }, [gameCode, loadGame, pendingActionId]);

  const setGameUrl = (code: string) => {
    setGameCode(code);
    router.push(`/game/${code}`);
  };

  const create = async (
    hostName: string,
    gameName: string,
    avatar: PlayerAvatar,
  ) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName, gameName, avatar }),
      });
      const body = (await response.json()) as {
        envelope?: GameEnvelope;
        credential?: PlayerCredential;
        error?: string;
      };
      if (!response.ok || !body.envelope || !body.credential) {
        throw new Error(body.error ?? "Unable to create the game.");
      }
      saveCredential(body.credential);
      setCredential(body.credential);
      setEnvelope(body.envelope);
      setGameUrl(body.credential.gameCode);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create game.");
    } finally {
      setBusy(false);
    }
  };

  const find = async (code: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await loadGame(code);
      if (!result || result === "unchanged") return;
      const normalized = code.toUpperCase();
      setEnvelope(result);
      setGameUrl(normalized);
      const stored = credentials()[normalized] ?? null;
      setCredential(stored);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Game not found.");
    } finally {
      setBusy(false);
    }
  };

  const join = async (displayName: string, avatar: PlayerAvatar) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/games/${gameCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, avatar }),
      });
      const body = (await response.json()) as {
        envelope?: GameEnvelope;
        credential?: PlayerCredential;
        error?: string;
      };
      if (!response.ok || !body.envelope || !body.credential) {
        throw new Error(body.error ?? "Unable to join the game.");
      }
      saveCredential(body.credential);
      setCredential(body.credential);
      setEnvelope(body.envelope);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to join game.");
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: GameAction) => {
    if (
      !credential ||
      !envelope ||
      pendingActionRef.current
    ) {
      return false;
    }
    const authoritativeEnvelope = envelope;
    const actionId = randomId();
    pendingActionRef.current = actionId;
    setPendingActionId(actionId);
    setError("");
    const optimisticEnvelope = predictGameAction(
      authoritativeEnvelope,
      credential.playerId,
      action,
    );
    if (optimisticEnvelope !== authoritativeEnvelope) {
      setEnvelope(optimisticEnvelope);
    }

    let retryDelay = 1_500;
    while (pendingActionRef.current === actionId) {
      try {
        const response = await fetch(`/api/games/${gameCode}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: credential.playerId,
            token: credential.token,
            actionId,
            expectedVersion: authoritativeEnvelope.game.version,
            action,
          }),
        });
        const body = (await response.json().catch(() => ({}))) as
          Partial<GameEnvelope> & {
            error?: string;
            code?: string;
          };
        if (!response.ok) {
          if (response.status === 409) {
            const fresh = await loadGame(gameCode);
            if (fresh && fresh !== "unchanged") setEnvelope(fresh);
          } else {
            setEnvelope(authoritativeEnvelope);
          }
          if (response.status === 401 || response.status === 403) {
            removeCredential(gameCode);
            setCredential(null);
          }
          throw new Error(body.error ?? "That action could not be completed.");
        }
        if (!body.game || !body.canvases || !body.serverTime) {
          setEnvelope(authoritativeEnvelope);
          throw new Error("The studio returned an incomplete update.");
        }
        setEnvelope(body as GameEnvelope);
        setConnected(true);
        pendingActionRef.current = null;
        setPendingActionId(null);
        return true;
      } catch (reason) {
        if (
          reason instanceof Error &&
          !/fetch|network|connection|load failed/i.test(reason.message)
        ) {
          setError(reason.message);
          pendingActionRef.current = null;
          setPendingActionId(null);
          return false;
        }
        setConnected(false);
        setError("Connection interrupted. Retrying this action…");
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, retryDelay);
        });
        retryDelay = Math.min(30_000, retryDelay * 2);
      }
    }
    return false;
  };

  const abandon = async () => {
    const code = gameCode;
    if (!(await act({ type: "ABANDON_GAME" }))) return;
    removeCredential(code);
    setGameCode("");
    setEnvelope(null);
    setCredential(null);
    router.replace("/");
    void loadRecentGames();
  };

  const currentCredential = useMemo(() => {
    if (!gameCode) return null;
    return credential ?? credentials()[gameCode] ?? null;
  }, [credential, gameCode]);
  const actionBusy = busy || pendingActionId !== null;

  if (!envelope || !currentCredential) {
    return (
      <Landing
        tutorialCanvases={tutorialCanvases}
        gameCode={gameCode}
        knownGame={envelope}
        recentGames={recentGames}
        busy={actionBusy}
        error={error}
        onCreate={create}
        onJoin={join}
        onFind={find}
      />
    );
  }
  if (
    !envelope.game.players.some(
      (player) => player.id === currentCredential.playerId,
    )
  ) {
    return (
      <main className="fatal-state">
        <h1>You were removed from this game.</h1>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            removeCredential(envelope.game.code);
            setGameCode("");
            setEnvelope(null);
            setCredential(null);
            router.replace("/");
            void loadRecentGames();
          }}
        >
          Return home
        </button>
      </main>
    );
  }
  if (envelope.game.status === "LOBBY") {
    return (
      <Lobby
        tutorialCanvases={tutorialCanvases}
        envelope={envelope}
        credential={currentCredential}
        busy={actionBusy}
        error={error}
        onAction={act}
        onAbandon={abandon}
      />
    );
  }
  return (
    <GameBoard
      tutorialCanvases={tutorialCanvases}
      envelope={envelope}
      credential={currentCredential}
      busy={actionBusy}
      error={error}
      connected={connected}
      onAction={act}
      onAbandon={abandon}
    />
  );
}
