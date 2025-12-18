import { GameSessionManager, StartGamePayload } from '../../../server/src/game';
import { GamePhase } from '../../../shared/types/game';
import type { PaintCube } from '../../../shared/types/paint';
import type { CanvasDefinition } from '../../../shared/types/canvas';
import type { LobbyPlayerView } from '../../../shared/types/lobby';

jest.mock('../../../server/src/db/sessionPersistence', () => ({
  persistGameMetadata: jest.fn(async () => undefined),
  persistPlayerMembership: jest.fn(async () => undefined)
}));

jest.mock('../../../server/src/db/canvases', () => ({
  fetchCanvasDefinitions: jest.fn(async (): Promise<CanvasDefinition[]> => [
    {
      id: 'db-canvas-1',
      title: 'Database Canvas 1',
      filename: 'assets/canvases/db-canvas-1.png',
      starValue: 2,
      paintValue: 2,
      foodValue: 1,
      squares: [
        { id: 'db-canvas-1-1', position: { x: 0, y: 0 }, allowedColors: ['red'] },
        { id: 'db-canvas-1-2', position: { x: 1, y: 0 }, allowedColors: ['blue'] }
      ]
    }
  ])
}));

const samplePaintBag = (): PaintCube[] => [
  { id: 'bag-1', color: 'red' },
  { id: 'bag-2', color: 'blue' }
];

const sampleCanvas = (id: string): CanvasDefinition => ({
  id,
  title: `Test Canvas ${id}`,
  filename: `assets/canvases/${id}.png`,
  starValue: 1,
  paintValue: 1,
  foodValue: 1,
  squares: [
    { id: `${id}-1`, position: { x: 0, y: 0 }, allowedColors: ['red'] },
    { id: `${id}-2`, position: { x: 1, y: 0 }, allowedColors: ['blue'] }
  ]
});

const createPayload = (): StartGamePayload => ({
  paintBag: samplePaintBag(),
  canvasDeck: [sampleCanvas('canvas-one')],
  initialPaintMarket: [],
  initialMarketSize: 1
});

describe('GameSessionManager', () => {
  let manager: GameSessionManager;
  beforeEach(() => {
    manager = new GameSessionManager();
  });

  it('can create a lobby and has the host as the first player', () => {
    const snapshot = manager.createSession({ id: 'host', displayName: 'Host' });
    expect(snapshot.hostId).toBe('host');
    expect(snapshot.players).toHaveLength(1);
  });

  it('rejects joins past the maximum capacity', () => {
    const { gameId } = manager.createSession({ id: 'host', displayName: 'Host' });
    for (const id of ['p1', 'p2', 'p3']) {
      manager.joinGame(gameId, { id, displayName: id });
    }
    expect(() => {
      manager.joinGame(gameId, { id: 'p4', displayName: 'Overflow' });
    }).toThrow(/lobby is full/i);
  });

  it('allows a player to reconnect through the same slot after leaving', () => {
    const { gameId } = manager.createSession({ id: 'host', displayName: 'Host' });
    manager.joinGame(gameId, { id: 'player', displayName: 'Player' });

    const afterLeave = manager.leaveGame(gameId, 'player');
    const leftPlayer = afterLeave.players.find((entry: LobbyPlayerView) => entry.id === 'player');
    expect(leftPlayer?.isConnected).toBe(false);

    const afterReconnect = manager.joinGame(gameId, { id: 'player', displayName: 'Player' });
    const reconnected = afterReconnect.players.find((entry: LobbyPlayerView) => entry.id === 'player');
    expect(reconnected?.isConnected).toBe(true);
  });

  it('starts the game only when the host requests it', async () => {
    const { gameId } = manager.createSession({ id: 'host', displayName: 'Host' });
    manager.joinGame(gameId, { id: 'player', displayName: 'Player' });

    await expect(manager.startGame(gameId, createPayload(), 'player')).rejects.toThrow(/host/i);

    const gameState = await manager.startGame(gameId, createPayload(), 'host');
    expect(gameState.phase).toBe(GamePhase.MORNING);
    expect(gameState.players).toHaveLength(2);
  });

  it('respects explicit canvas deck overrides', async () => {
    const { gameId } = manager.createSession({ id: 'host', displayName: 'Host' });
    manager.joinGame(gameId, { id: 'player', displayName: 'Player' });

    const overrideCanvas = sampleCanvas('override-canvas');
    const payload: StartGamePayload = {
      ...createPayload(),
      canvasDeckOverride: [overrideCanvas]
    };

    const state = await manager.startGame(gameId, payload, 'host');
    const firstSlot = state.canvasMarket.slots[0];
    expect(firstSlot.canvas.definition.id).toBe(overrideCanvas.id);
  });
});
