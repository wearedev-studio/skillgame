import { Router } from 'express';
import { adminTournamentController, userTournamentController } from '../controllers/tournament-controller';
import adminMiddleware from '../middlewares/admin-middleware';
import authMiddleware from '../middlewares/auth-middleware';

const router = Router();

// --- Admin Routes ---
router.post(
    '/admin/create',
    authMiddleware,
    adminMiddleware,
    adminTournamentController.create
);

// --- User Routes ---
router.get('/', userTournamentController.getAll);
router.get('/:tournamentId', userTournamentController.getById);
router.post(
    '/:tournamentId/join',
    authMiddleware,
    userTournamentController.join
);

export default router;