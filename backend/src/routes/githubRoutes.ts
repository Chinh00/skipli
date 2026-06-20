import { Router } from 'express';
import * as githubController from '../controllers/githubController';
import auth from '../middleware/auth';

const router = Router();

router.get('/auth-url', auth, githubController.getAuthUrl);
router.post('/callback', auth, githubController.callback);
router.get('/repos', auth, githubController.getRepos);
router.get('/repos/:owner/:repo', auth, githubController.getRepoDetails);
router.post('/boards/:boardId/cards/:cardId/tasks/:taskId/attach', auth, githubController.attachEntity);
router.post('/boards/:boardId/cards/:cardId/tasks/:taskId/detach', auth, githubController.detachEntity);

export default router;
