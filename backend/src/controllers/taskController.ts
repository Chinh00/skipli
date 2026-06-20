import { Response } from 'express';
import { db, admin } from '../config/firebase';
import authMiddleware from '../middleware/auth';

// Helper to check if user is member of board
const checkBoardMembership = async (boardId: string, userEmail: string): Promise<boolean> => {
  const boardDoc = await db.collection('boards').doc(boardId).get();
  if (!boardDoc.exists) return false;
  const boardData = boardDoc.data();
  return boardData?.members && boardData.members.includes(userEmail);
};

export const createTask = async (req: authMiddleware.AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const cardId = req.params.cardId as string;
    const { name, title, description, ...otherData } = req.body;
    const taskTitle = title || name;

    if (!taskTitle) {
      return res.status(400).json({ error: 'Task name is required' });
    }

    if (!admin) {
      return res.status(500).json({ error: 'Firebase admin not initialized' });
    }

    const isMember = await checkBoardMembership(boardId, req.user.email);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    const taskData = {
      ...otherData,
      title: taskTitle,
      ...(name ? { name } : {}),
      description: description || '',
      boardId,
      cardId,
      ownerId: req.user.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      order: req.body.order || Date.now()
    };

    const docRef = await db.collection('boards').doc(boardId)
      .collection('cards').doc(cardId)
      .collection('tasks').add(taskData);
    
    const savedDoc = await docRef.get();
    const result = { id: docRef.id, ...savedDoc.data() };

    // Socket.io broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(boardId).emit('task-created', result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const getTasks = async (req: authMiddleware.AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const cardId = req.params.cardId as string;

    const isMember = await checkBoardMembership(boardId, req.user.email);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    const tasksSnapshot = await db.collection('boards').doc(boardId)
      .collection('cards').doc(cardId)
      .collection('tasks')
      .orderBy('order')
      .get();

    const tasks: any[] = [];
    tasksSnapshot.forEach(doc => {
      tasks.push({ id: doc.id, ...doc.data() });
    });

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const updateTask = async (req: authMiddleware.AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const cardId = req.params.cardId as string;
    const taskId = req.params.taskId as string;
    const updates = req.body;

    if (!admin) {
      return res.status(500).json({ error: 'Firebase admin not initialized' });
    }

    const isMember = await checkBoardMembership(boardId, req.user.email);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    const taskRef = db.collection('boards').doc(boardId)
      .collection('cards').doc(cardId)
      .collection('tasks').doc(taskId);
    
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (updates.cardId && updates.cardId !== cardId) {
      const updatedAt = admin.firestore.FieldValue.serverTimestamp();
      const movedTask = {
        ...taskDoc.data(),
        ...updates,
        cardId: updates.cardId,
        updatedAt
      };
      const targetTaskRef = db.collection('boards').doc(boardId)
        .collection('cards').doc(updates.cardId)
        .collection('tasks').doc(taskId);

      await targetTaskRef.set(movedTask);
      await taskRef.delete();

      const movedDoc = await targetTaskRef.get();
      const result = { id: movedDoc.id, ...movedDoc.data() };

      const io = req.app.get('io');
      if (io) {
        io.to(boardId).emit('task-updated', result);
      }

      return res.json(result);
    }

    await taskRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedDoc = await taskRef.get();
    const result = { id: updatedDoc.id, ...updatedDoc.data() };

    // Socket.io broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(boardId).emit('task-updated', result);
    }

    res.json(result);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const deleteTask = async (req: authMiddleware.AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const cardId = req.params.cardId as string;
    const taskId = req.params.taskId as string;

    const isMember = await checkBoardMembership(boardId, req.user.email);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    const taskRef = db.collection('boards').doc(boardId)
      .collection('cards').doc(cardId)
      .collection('tasks').doc(taskId);
    
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await taskRef.delete();

    // Socket.io broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(boardId).emit('task-deleted', { id: taskId, cardId });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
