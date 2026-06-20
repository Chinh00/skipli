import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { db } from '../src/config/firebase';

// Mock firebase
jest.mock('../src/config/firebase', () => {
  const mockDb = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    add: jest.fn(),
    get: jest.fn(),
    where: jest.fn().mockReturnThis(),
  };
  return {
    db: mockDb,
    admin: {
      firestore: {
        FieldValue: {
          serverTimestamp: jest.fn().mockReturnValue('mock-timestamp'),
        },
      },
    },
  };
});

describe('Board API', () => {
  const testEmail = 'test@example.com';
  const secret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign({ email: testEmail }, secret);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auth Middleware', () => {
    it('should return 401 if no token is provided', async () => {
      const response = await request(app).get('/boards');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    it('should return 401 if token is invalid', async () => {
      const response = await request(app)
        .get('/boards')
        .set('Authorization', 'Bearer invalid-token');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('POST /boards', () => {
    it('should create a new board', async () => {
      const boardData = { name: 'Test Board', description: 'Test Description' };
      const mockDocRef = { id: 'board-id', get: jest.fn() };
      
      ((db as any).add as jest.Mock).mockResolvedValueOnce(mockDocRef);
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({
          ...boardData,
          ownerId: testEmail,
          members: [testEmail],
          createdAt: 'mock-timestamp'
        })
      });

      const response = await request(app)
        .post('/boards')
        .set('Authorization', `Bearer ${token}`)
        .send(boardData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('board-id');
      expect(response.body.name).toBe(boardData.name);
      expect(response.body.ownerId).toBe(testEmail);
      expect(((db as any).collection as jest.Mock)).toHaveBeenCalledWith('boards');
      expect(((db as any).add as jest.Mock)).toHaveBeenCalledWith(expect.objectContaining({
        name: boardData.name,
        ownerId: testEmail,
        members: [testEmail]
      }));
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/boards')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Board name is required');
    });
  });

  describe('GET /boards', () => {
    it('should return all boards for the user', async () => {
      const mockBoards = [
        { id: '1', name: 'Board 1', members: [testEmail] },
        { id: '2', name: 'Board 2', members: [testEmail] }
      ];

      (db as any).get.mockResolvedValueOnce({
        docs: mockBoards.map(b => ({
          id: b.id,
          data: () => ({ name: b.name, members: b.members })
        }))
      });

      const response = await request(app)
        .get('/boards')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].name).toBe('Board 1');
      expect(((db as any).where as jest.Mock)).toHaveBeenCalledWith('members', 'array-contains', testEmail);
    });
  });
});
