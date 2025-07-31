import { Request, Response, NextFunction } from 'express';
import tournamentService from '../services/tournament-service';
import { ApiError } from '../exceptions/api-error';

class AdminTournamentController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, gameType, size, entryFee } = req.body;
            if (![4, 8, 16].includes(size)) {
                return next(ApiError.BadRequest('Неверный размер турнира.'));
            }
            const tournament = await tournamentService.createTournament(name, gameType, size, entryFee);
            return res.status(201).json(tournament);
        } catch(e) { next(e); }
    }
}

class UserTournamentController {
    async getAll(req: Request, res: Response, next: NextFunction) {
        // Здесь будет логика для получения списка турниров с фильтрацией и пагинацией
        res.json({ message: "Get all tournaments - to be implemented" });
    }
    
    async getById(req: Request, res: Response, next: NextFunction) {
        // Здесь будет логика для получения деталей одного турнира
        res.json({ message: "Get tournament by ID - to be implemented" });
    }

    async join(req: Request, res: Response, next: NextFunction) {
        try {
            const { tournamentId } = req.params;
            const userId = req.user!.id;
            const tournament = await tournamentService.joinTournament(tournamentId, userId);
            // Здесь нужно будет отправить сокет-уведомление
            return res.json(tournament);
        } catch(e) { next(e); }
    }
}

export const adminTournamentController = new AdminTournamentController();
export const userTournamentController = new UserTournamentController();