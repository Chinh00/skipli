import request from 'supertest';
import app from '../src/app';
import { db, admin } from '../src/config/firebase';
import * as jwt from 'jsonwebtoken';

jest.mock('../src/config/firebase', () => ({
  db: undefined,
  admin: undefined
}));

describe('Board Controller with missing DB/Admin', () => {
  const token = jwt.sign({ email: 'test@example.com' }, process.env.JWT_SECRET || 'secret');

  it('should return 500 when fetching boards and db is undefined', async () => {
    const response = await request(app)
      .get('/boards')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
  });
});
