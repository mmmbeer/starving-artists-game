import type { PaintCube } from '../../../shared/types/paint';
import type { CanvasDefinition } from '../../../shared/types/canvas';
import { gameReducer } from '../../../server/src/game';
import type { GameState } from '../../../server/src/types';
import type { ActionResult, GameAction } from '../../../server/src/game/actions';

const createCanvasDefinition = (id: string, allowedSets: string[][]): CanvasDefinition => ({
  id,
  title: `Canvas ${id}`,
  starValue: 1,
  paintValue: 1,
  foodValue: 1,
  squares: allowedSets.map((allowed, index) => ({
    id: `${id}-square-${index}`,
    position: { x: index, y: 0 },
    allowedColors: [...allowed] as PaintCube['color'][]
  }))
});

const createCanvasDefinitions = (): CanvasDefinition[] => [
  createCanvasDefinition('canvas-1', [['red'], ['blue']]),
  createCanvasDefinition('canvas-2', [['orange'], ['green']])
];

const createPaintCube = (id: string, color: PaintCube['color']): PaintCube => ({ id, color });

const createPaintBag = (): PaintCube[] => [
  createPaintCube('bag-red', 'red'),
  createPaintCube('bag-blue', 'blue'),
  createPaintCube('bag-green', 'green'),
  createPaintCube('bag-black', 'black')
];

