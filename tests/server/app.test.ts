import request from 'supertest';
import { createApp } from '../../server/src/app';

describe('server application', () => {
  it('answers health checks', async () => {
    const app = createApp();
    await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200, { status: 'ok' });
  });
});
