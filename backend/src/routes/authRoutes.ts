import { Router } from 'express';
import { currentUser, login, signup } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.post('/login', login);
router.post('/signup', signup);
router.get('/me', authenticate, currentUser);
export default router;
