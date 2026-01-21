// Core type definitions
import { PaintColor } from '../utils/constants';

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

export interface CanvasSquare {
  id: string;
  x: number;
  y: number;
  allowedColors: PaintColor[];
  paintedWith?: {
    cubeId: string;
    color: PaintColor;
  };
}

export interface CanvasDefinition {
  id: number;
  name: string;
  layout_json: {
    squares: Omit<CanvasSquare, 'paintedWith'>[];
  };
  star_value: number;
  paint_value: number;
  food_value: number;
  image_filename: string | null;
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
}

export interface GameAction {
  type: 'work' | 'buy_canvas' | 'paint' | 'end_turn' | 'sell';
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
