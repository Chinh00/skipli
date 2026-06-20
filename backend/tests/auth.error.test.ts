import request from 'supertest';
import app from '../src/app';
import { db, admin } from '../src/config/firebase';

jest.mock('../src/config/firebase', () => ({
  db: undefined,
  admin: undefined
}));

describe('Auth Controller with missing DB', () => {
  it('should return 500 when signing in and db is undefined', async () => {
    const response = await request(app)
      .post('/auth/signin')
      .send({ email: 'test@example.com', verificationCode: '123456' });
    
    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
  });
});
