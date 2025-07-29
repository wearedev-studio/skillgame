import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Расширяем интерфейс Request, чтобы добавить в него поле userId
export interface IAuthRequest extends Request {
    userId?: string;
}

export const protect = (req: IAuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Получаем токен из заголовка 'Bearer <token>'
            token = req.headers.authorization.split(' ')[1];

            // Верифицируем токен
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

            // Добавляем ID пользователя в объект запроса
            req.userId = decoded.userId;
            
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Не авторизован, токен недействителен' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Не авторизован, нет токена' });
    }
};