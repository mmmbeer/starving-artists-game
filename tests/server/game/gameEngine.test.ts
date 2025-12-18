import { GamePhase, PaintColor } from '../../../shared/types/game';
import type { PaintCube } from '../../../shared/types/paint';
import type { CanvasDefinition } from '../../../shared/types/canvas';
import { gameReducer } from '../../../server/src/game';
import type { GameState } from '../../../server/src/types';
import { isCanvasComplete } from '../../../server/src/game/utils';
import type { ActionResult, GameAction } from '../../../server/src/game/actions';

const createCanvasDefinition = (id: string, allowedColorSets: PaintColor[][]): CanvasDefinition => ({
  id,
  title: `Canvas ${id}`,
  starValue: 1,
  paintValue: 1,
  foodValue: 1,
  squares: allowedColorSets.map((allowed, index) => ({
    id: `${id}-square-${index}`,
    position: { x: index, y: 0 },
    allowedColors: [...allowed]
  }))
});

const createCanvasDefinitions = (): CanvasDefinition[] => [
  createCanvasDefinition('canvas-1', [['red'], ['blue']]),
  createCanvasDefinition('canvas-2', [['orange'], ['green']]),
  createCanvasDefinition('canvas-3', [['purple'], ['black']]),
  createCanvasDefinition('canvas-4', [['yellow'], ['blue', 'green']])
];

const createPaintCube = (id: string, color: PaintColor): PaintCube => ({ id, color });

const createPaintBag = (): PaintCube[] => [
  createPaintCube('bag-red', 'red'),
  createPaintCube('bag-blue', 'blue'),
  createPaintCube('bag-green', 'green'),
  createPaintCube('bag-orange', 'orange'),
  createPaintCube('bag-purple', 'purple'),
  createPaintCube('bag-black', 'black')
];

const createPlayers = () => [
  {
    id: 'player-1',
    displayName: 'Alice',
    order: 1,
    studioCubes: [
      createPaintCube('p1-red', 'red'),
      createPaintCube('p1-blue', 'blue'),
      createPaintCube('p1-wild-1', 'wild'),
      createPaintCube('p1-wild-2', 'wild')
    ]
  },
  {
    id: 'player-2',
    displayName: 'Bob',
    order: 2,
    studioCubes: [createPaintCube('p2-orange', 'orange')]
  }
];

const buildInitializeAction = (options?: { paintBag?: PaintCube[] }): GameAction => ({
  type: 'INITIALIZE_GAME',
  payload: {
    gameId: 'game-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    players: createPlayers(),
    turnOrder: ['player-1', 'player-2'],
    paintBag: options?.paintBag ?? createPaintBag(),
    canvasDeck: createCanvasDefinitions(),
    initialPaintMarket: [],
    initialMarketSize: 3
  }
});

const assertSuccess = (result: ActionResult): GameState => {
  if ('error' in result) {
    throw new Error(result.error.message);
  }
  return result.nextState;
};

const assertError = (result: ActionResult) => {
  if ('nextState' in result) {
    throw new Error('Expected error result');
  }
  return result.error;
};

const initializeGame = (options?: { paintBag?: PaintCube[] }): GameState =>
  assertSuccess(gameReducer(undefined, buildInitializeAction(options)));

const advanceToMorning = (state: GameState, timestamp = '2024-01-01T00:01:00.000Z'): GameState => {
  return assertSuccess(gameReducer(state, { type: 'ADVANCE_PHASE', meta: { timestamp } }));
};

const applyAction = (state: GameState, action: GameAction): GameState => {
  return assertSuccess(gameReducer(state, action));
};

const advancePhase = (state: GameState, timestamp: string): GameState =>
  assertSuccess(gameReducer(state, { type: 'ADVANCE_PHASE', meta: { timestamp } }));

