// Game constants

export const PAINT_COLORS = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'black',
  'wild',
] as const;

export type PaintColor = (typeof PAINT_COLORS)[number];

export const GAME_PHASES = {
  MORNING: 'morning',
  DAY: 'day',
  NIGHT: 'night',
  SELLING: 'selling',
} as const;

export const GAME_STATUS = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  FINISHED: 'finished',
} as const;

export const INITIAL_NUTRITION = 5;
export const STARTING_PAINT_CUBES_PER_PLAYER = 6;
export const CUBES_PER_WORK_ACTION = 3;
export const CANVAS_MARKET_SIZE = 3;
export const INITIAL_PAINT_MARKET_SIZE = 4;
export const PAINT_MARKET_REFILL_SIZE = 4;
export const MAX_PAINT_CUBES_PER_ACTION = 4;

export const WIN_CONDITIONS = {
  2: { paintings: 7, points: 16 },
  3: { paintings: 6, points: 14 },
  4: { paintings: 5, points: 12 },
};

export const CANVAS_MARKET_COSTS = [1, 2, 3]; // Cost in paint cubes by position

export const PAINT_TRADE_RATES = {
  TWO_FOR_ONE: 2,
  FIVE_FOR_TWO: 5,
  NINE_FOR_THREE: 9,
};

export const SELLING_PAINT_PAYOUT = {
  FIRST: 4,
  SECOND: 2,
  OTHER: 1,
};
