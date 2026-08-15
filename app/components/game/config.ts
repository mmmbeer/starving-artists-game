import type {
  CanvasDefinition,
  PaintColor,
  PlayerCredential,
  PlayerState,
} from "../../lib/types";
import {
  selectTutorialCanvases,
  TUTORIAL_CANVAS_IDS,
} from "../../lib/tutorial-canvases";

export const CREDENTIAL_KEY = "starving-artists-players";
export const MAX_STORED_CREDENTIALS = 12;

export const COLOR_LABELS: Record<PaintColor, string> = {
  red: "Red",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  black: "Black",
  wild: "Wild",
};

export const CUBE_IMAGES: Record<PaintColor, string> = {
  red: "/cubes/red.png",
  orange: "/cubes/orange.png",
  yellow: "/cubes/yellow.png",
  green: "/cubes/green.png",
  blue: "/cubes/blue.png",
  purple: "/cubes/purple.png",
  black: "/cubes/black.png",
  wild: "/cubes/clear.png",
};

export const DAY_PHASES = [
  { phase: "MORNING", label: "Morning", detail: "First actions" },
  { phase: "AFTERNOON", label: "Afternoon", detail: "Second actions" },
  { phase: "SELLING", label: "Evening", detail: "Sell actions" },
] as const;

export type ActionPanel =
  | "none"
  | "buy"
  | "trade"
  | "paint"
  | "sale"
  | "collect";

export type CanvasPreviewAction =
  | { kind: "buy"; slotIndex: number }
  | { kind: "sale"; canvasInstanceId: string };

export type PendingPaintPlacement = {
  canvasInstanceId: string;
  squareId: string;
  cubeId: string;
};

export type MuseumArtwork = Pick<
  CanvasDefinition,
  "id" | "title" | "artist" | "year" | "image" | "aspectRatio"
>;

export type MuseumSlot = {
  artIndex: number;
  phase: "resting" | "departing" | "arriving";
  placement: MuseumPlacement;
};

export type MuseumPlacement = {
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

export type MuseumCrop = {
  aspectRatio: number;
  imageWidth: number;
  imageHeight: number;
  imageLeft: number;
  imageTop: number;
};

export type RecentGame = {
  code: string;
  name: string;
  status: "LOBBY" | "ACTIVE";
  day: number;
  updatedAt: string;
  player: PlayerState;
  isHost: boolean;
};

export const MUSEUM_FALLBACK_ART: MuseumArtwork[] = [
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

export const TUTORIAL_CANVASES_FALLBACK: CanvasDefinition[] = [
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

export function resolveTutorialCanvases(
  canvases: CanvasDefinition[],
): CanvasDefinition[] {
  const selected = new Map(
    selectTutorialCanvases(canvases).map((canvas) => [canvas.id, canvas]),
  );
  return TUTORIAL_CANVAS_IDS.map(
    (id, index) => selected.get(id) ?? TUTORIAL_CANVASES_FALLBACK[index],
  );
}

export const TUTORIAL_PAGES = [
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
      "Buy a canvas, paint, or pass. One action finishes your turn.",
      "You may also trade with the Paint Market once per day as a free action.",
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
      "Once per day, give cubes from your studio to the shared Paint Market and take the exact colors you need without spending an action.",
    bullets: [
      "Trade at any time during Morning or Afternoon, even when another artist is taking their turn.",
      "Give 2 cubes to take 1.",
      "Give 5 cubes to take 2.",
      "Or give 9 cubes to take 3.",
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

export const MUSEUM_DEFAULT_PLACEMENTS: MuseumPlacement[] = [
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

export function credentials(): Record<string, PlayerCredential> {
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

export function saveCredential(credential: PlayerCredential) {
  const stored = credentials();
  stored[credential.gameCode] = credential;
  const bounded = Object.fromEntries(
    Object.entries(stored).slice(-MAX_STORED_CREDENTIALS),
  );
  localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(bounded));
}

export function removeCredential(gameCode: string) {
  const stored = credentials();
  delete stored[gameCode.toUpperCase()];
  localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(stored));
}

export function randomId() {
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

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}



