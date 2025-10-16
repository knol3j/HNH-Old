const request = require('supertest');
const app = require('../../api/server'); // server exports the Express app

describe('Health Endpoint', () => {
  it('should return success true', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message', 'HashNHedge API is running');
  });
});

