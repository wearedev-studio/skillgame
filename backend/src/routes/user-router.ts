import { Router } from 'express';
import { body } from 'express-validator';
import authMiddleware from '../middlewares/auth-middleware';
import userProfileController from '../controllers/user-profile-controller';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// --- Настройка Multer для загрузки аватаров ---
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads/avatars';
        // Создаем директорию, если она не существует
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Генерируем уникальное имя файла: user_id-timestamp.ext
        const userId = req.user!.id;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `${userId}-${uniqueSuffix}${extension}`);
    },
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 1024 * 1024 * 5 }, // Лимит 5 МБ
    fileFilter: (req, file, cb) => {
        // Проверка типа файла (только изображения)
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Ошибка: Разрешены только изображения (jpeg, jpg, png, gif)!'));
    },
});
// ---------------------------------------------


// Применяем middleware ко всем роутам в этом файле
router.use(authMiddleware);

router.get('/profile', userProfileController.getProfile);

router.patch(
    '/profile/username',
    body('username').isLength({ min: 3, max: 32 }).withMessage('Имя пользователя должно быть от 3 до 32 символов'),
    userProfileController.updateUsername
);

router.patch(
    '/profile/password',
    body('oldPassword').notEmpty().withMessage('Старый пароль не может быть пустым'),
    body('newPassword').isLength({ min: 3, max: 32 }).withMessage('Новый пароль должен быть от 3 до 32 символов'),
    userProfileController.updatePassword
);

router.post(
    '/profile/avatar',
    uploadAvatar.single('avatar'), // 'avatar' - имя поля в form-data
    userProfileController.updateAvatar
);


export default router;