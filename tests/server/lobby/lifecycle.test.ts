import request from 'supertest';
import { createApp } from '../../../server/src/app';
import { PaintColor } from '../../../shared/types/game';
import type { CanvasDefinition } from '../../../shared/types/canvas';
import type { PaintCube } from '../../../shared/types/paint';

const createCanvasDefinition = (id: string, allowedColors: PaintColor[][]): CanvasDefinition => ({
  id,
  title: `Canvas ${id}`,
  starValue: 1,
  paintValue: 1,
  foodValue: 1,
  squares: allowedColors.map((allowed, index) => ({
    id: `${id}-square-${index}`,
    position: { x: index, y: 0 },
    allowedColors: [...allowed]
  }))
});

const createPaintBag = (): PaintCube[] => [
  { id: 'bag-red', color: 'red' },
  { id: 'bag-blue', color: 'blue' },
  { id: 'bag-green', color: 'green' }
];

describe('lobby lifecycle integrating reducer', () => {
  it('starts a game via reducer and allows phase advancements', async () => {
    const app = createApp();
    const createResponse = await request(app).post('/lobby/create').send();
    const gameId = createResponse.body.id;

    await request(app)
      .post(`/lobby/${gameId}/join`)
      .send({ playerId: 'player-1', displayName: 'Alice' })
      .expect(200);

    await request(app)
      .post(`/lobby/${gameId}/join`)
      .send({ playerId: 'player-2', displayName: 'Bob' })
      .expect(200);

    const startResponse = await request(app)
      .post(`/lobby/${gameId}/start`)
      .send({
        paintBag: createPaintBag(),
        canvasDeck: [
          createCanvasDefinition('canvas-a', [['red'], ['blue']]),
          createCanvasDefinition('canvas-b', [['orange'], ['green']])
        ],
        initialPaintMarket: [{ id: 'market-blue', color: 'blue' }],
        initialMarketSize: 2,
        turnOrder: ['player-2', 'player-1'],
        firstPlayerId: 'player-2'
      })
      .expect(200);

    expect(startResponse.body.phase).toBe('LOBBY');
    expect(startResponse.body.players).toHaveLength(2);
    expect(startResponse.body.canvasMarket.slots).toHaveLength(2);
    expect(startResponse.body.paintBag).toHaveLength(createPaintBag().length);

    const advanceResponse = await request(app)
      .post(`/lobby/${gameId}/advance-phase`)
      .send({ targetPhase: 'MORNING' })
      .expect(200);

    expect(advanceResponse.body.phase).toBe('MORNING');
    expect(advanceResponse.body.turn.currentPlayerIndex).toBe(0);
  });
});
