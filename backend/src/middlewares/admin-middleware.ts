import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../exceptions/api-error';

export default function (req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) {
            return next(ApiError.UnauthorizedError());
        }

        // В реальном проекте здесь может быть более сложная логика с моделями ролей
        
        const userRoles = req.user.roles as string[]; 
        if (!userRoles.includes('ADMIN')) {
             return next(ApiError.BadRequest('Доступ запрещен. Требуются права администратора.', []));
        }

        next();
    } catch (e) {
        return next(ApiError.UnauthorizedError());
    }
}