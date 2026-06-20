import request from 'supertest';
import app from '../src/app';
import { db } from '../src/config/firebase';

// Mock firebase
jest.mock('../src/config/firebase', () => ({
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    set: jest.fn().mockResolvedValue({}),
    get: jest.fn(),
    delete: jest.fn().mockResolvedValue({}),
  },
  admin: {
    firestore: {
      FieldValue: {
        serverTimestamp: jest.fn().mockReturnValue('mock-timestamp'),
      },
    },
  },
}));

jest.mock('../src/services/mailer', () => ({
  sendVerificationCode: jest.fn().mockResolvedValue(undefined),
}));

describe('Auth API', () => {
  describe('POST /auth/signup', () => {
    it('should return 201 and send code for valid email', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Verification code sent to email');
      expect(((db as any).collection as jest.Mock)).toHaveBeenCalledWith('verifications');
    });

    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email required');
    });
  });

  describe('POST /auth/signin', () => {
    it('should return 200 and access token for valid code', async () => {
      ((db as any).get as jest.Mock).mockResolvedValueOnce({
        exists: true,
        data: () => ({ code: '123456' })
      });

      const response = await request(app)
        .post('/auth/signin')
        .send({ email: 'test@example.com', verificationCode: '123456' });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
    });

    it('should return 401 for invalid code', async () => {
      ((db as any).get as jest.Mock).mockResolvedValueOnce({
        exists: true,
        data: () => ({ code: '123456' })
      });

      const response = await request(app)
        .post('/auth/signin')
        .send({ email: 'test@example.com', verificationCode: 'wrong' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or verification code');
    });
  });
});
