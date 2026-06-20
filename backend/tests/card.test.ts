import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';

// Define the nested mocks outside so they are stable
const mockCardDoc = {
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockCardCollection = {
  add: jest.fn(),
  get: jest.fn(),
  doc: jest.fn().mockReturnValue(mockCardDoc),
  orderBy: jest.fn().mockReturnThis(),
};

const mockBoardDoc = {
  get: jest.fn(),
  collection: jest.fn((name) => {
    if (name === 'cards') return mockCardCollection;
    return { add: jest.fn() };
  }),
};

const mockBoardCollection = {
  doc: jest.fn().mockReturnValue(mockBoardDoc),
};

jest.mock('../src/config/firebase', () => ({
  db: {
    collection: jest.fn((name) => {
      if (name === 'boards') return mockBoardCollection;
      return { doc: jest.fn() };
    }),
  },
  admin: {
    firestore: {
      FieldValue: {
        serverTimestamp: jest.fn().mockReturnValue('mock-timestamp'),
      },
    },
  },
}));

describe('Card API', () => {
  const testEmail = 'test@example.com';
  const secret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign({ email: testEmail }, secret);
  const boardId = 'board-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /boards/:boardId/cards', () => {
    it('should create a new card if user is board member', async () => {
      mockBoardDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ members: [testEmail] })
      });

      const cardData = { name: 'New Card', description: 'Card Desc' };
      const mockDocRef = { id: 'card-456', get: jest.fn() };
      
      mockCardCollection.add.mockResolvedValueOnce(mockDocRef);
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({
          ...cardData,
          boardId,
          createdAt: 'mock-timestamp',
          order: 123456789
        })
      });

      const response = await request(app)
        .post(`/boards/${boardId}/cards`)
        .set('Authorization', `Bearer ${token}`)
        .send(cardData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('card-456');
      expect(response.body.name).toBe(cardData.name);
      expect(mockCardCollection.add).toHaveBeenCalled();
    });

    it('should return 403 if user is not a board member', async () => {
      mockBoardDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ members: ['other@example.com'] })
      });

      const response = await request(app)
        .post(`/boards/${boardId}/cards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Card' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('GET /boards/:boardId/cards', () => {
    it('should list cards for a board', async () => {
      mockBoardDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ members: [testEmail] })
      });

      const mockCards = [
        { id: 'c1', name: 'Card 1', order: 1 },
        { id: 'c2', name: 'Card 2', order: 2 }
      ];

      mockCardCollection.get.mockResolvedValueOnce({
        docs: mockCards.map(c => ({
          id: c.id,
          data: () => ({ name: c.name, order: c.order })
        }))
      });

      const response = await request(app)
        .get(`/boards/${boardId}/cards`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].name).toBe('Card 1');
      expect(mockCardCollection.orderBy).toHaveBeenCalledWith('order', 'asc');
    });
  });

  describe('PUT /boards/:boardId/cards/:cardId', () => {
    it('should update a card', async () => {
      mockBoardDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ members: [testEmail] })
      });

      mockCardDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Old Name', order: 1 })
      });

      const updateData = { name: 'New Name' };
      mockCardDoc.update.mockResolvedValueOnce({});
      mockCardDoc.get.mockResolvedValueOnce({
        data: () => ({ name: 'New Name', order: 1 })
      });

      const response = await request(app)
        .put(`/boards/${boardId}/cards/card-456`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
      expect(mockCardDoc.update).toHaveBeenCalledWith(updateData);
    });
  });

  describe('DELETE /boards/:boardId/cards/:cardId', () => {
    it('should delete a card', async () => {
      mockBoardDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ members: [testEmail] })
      });

      mockCardDoc.get.mockResolvedValueOnce({
        exists: true
      });

      mockCardDoc.delete.mockResolvedValueOnce({});

      const response = await request(app)
        .delete(`/boards/${boardId}/cards/card-456`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Card deleted successfully');
      expect(mockCardDoc.delete).toHaveBeenCalled();
    });
  });
});
