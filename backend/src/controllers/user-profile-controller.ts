import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../exceptions/api-error';
import userProfileService from '../services/user-profile-service';

class UserProfileController {
    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            // Данные пользователя уже есть в req.user благодаря authMiddleware
            return res.json(req.user);
        } catch (e) {
            next(e);
        }
    }

    async updateUsername(req: Request, res: Response, next: NextFunction) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(ApiError.BadRequest('Ошибка валидации', errors.array()));
            }
            const { username } = req.body;
            const userId = req.user!.id; // ! - т.к. authMiddleware гарантирует наличие user
            
            const userData = await userProfileService.updateUsername(userId, username);
            return res.json(userData);
        } catch (e) {
            next(e);
        }
    }

    async updatePassword(req: Request, res: Response, next: NextFunction) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(ApiError.BadRequest('Ошибка валидации', errors.array()));
            }
            const { oldPassword, newPassword } = req.body;
            const userId = req.user!.id;

            const userData = await userProfileService.updatePassword(userId, oldPassword, newPassword);
            return res.json(userData);
        } catch (e) {
            next(e);
        }
    }

    async updateAvatar(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                return next(ApiError.BadRequest('Файл аватара не был загружен.'));
            }
            
            const userId = req.user!.id;
            // Путь к файлу формируется относительно корня сервера
            const avatarPath = `/uploads/avatars/${req.file.filename}`;
            const userData = await userProfileService.updateAvatar(userId, avatarPath);
            return res.json(userData);
        } catch (e) {
            next(e);
        }
    }
}

export default new UserProfileController();