describe('game reducer fundamentals', () => {
  it('initializes a canonical game state', () => {
    const state = initializeGame();
    expect(state.phase).toBe(GamePhase.LOBBY);
    expect(state.players).toHaveLength(2);
    expect(state.canvasMarket.slots).toHaveLength(3);
    expect(state.paintBag).toHaveLength(createPaintBag().length);
  });

  it('draws cubes deterministically and advances the turn', () => {
    const initialState = advanceToMorning(initializeGame());
    const action: GameAction = {
      type: 'DRAW_PAINT_CUBES',
      payload: { playerId: 'player-1', count: 2 },
      meta: { timestamp: '2024-01-01T00:02:00.000Z' }
    };
    const nextState = applyAction(initialState, action);
    expect(nextState.players[0].studio.paintCubes).toHaveLength(6);
    expect(nextState.paintBag).toHaveLength(createPaintBag().length - 2);
    expect(nextState.currentPlayerIndex).toBe(1);
  });

  it('rejects drawing more cubes than remain in the bag', () => {
    const tinyBag = [createPaintCube('bag-only', 'red')];
    const initialState = advanceToMorning(initializeGame({ paintBag: tinyBag }));
    const errorResult = assertError(
      gameReducer(initialState, {
        type: 'DRAW_PAINT_CUBES',
        payload: { playerId: 'player-1', count: 2 }
      })
    );
    expect(errorResult.message).toMatch(/not enough cubes/i);
  });

  it('rejects applying a cube that does not match the square', () => {
    const initialState = advanceToMorning(initializeGame());
    const postPurchase = applyAction(initialState, {
      type: 'BUY_CANVAS',
      payload: { playerId: 'player-1', slotIndex: 0 },
      meta: { timestamp: '2024-01-01T00:03:00.000Z' }
    });
    const canvas = postPurchase.players[0].studio.canvases[0];
    const wrongSquareId = canvas.definition.squares[0].id;
    const errorResult = assertError(
      gameReducer(postPurchase, {
        type: 'APPLY_PAINT_TO_CANVAS',
        payload: {
          playerId: 'player-1',
          canvasId: canvas.id,
          squareId: wrongSquareId,
          cubeId: 'p1-blue'
        }
      })
    );
    expect(errorResult.message).toMatch(/does not match square requirements/);
  });

  it('enforces one wild cube per canvas', () => {
    const initialState = advanceToMorning(initializeGame());
    const afterBuy = applyAction(initialState, {
      type: 'BUY_CANVAS',
      payload: { playerId: 'player-1', slotIndex: 0 },
      meta: { timestamp: '2024-01-01T00:04:00.000Z' }
    });
    const canvas = afterBuy.players[0].studio.canvases[0];
    const targetSquareId = canvas.definition.squares[0].id;
    const firstWild = applyAction(afterBuy, {
      type: 'APPLY_PAINT_TO_CANVAS',
      payload: {
        playerId: 'player-1',
        canvasId: canvas.id,
        squareId: targetSquareId,
        cubeId: 'p1-wild-1'
      },
      meta: { timestamp: '2024-01-01T00:05:00.000Z' }
    });
    const secondSquareId = canvas.definition.squares[1].id;
    const errorResult = assertError(
      gameReducer(firstWild, {
        type: 'APPLY_PAINT_TO_CANVAS',
        payload: {
          playerId: 'player-1',
          canvasId: canvas.id,
          squareId: secondSquareId,
          cubeId: 'p1-wild-2'
        }
      })
    );
    expect(errorResult.message).toMatch(/wild cube/i);
  });

  it('does not mutate the previous state when applying actions', () => {
    const initialState = advanceToMorning(initializeGame());
    const snapshot = JSON.stringify(initialState);
    const action: GameAction = {
      type: 'DRAW_PAINT_CUBES',
      payload: { playerId: 'player-1', count: 1 },
      meta: { timestamp: '2024-01-01T00:06:00.000Z' }
    };
    const nextState = assertSuccess(gameReducer(initialState, action));
    expect(JSON.stringify(initialState)).toBe(snapshot);
    expect(nextState).not.toBe(initialState);
  });

  it('rejects buying canvases during the lobby phase', () => {
    const state = initializeGame();
    const errorResult = assertError(
      gameReducer(state, {
        type: 'BUY_CANVAS',
        payload: { playerId: 'player-1', slotIndex: 0 }
      })
    );
    expect(errorResult.message).toMatch(/outside of action phases/);
  });

  it('draws cubes in golden deterministic order', () => {
    const orderedBag = [
      createPaintCube('bag-1', 'red'),
      createPaintCube('bag-2', 'blue'),
      createPaintCube('bag-3', 'green')
    ];
    const initialState = advanceToMorning(initializeGame({ paintBag: orderedBag }));
    const nextState = applyAction(initialState, {
      type: 'DRAW_PAINT_CUBES',
      payload: { playerId: 'player-1', count: 2 },
      meta: { timestamp: '2024-01-01T00:07:00.000Z' }
    });
    expect(nextState.players[0].studio.paintCubes.slice(-2).map((cube) => cube.id)).toEqual(['bag-1', 'bag-2']);
    expect(nextState.paintBag.map((cube) => cube.id)).toEqual(['bag-3']);
  });

  it('requires completed canvases before declaring sell intent', () => {
    const initialState = advanceToMorning(initializeGame());
    const postBuy = applyAction(initialState, {
      type: 'BUY_CANVAS',
      payload: { playerId: 'player-1', slotIndex: 0 },
      meta: { timestamp: '2024-01-01T00:08:00.000Z' }
    });
    const canvas = postBuy.players[0].studio.canvases[0];
    const targetSquareId = canvas.definition.squares[0].id;
    const secondarySquareId = canvas.definition.squares[1].id;

    const sellingPhase = advancePhase(
      advancePhase(postBuy, '2024-01-01T00:08:30.000Z'),
      '2024-01-01T00:08:40.000Z'
    );
    const beforeError = assertError(
      gameReducer(sellingPhase, {
        type: 'DECLARE_SELL_INTENT',
        payload: { playerId: 'player-1', canvasIds: [canvas.id] }
      })
    );
    expect(beforeError.message).toMatch(/not yet complete/);

    const filledOnce = applyAction(postBuy, {
      type: 'APPLY_PAINT_TO_CANVAS',
      payload: {
        playerId: 'player-1',
        canvasId: canvas.id,
        squareId: secondarySquareId,
        cubeId: 'p1-blue'
      },
      meta: { timestamp: '2024-01-01T00:09:00.000Z' }
    });
    const filledAll = applyAction(filledOnce, {
      type: 'APPLY_PAINT_TO_CANVAS',
      payload: {
        playerId: 'player-1',
        canvasId: canvas.id,
        squareId: targetSquareId,
        cubeId: 'p1-wild-1'
      },
      meta: { timestamp: '2024-01-01T00:10:00.000Z' }
    });

    expect(isCanvasComplete(filledAll.players[0].studio.canvases[0])).toBe(true);

    const sellingAfterComplete = advancePhase(
      advancePhase(filledAll, '2024-01-01T00:09:30.000Z'),
      '2024-01-01T00:09:40.000Z'
    );
    const sellIntentState = applyAction(sellingAfterComplete, {
      type: 'DECLARE_SELL_INTENT',
      payload: { playerId: 'player-1', canvasIds: [canvas.id] },
      meta: { timestamp: '2024-01-01T00:11:00.000Z' }
    });
    expect(sellIntentState.sellIntents['player-1']).toContain(canvas.id);
  });
});
