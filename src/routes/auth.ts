import { Router } from 'express';
import { login, logout, verify, createAdmin, quickSetup } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/logout', requireAuth, logout);
router.get('/verify', verify);
router.post('/create-admin', createAdmin);
router.get('/quick-setup', quickSetup); // Super simple admin setup

export default router;