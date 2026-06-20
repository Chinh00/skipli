import { Response } from 'express';
import { db, admin } from '../config/firebase';
import authMiddleware from '../middleware/auth';

export const createBoard = async (req: authMiddleware.AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Board name is required' });
    }

    if (!admin) {
      return res.status(500).json({ error: 'Firebase admin not initialized' });
    }

    const boardData = {
      name,
      description: description || '',
      ownerId: req.user.email,
      members: [req.user.email],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('boards').add(boardData);
    
    // Get the actual data including the server timestamp
    const savedDoc = await docRef.get();
    
    res.status(201).json({ 
      id: docRef.id, 
      ...savedDoc.data() 
    });
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
};

export const getAllBoards = async (req: authMiddleware.AuthRequest, res: Response) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database is not initialized. Check your Firebase config.' });
    }
    const snapshot = await db.collection('boards')
      .where('members', 'array-contains', req.user.email)
      .get();
    
    const boards = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    
    res.json(boards);
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
};

export const getBoard = async (req: authMiddleware.AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const doc = await db.collection('boards').doc(boardId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    const board = doc.data();
    if (board && !board.members.includes(req.user.email)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ id: doc.id, ...board });
  } catch (error) {
    console.error('Get board by id error:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
};
