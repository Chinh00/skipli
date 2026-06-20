import { Router } from 'express';
import * as authController from '../controllers/authController';

const router = Router();

router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.get('/github/url', authController.githubAuthUrl);
router.post('/github/callback', authController.githubCallback);

export default router;
