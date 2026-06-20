import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';

// Define the nested mocks outside so they are stable
const mockTaskDoc = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockTaskCollection = {
  add: jest.fn(),
  get: jest.fn(),
  doc: jest.fn().mockReturnValue(mockTaskDoc),
  orderBy: jest.fn().mockReturnThis(),
};

const mockCardDoc = {
  get: jest.fn(),
  collection: jest.fn((name) => {
    if (name === 'tasks') return mockTaskCollection;
    return { add: jest.fn() };
  }),
};

const mockCardCollection = {
  doc: jest.fn().mockReturnValue(mockCardDoc),
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

// Mock Socket.io
const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn().mockReturnThis(),
};

app.set('io', mockIo);

describe('Task API', () => {
  const testEmail = 'test@example.com';
  const secret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign({ email: testEmail }, secret);
  const boardId = 'board-123';
  const cardId = 'card-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /boards/:boardId/cards/:cardId/tasks', () => {
    it('should create a new task from frontend title payload', async () => {
      mockBoardDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ members: [testEmail] })
      });

      const taskData = { title: 'New Task', order: 123456789 };
      const mockDocRef = { id: 'task-789', get: jest.fn() };

      mockTaskCollection.add.mockResolvedValueOnce(mockDocRef);
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({
          ...taskData,
          description: '',
          boardId,
          cardId,
          ownerId: testEmail,
          createdAt: 'mock-timestamp'
        })
      });

      const response = await request(app)
        .post(`/boards/${boardId}/cards/${cardId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('task-789');
      expect(response.body.title).toBe(taskData.title);
      expect(mockTaskCollection.add).toHaveBeenCalledWith(expect.objectContaining({
        title: taskData.title,
        order: taskData.order
      }));
    });

    it('should create a new task and broadcast it', async () => {
      // Mock board membership check
      mockBoardDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ members: [testEmail] })
      });

      const taskData = { name: 'New Task', description: 'Task Desc' };
      const mockDocRef = { id: 'task-789', get: jest.fn() };
      
      mockTaskCollection.add.mockResolvedValueOnce(mockDocRef);
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({
          ...taskData,
          boardId,
          cardId,
          createdAt: 'mock-timestamp',
          order: 123456789
        })
      });

      const response = await request(app)
        .post(`/boards/${boardId}/cards/${cardId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('task-789');
      expect(response.body.name).toBe(taskData.name);
      
      // Verify broadcast
      expect(mockIo.to).toHaveBeenCalledWith(boardId);
      expect(mockIo.emit).toHaveBeenCalledWith('task-created', expect.objectContaining({
        id: 'task-789',
        name: taskData.name
      }));
    });
  });

  describe('GET /boards/:boardId/cards/:cardId/tasks', () => {
    it('should get all tasks for a card', async () => {
      // Mock board membership check
      mockBoardDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ members: [testEmail] })
      });

      const mockTasks = [
        { id: 'task-1', name: 'Task 1', order: 1 },
        { id: 'task-2', name: 'Task 2', order: 2 }
      ];

      mockTaskCollection.get.mockResolvedValueOnce({
        forEach: (callback: any) => {
          mockTasks.forEach(task => callback({
            id: task.id,
            data: () => ({ name: task.name, order: task.order })
          }));
        }
      });

      const response = await request(app)
        .get(`/boards/${boardId}/cards/${cardId}/tasks`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe('task-1');
      expect(response.body[1].id).toBe('task-2');
    });
  });

  describe('PUT /boards/:boardId/cards/:cardId/tasks/:taskId', () => {
    it('should move a task to another card collection', async () => {
      const taskId = 'task-789';
      const targetCardId = 'card-999';

      mockBoardDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ members: [testEmail] })
      });

      mockTaskDoc.get.mockResolvedValueOnce({
        exists: true,
        id: taskId,
        data: () => ({ title: 'Move me', cardId, order: 1 })
      });

      mockTaskDoc.set.mockResolvedValueOnce({});
      mockTaskDoc.delete.mockResolvedValueOnce({});
      mockTaskDoc.get.mockResolvedValueOnce({
        exists: true,
        id: taskId,
        data: () => ({ title: 'Move me', cardId: targetCardId, order: 1, updatedAt: 'mock-timestamp' })
      });

      const response = await request(app)
        .put(`/boards/${boardId}/cards/${cardId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ cardId: targetCardId });

      expect(response.status).toBe(200);
      expect(response.body.cardId).toBe(targetCardId);
      expect(mockTaskDoc.set).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Move me',
        cardId: targetCardId,
        updatedAt: 'mock-timestamp'
      }));
      expect(mockTaskDoc.delete).toHaveBeenCalled();
      expect(mockIo.emit).toHaveBeenCalledWith('task-updated', expect.objectContaining({
        id: taskId,
        cardId: targetCardId
      }));
    });

    it('should update a task and broadcast it', async () => {
      const taskId = 'task-789';
      // Mock board membership check
      mockBoardDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ members: [testEmail] })
      });

      mockTaskDoc.get.mockResolvedValueOnce({
        exists: true,
        id: taskId,
        data: () => ({ name: 'Old Name' })
      });

      const updates = { name: 'Updated Name' };
      mockTaskDoc.get.mockResolvedValueOnce({
        exists: true,
        id: taskId,
        data: () => ({ name: 'Updated Name', updatedAt: 'mock-timestamp' })
      });

      const response = await request(app)
        .put(`/boards/${boardId}/cards/${cardId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
      
      // Verify broadcast
      expect(mockIo.to).toHaveBeenCalledWith(boardId);
      expect(mockIo.emit).toHaveBeenCalledWith('task-updated', expect.objectContaining({
        id: taskId,
        name: 'Updated Name'
      }));
    });
  });

  describe('DELETE /boards/:boardId/cards/:cardId/tasks/:taskId', () => {
    it('should delete a task and broadcast it', async () => {
      const taskId = 'task-789';
      // Mock board membership check
      mockBoardDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ members: [testEmail] })
      });

      mockTaskDoc.get.mockResolvedValueOnce({
        exists: true,
        id: taskId,
        data: () => ({ name: 'To be deleted' })
      });

      const response = await request(app)
        .delete(`/boards/${boardId}/cards/${cardId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Task deleted successfully');
      
      // Verify broadcast
      expect(mockIo.to).toHaveBeenCalledWith(boardId);
      expect(mockIo.emit).toHaveBeenCalledWith('task-deleted', { id: taskId, cardId });
    });
  });
});
