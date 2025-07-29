import { Router } from 'express';
import { getMyProfile, updateProfile, changePassword } from '../controllers/user.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// Все роуты здесь будут защищены
router.use(protect);

router.get('/me', getMyProfile);
router.put('/profile', updateProfile);
router.put('/password', changePassword);

export default router;