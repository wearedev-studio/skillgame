import { Router } from 'express';
import userController from '../controllers/user-controller';
import { body } from 'express-validator';

const router = Router();

router.post(
    '/registration',
    body('email').isEmail(),
    body('username').isLength({ min: 3, max: 32 }),
    body('password').isLength({ min: 3, max: 32 }),
    userController.registration
);
router.post('/login', userController.login);
router.post('/logout', userController.logout);
router.get('/activate/:link', userController.activate);
router.get('/refresh', userController.refresh);

// НОВЫЕ РОУТЫ
router.post('/forgot-password',
    body('email').isEmail(),
    userController.forgotPassword
);
router.post('/reset-password',
    body('email').isEmail(),
    body('secretCode').isLength({ min: 6, max: 6 }),
    body('newPassword').isLength({ min: 3, max: 32 }),
    userController.resetPassword
);


export default router;