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

export const createCard = async (req: authMiddleware.AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Card name is required' });
    }

    if (!admin) {
      return res.status(500).json({ error: 'Firebase admin not initialized' });
    }

    const isMember = await checkBoardMembership(boardId, req.user.email);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    const cardData = {
      name,
      description: description || '',
      boardId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      order: Date.now() // Simple ordering by timestamp
    };

    const docRef = await db.collection('boards').doc(boardId).collection('cards').add(cardData);
    const savedDoc = await docRef.get();

    res.status(201).json({ 
      id: docRef.id, 
      ...savedDoc.data() 
    });
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
};

export const getCards = async (req: authMiddleware.AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;

    const isMember = await checkBoardMembership(boardId, req.user.email);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    const snapshot = await db.collection('boards').doc(boardId).collection('cards')
      .orderBy('order', 'asc')
      .get();
    
    const cards = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    
    res.json(cards);
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
};

export const updateCard = async (req: authMiddleware.AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const cardId = req.params.cardId as string;
    const { name, description, order } = req.body;

    const isMember = await checkBoardMembership(boardId, req.user.email);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    const cardRef = db.collection('boards').doc(boardId).collection('cards').doc(cardId);
    const cardDoc = await cardRef.get();

    if (!cardDoc.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;

    await cardRef.update(updateData);
    const updatedDoc = await cardRef.get();

    res.json({ 
      id: cardId, 
      ...updatedDoc.data() 
    });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
};

export const deleteCard = async (req: authMiddleware.AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const cardId = req.params.cardId as string;

    const isMember = await checkBoardMembership(boardId, req.user.email);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this board.' });
    }

    const cardRef = db.collection('boards').doc(boardId).collection('cards').doc(cardId);
    const cardDoc = await cardRef.get();

    if (!cardDoc.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }

    await cardRef.delete();
    
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
};
