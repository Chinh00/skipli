import { Router } from 'express';
import * as boardController from '../controllers/boardController';
import authMiddleware = require('../middleware/auth');

const router = Router();

// Protect all board routes
router.use(authMiddleware);

router.post('/', boardController.createBoard);
router.get('/', boardController.getAllBoards);

export default router;
