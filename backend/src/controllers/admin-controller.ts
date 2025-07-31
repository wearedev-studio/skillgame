import { Request, Response, NextFunction } from 'express';
import gameRoomService, { GameType } from '../services/game-room-service';
import { ApiError } from '../exceptions/api-error';

class AdminController {
    async createLobbyRoom(req: Request, res: Response, next: NextFunction) {
        try {
            const { gameType, betAmount } = req.body;
            
            if (!gameType || !betAmount) {
                return next(ApiError.BadRequest('Необходимо указать тип игры и сумму ставки.'));
            }
            
            const room = await gameRoomService.createAdminRoom(gameType, betAmount);
            // Уведомляем клиентов через сокет об новой комнате
            // (это будет сделано внутри socket-сервиса)

            return res.status(201).json(room);
        } catch(e) {
            next(e);
        }
    }
}

export default new AdminController();