const createPlayers = () => [
  {
    id: 'player-1',
    displayName: 'Alice',
    order: 1,
    studioCubes: [
      createPaintCube('p1-orange', 'orange'),
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

const buildInitializeAction = (): GameAction => ({
  type: 'INITIALIZE_GAME',
  payload: {
    gameId: 'game-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    players: createPlayers(),
    turnOrder: ['player-1', 'player-2'],
    paintBag: createPaintBag(),
    canvasDeck: createCanvasDefinitions(),
    initialPaintMarket: [],
    initialMarketSize: 2
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
    throw new Error('Expected action to be rejected');
  }
  return result.error;
};

const initializeGame = (): GameState => assertSuccess(gameReducer(undefined, buildInitializeAction()));

const advanceToMorning = (state: GameState, timestamp = '2024-01-01T00:01:00.000Z'): GameState =>
  assertSuccess(gameReducer(state, { type: 'ADVANCE_PHASE', meta: { timestamp } }));

const applyAction = (state: GameState, action: GameAction): GameState => assertSuccess(gameReducer(state, action));

const endPlayerTurn = (state: GameState, playerId: string, timestamp: string): GameState =>
  applyAction(state, { type: 'END_TURN', payload: { playerId }, meta: { timestamp } });

const findCubeId = (state: GameState, color: PaintCube['color'], exclude: string[] = []) => {
  const cube = state.players[0].studio.paintCubes.find((entry) => entry.color === color && !exclude.includes(entry.id));
  if (!cube) {
    throw new Error(`Cube ${color} not found`);
  }
  return cube.id;
};

describe('paint placement validation', () => {
  it('rejects cubes that do not match the square', () => {
    const initialized = advanceToMorning(initializeGame());
    const afterBuy = applyAction(initialized, {
      type: 'BUY_CANVAS',
      payload: { playerId: 'player-1', slotIndex: 0 },
      meta: { timestamp: '2024-01-01T00:02:00.000Z' }
    });

    const readyForPaint = endPlayerTurn(afterBuy, 'player-2', '2024-01-01T00:02:30.000Z');
    const canvas = readyForPaint.players[0].studio.canvases[0];
    const squareId = canvas.definition.squares[0].id;

    const mismatchCubeId = findCubeId(readyForPaint, 'blue');
    const error = assertError(
      gameReducer(readyForPaint, {
        type: 'APPLY_PAINT_TO_CANVAS',
        payload: {
          playerId: 'player-1',
          canvasId: canvas.id,
          squareId,
          cubeId: mismatchCubeId
        }
      })
    );

    expect(error.message).toMatch(/square requirements/i);
  });

  it('rejects applying two cubes to the same square', () => {
    const initialized = advanceToMorning(initializeGame());
    const afterBuy = applyAction(initialized, {
      type: 'BUY_CANVAS',
      payload: { playerId: 'player-1', slotIndex: 0 },
      meta: { timestamp: '2024-01-01T00:03:00.000Z' }
    });

    let currentState = endPlayerTurn(afterBuy, 'player-2', '2024-01-01T00:03:30.000Z');
    const canvas = currentState.players[0].studio.canvases[0];
    const squareId = canvas.definition.squares[0].id;

    const firstMatchingCube = findCubeId(currentState, 'red');
    currentState = applyAction(currentState, {
      type: 'APPLY_PAINT_TO_CANVAS',
      payload: {
        playerId: 'player-1',
        canvasId: canvas.id,
        squareId,
        cubeId: firstMatchingCube
      },
      meta: { timestamp: '2024-01-01T00:04:00.000Z' }
    });

    const playerIndex = currentState.turn.order.findIndex((id) => id === 'player-1');
    const primedState = {
      ...currentState,
      turn: {
        ...currentState.turn,
        currentPlayerIndex: playerIndex,
        actionsTakenThisPhase: Math.max(0, currentState.turn.actionsTakenThisPhase - 1)
      },
      currentPlayerIndex: playerIndex
    };

    const duplicateCube = findCubeId(primedState, 'blue');
    const error = assertError(
      gameReducer(primedState, {
        type: 'APPLY_PAINT_TO_CANVAS',
        payload: {
          playerId: 'player-1',
          canvasId: canvas.id,
          squareId,
          cubeId: duplicateCube
        }
      })
    );

    expect(error.message).toMatch(/already has a cube/i);
  });

  it('enforces the one wild cube per canvas rule', () => {
    const initialized = advanceToMorning(initializeGame());
    const afterBuy = applyAction(initialized, {
      type: 'BUY_CANVAS',
      payload: { playerId: 'player-1', slotIndex: 0 },
      meta: { timestamp: '2024-01-01T00:05:00.000Z' }
    });

    const canvas = afterBuy.players[0].studio.canvases[0];
    const firstSquare = canvas.definition.squares[0].id;
    const secondSquare = canvas.definition.squares[1].id;
    const playerIndex = afterBuy.turn.order.findIndex((id) => id === 'player-1');

    const stateWithWild: GameState = {
      ...afterBuy,
      phase: afterBuy.phase,
      turn: {
        ...afterBuy.turn,
        currentPlayerIndex: playerIndex,
        actionsTakenThisPhase: 0
      },
      currentPlayerIndex: playerIndex,
      players: afterBuy.players.map((player) => {
        if (player.id !== 'player-1') {
          return player;
        }
        return {
          ...player,
          studio: {
            ...player.studio,
            paintCubes: player.studio.paintCubes.filter((cube) => cube.id !== 'p1-wild-1'),
            canvases: player.studio.canvases.map((entry) =>
              entry.id === canvas.id
                ? {
                    ...entry,
                    placedCubes: {
                      ...entry.placedCubes,
                      [firstSquare]: { id: 'p1-wild-1', color: 'wild' }
                    }
                  }
                : entry
            )
          }
        };
      })
    };

    const secondWildCube = findCubeId(stateWithWild, 'wild');
    const error = assertError(
      gameReducer(stateWithWild, {
        type: 'APPLY_PAINT_TO_CANVAS',
        payload: {
          playerId: 'player-1',
          canvasId: canvas.id,
          squareId: secondSquare,
          cubeId: secondWildCube
        }
      })
    );

    expect(error.message).toMatch(/wild cube/i);
  });

  it('rejects placement when it is not the players turn', () => {
    const initialized = advanceToMorning(initializeGame());
    const afterBuy = applyAction(initialized, {
      type: 'BUY_CANVAS',
      payload: { playerId: 'player-1', slotIndex: 0 },
      meta: { timestamp: '2024-01-01T00:07:00.000Z' }
    });

    const canvas = afterBuy.players[0].studio.canvases[0];
    const squareId = canvas.definition.squares[0].id;
    const paintCube = findCubeId(afterBuy, 'red');

    const error = assertError(
      gameReducer(afterBuy, {
        type: 'APPLY_PAINT_TO_CANVAS',
        payload: {
          playerId: 'player-1',
          canvasId: canvas.id,
          squareId,
          cubeId: paintCube
        }
      })
    );

    expect(error.message).toMatch(/may not act now/i);
  });
});
