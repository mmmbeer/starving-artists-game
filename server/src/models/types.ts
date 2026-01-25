// Core type definitions
import { PaintColor } from '../utils/constants';

export { PaintColor };

export interface Game {
  id: string;
  status: 'lobby' | 'playing' | 'finished';
  host_player_id: string;
  current_phase: 'morning' | 'day' | 'night' | 'selling';
  current_player_id: string | null;
  day_number: number;
  turn_count: number;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
  winner_id: string | null;
  // Selling phase tracking
  selling_order?: string[]; // Player IDs in paint value order
  selling_current_index?: number;
  selling_remaining_cubes?: { [playerId: string]: number };
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  nutrition: number;
  score: number;
  paintings_completed: number;
  food_earned: number;
  turn_order: number;
  is_host: boolean;
  connected: boolean;
  last_seen: Date;
}

export interface PaintCube {
  id: string;
  color: PaintColor;
  is_wild: boolean;
}

export interface CanvasSquarePosition {
  x: number; // Pixel position
  y: number; // Pixel position
}

export interface CanvasSquare {
  id: string;
  position: CanvasSquarePosition;
  allowedColors: PaintColor[];
  paintedWith?: {
    cubeId: string;
    color: PaintColor;
  };
}

export interface CanvasLayoutJson {
  id?: string;
  orientation?: 'portrait' | 'landscape';
  squares: Array<{
    id: string;
    position: CanvasSquarePosition;
    allowedColors: PaintColor[];
  }>;
}

export interface CanvasDefinition {
  id: number;
  name: string;
  artist?: string;
  year?: string;
  layout_json: CanvasLayoutJson;
  star_value: number;
  paint_value: number;
  food_value: number;
  filename: string | null;
}

export interface PlayerCanvas {
  id: string;
  player_id: string;
  game_id: string;
  canvas_definition_id: number;
  painted_squares: Array<{
    squareId: string;
    cubeId: string;
    color: PaintColor;
  }>;
  completed: boolean;
  acquired_at: Date;
  completed_at: Date | null;
  // Populated from canvas_definitions join
  definition?: CanvasDefinition;
}

export interface GameState {
  game_id: string;
  paint_bag: PaintCube[];
  paint_market: PaintCube[];
  canvas_market: Array<CanvasDefinition | null>; // null = empty slot
  canvas_deck: number[]; // IDs of canvas_definitions
  actions_taken: number;
  // Selling phase state
  selling_phase_data?: SellingPhaseData;
}

export interface SellingPhaseData {
  order: Array<{
    playerId: string;
    paintValue: number;
    rank: 'first' | 'second' | 'other';
    cubesPerAction: number;
    remainingCubes: number;
    completedCanvasId?: string;
  }>;
  currentIndex: number;
  paintMarketAtStart: PaintCube[];
  isActive: boolean;
}

export interface GameAction {
  type: 'work' | 'buy_canvas' | 'paint' | 'end_turn' | 'sell' | 'collect_paint';
  playerId: string;
  data?: any;
}

export interface FullGameState {
  game: Game;
  players: Player[];
  gameState: GameState;
  playerCanvases: { [playerId: string]: PlayerCanvas[] };
  playerPaintCubes: { [playerId: string]: PaintCube[] };
}

// Admin types
export interface CanvasFileInfo {
  filename: string;
  artist: string;
  title: string;
  year: string | null;
  extension: string;
  fullPath: string;
  inDatabase: boolean;
  canvasId?: number;
  isUnfinished?: boolean;
}
