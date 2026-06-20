import { Router } from 'express';
import * as cardController from '../controllers/cardController';
import authMiddleware = require('../middleware/auth');

const router = Router({ mergeParams: true });

// Protect all card routes
router.use(authMiddleware);

router.post('/', cardController.createCard);
router.get('/', cardController.getCards);
router.put('/:cardId', cardController.updateCard);
router.delete('/:cardId', cardController.deleteCard);

export default router;
