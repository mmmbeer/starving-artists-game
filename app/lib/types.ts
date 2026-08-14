export const PAINT_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "black",
  "wild",
] as const;

export type PaintColor = (typeof PAINT_COLORS)[number];

export interface CanvasSquare {
  id: string;
  x: number;
  y: number;
  allowedColors: PaintColor[];
  shape: "square" | "diamond";
}

export interface CanvasDefinition {
  id: string;
  title: string;
  artist: string;
  year: string;
  image: string;
  aspectRatio: number;
  starValue: number;
  paintValue: number;
  foodValue: number;
  squares: CanvasSquare[];
}

export interface PaintCube {
  id: string;
  color: PaintColor;
}

export interface OwnedCanvas {
  instanceId: string;
  definitionId: string;
  placedCubes: Record<string, PaintCube>;
}

export const PLAYER_AVATAR_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
] as const;

export type PlayerAvatarColor = (typeof PLAYER_AVATAR_COLORS)[number];

export interface PlayerAvatar {
  color: PlayerAvatarColor;
  icon: string;
}

export interface PlayerState {
  id: string;
  displayName: string;
  avatar?: PlayerAvatar;
  order: number;
  nutrition: number;
  score: number;
  studioCubes: PaintCube[];
  canvases: OwnedCanvas[];
  soldCanvasCount: number;
  starved: boolean;
  /** The game day on which this artist used their free Paint Market trade. */
  lastMarketTradeDay?: number | null;
}

export type GamePhase =
  | "LOBBY"
  | "MORNING"
  | "AFTERNOON"
  | "SELLING"
  | "ENDED";

export interface SellingResolution {
  stage: "DECLARATIONS" | "COLLECTION";
  declarations: Record<string, string[]>;
  quotas: Record<string, number>;
  pickSizes: Record<string, number>;
  order: string[];
  currentIndex: number;
}

export interface GameLogEntry {
  id: string;
  at: string;
  text: string;
  tone?: "neutral" | "good" | "warning";
}

export interface GameState {
  id: string;
  code: string;
  name: string;
  status: "LOBBY" | "ACTIVE" | "ENDED" | "ABANDONED";
  phase: GamePhase;
  version: number;
  hostPlayerId: string;
  maxPlayers: number;
  players: PlayerState[];
  day: number;
  firstPlayerId: string | null;
  turnOrder: string[];
  currentTurnIndex: number;
  paintBag: PaintCube[];
  paintMarket: PaintCube[];
  canvasDeck: string[];
  canvasMarket: string[];
  selling: SellingResolution | null;
  starvationFinalDay: number | null;
  winnerIds: string[];
  randomState: number;
  log: GameLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export type GameAction =
  | { type: "START_GAME" }
  | { type: "ABANDON_GAME" }
  | { type: "KICK_PLAYER"; playerId: string }
  | { type: "WORK" }
  | {
      type: "BUY_CANVAS";
      slotIndex: number;
      paymentCubeIds: string[];
    }
  | {
      type: "PAINT";
      placements: Array<{
        canvasInstanceId: string;
        squareId: string;
        cubeId: string;
      }>;
    }
  | {
      type: "TRADE_MARKET";
      giveCubeIds: string[];
      takeCubeIds: string[];
    }
  | { type: "PASS" }
  | { type: "DECLARE_SALES"; canvasInstanceIds: string[] }
  | { type: "COLLECT_PAINT"; cubeIds: string[] };

export interface PlayerCredential {
  gameCode: string;
  playerId: string;
  token: string;
}

export interface GameEnvelope {
  game: GameState;
  canvases: Record<string, CanvasDefinition>;
  serverTime: string;
}
