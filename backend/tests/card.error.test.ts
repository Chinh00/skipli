import request from 'supertest';
import app from '../src/app';
import { db, admin } from '../src/config/firebase';
import * as jwt from 'jsonwebtoken';

jest.mock('../src/config/firebase', () => ({
  db: undefined,
  admin: undefined
}));

describe('Card Controller with missing DB/Admin', () => {
  const token = jwt.sign({ email: 'test@example.com' }, process.env.JWT_SECRET || 'secret');

  it('should return 500 when creating a card and admin is undefined', async () => {
    const response = await request(app)
      .post('/boards/board-123/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Card' });
    
    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
  });
});
