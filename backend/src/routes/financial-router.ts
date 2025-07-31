import {Router} from "express";
import authMiddleware from "../middlewares/auth-middleware";
import financialController from "../controllers/financial-controller";

const router = Router();

// Все финансовые операции требуют авторизации
router.use(authMiddleware);

router.post('/deposit', financialController.deposit);
router.post('/withdraw', financialController.requestWithdrawal);
router.get('/history', financialController.getHistory);

export default router;