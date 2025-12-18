import request from 'supertest';
import { createApp } from '../../../server/src/app';
import type { CanvasDefinition } from '../../../shared/types/canvas';
import type { PaintCube } from '../../../shared/types/paint';
import type { LobbySnapshot } from '../../../shared/types/lobby';
import { GamePhase } from '../../../shared/types/game';
import type { GameState } from '../../../shared/types/game';

jest.mock('../../../server/src/db/sessionPersistence', () => ({
  persistGameMetadata: jest.fn(async () => undefined),
  persistPlayerMembership: jest.fn(async () => undefined)
}));

jest.mock('../../../server/src/db/canvases', () => ({
  fetchCanvasDefinitions: jest.fn(async (): Promise<CanvasDefinition[]> => [
    {
      id: 'db-canvas-1',
      title: 'DB Canvas 1',
      starValue: 1,
      paintValue: 1,
      foodValue: 1,
      squares: [
        { id: 'db-canvas-1-1', position: { x: 0, y: 0 }, allowedColors: ['red'] },
        { id: 'db-canvas-1-2', position: { x: 1, y: 0 }, allowedColors: ['blue'] }
      ]
    }
  ])
}));

const samplePaintBag = (): PaintCube[] => [
  { id: 'bag-red', color: 'red' },
  { id: 'bag-blue', color: 'blue' },
  { id: 'bag-green', color: 'green' }
];

describe('Lobby lifecycle routes', () => {
  it('creates a lobby and exposes the host player with a join link', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/lobby/create')
      .send({ playerId: 'host', displayName: 'Host' })
      .expect(201);

    const lobby = response.body.lobby as LobbySnapshot;
    expect(lobby.hostId).toBe('host');
    expect(lobby.players).toHaveLength(1);
    expect(lobby.joinLink).toBe(`/lobby/${lobby.gameId}`);
    expect(lobby.readiness.playerCount).toBe(1);
  });

  it('allows players to join until capacity is reached and handles reconnects gracefully', async () => {
    const app = createApp();
    const { gameId } = (await request(app)
      .post('/lobby/create')
      .send({ playerId: 'host', displayName: 'Host' })).body.lobby;

    const playersToAdd = ['alice', 'bob', 'carol'];
    for (let index = 0; index < playersToAdd.length; index += 1) {
      const id = playersToAdd[index];
      const joinResponse = await request(app)
        .post(`/lobby/${gameId}/join`)
        .send({ playerId: id, displayName: id })
        .expect(200);

      const lobby = joinResponse.body.lobby as LobbySnapshot;
      expect(lobby.players).toHaveLength(Math.min(1 + index + 1, 4));
    }

    // Attempt to rejoin an existing player without increasing the roster
    const reconnectResponse = await request(app)
      .post(`/lobby/${gameId}/join`)
      .send({ playerId: 'bob', displayName: 'Bob New' })
      .expect(200);
    const reconnectLobby = reconnectResponse.body.lobby as LobbySnapshot;
    expect(reconnectLobby.players).toHaveLength(4);
    expect(reconnectLobby.players.find((player) => player.id === 'bob')?.displayName).toBe('Bob New');

    const overCapacityResponse = await request(app)
      .post(`/lobby/${gameId}/join`)
      .send({ playerId: 'dan', displayName: 'Dan' })
      .expect(400);
    expect(overCapacityResponse.body.error).toMatch(/lobby is full/i);
  });

  it('marks a player disconnected and allows reconnection through the same slot', async () => {
    const app = createApp();
    const { gameId } = (await request(app)
      .post('/lobby/create')
      .send({ playerId: 'host', displayName: 'Host' })).body.lobby;

    await request(app).post(`/lobby/${gameId}/join`).send({ playerId: 'friend', displayName: 'Friend' }).expect(200);

    const leaveResponse = await request(app)
      .post(`/lobby/${gameId}/leave`)
      .send({ playerId: 'friend' })
      .expect(200);
    const afterLeaveLobby = leaveResponse.body.lobby as LobbySnapshot;
    expect(afterLeaveLobby.players.find((player) => player.id === 'friend')?.isConnected).toBe(false);

    const rejoinResponse = await request(app)
      .post(`/lobby/${gameId}/join`)
      .send({ playerId: 'friend', displayName: 'Friend' })
      .expect(200);
    const afterRejoinLobby = rejoinResponse.body.lobby as LobbySnapshot;
    expect(afterRejoinLobby.players.find((player) => player.id === 'friend')?.isConnected).toBe(true);
  });

  it('starts the game only for the host and advances into the morning phase', async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post('/lobby/create')
      .send({ playerId: 'host', displayName: 'Host' })
      .expect(201);

    const { gameId } = createResponse.body.lobby as LobbySnapshot;
    await request(app).post(`/lobby/${gameId}/join`).send({ playerId: 'player-1', displayName: 'Player One' }).expect(200);

    // Unauthorized start attempt
    await request(app)
      .post(`/lobby/${gameId}/start`)
      .send({
        playerId: 'player-1',
        paintBag: samplePaintBag(),
        initialPaintMarket: [],
        initialMarketSize: 1
      })
      .expect(403);

    // Proper host start
    const startResponse = await request(app)
      .post(`/lobby/${gameId}/start`)
      .send({
        playerId: 'host',
        paintBag: samplePaintBag(),
        initialPaintMarket: [],
        initialMarketSize: 1
      })
      .expect(200);

    const gameState = startResponse.body.gameState as GameState;
    expect(gameState.phase).toBe(GamePhase.MORNING);
  });
});
