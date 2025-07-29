import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';

// Расширяем тип сокета, чтобы хранить данные пользователя
export interface AuthenticatedSocket extends Socket {
    user?: {
        id: string;
        username: string;
    }
}

export const socketAuthMiddleware = async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    // Получаем токен из handshake запроса от клиента
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error('Authentication error: Token not provided'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        const user = await User.findById(decoded.userId).select('username').lean();

        if (!user) {
            return next(new Error('Authentication error: User not found'));
        }

        // Прикрепляем данные пользователя к объекту сокета
        socket.user = {
            id: user._id.toString(),
            username: user.username
        };
        next();
    } catch (err) {
        return next(new Error('Authentication error: Invalid token'));
    }
};