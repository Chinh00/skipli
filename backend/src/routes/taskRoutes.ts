import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import authenticate from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.put('/:taskId', taskController.updateTask);
router.delete('/:taskId', taskController.deleteTask);

export default router;
