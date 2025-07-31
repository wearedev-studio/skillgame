import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../exceptions/api-error';
import tokenService from '../services/token-service';
import { IUser } from '../types/IUser';

// Расширяем интерфейс Request, чтобы добавить поле user
declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}

export default function (req: Request, res: Response, next: NextFunction) {
    try {
        const authorizationHeader = req.headers.authorization;
        if (!authorizationHeader) {
            return next(ApiError.UnauthorizedError());
        }

        const accessToken = authorizationHeader.split(' ')[1]; // Bearer <token>
        if (!accessToken) {
            return next(ApiError.UnauthorizedError());
        }

        const userData = tokenService.validateAccessToken(accessToken) as IUser | null;
        if (!userData) {
            return next(ApiError.UnauthorizedError());
        }

        req.user = userData;
        next();
    } catch (e) {
        return next(ApiError.UnauthorizedError());
    }
}