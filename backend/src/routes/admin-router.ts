import { Router } from 'express';
import authMiddleware from '../middlewares/auth-middleware';
import adminMiddleware from '../middlewares/admin-middleware';
import adminController from '../controllers/admin-controller';

const router = Router();

// Все роуты здесь требуют прав администратора
router.use(authMiddleware, adminMiddleware);

// Роут для создания админом комнаты в лобби
router.post('/lobby/create-room', adminController.createLobbyRoom);

export default router;