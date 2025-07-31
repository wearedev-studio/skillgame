import {NextFunction, Request, Response} from "express";
import financialService from "../services/financial-service";
import {ApiError} from "../exceptions/api-error";

class FinancialController {
    async deposit(req: Request, res: Response, next: NextFunction) {
        try {
            const { amount } = req.body;
            const userId = req.user!.id;
            const transaction = await financialService.deposit(userId, Number(amount));
            return res.json(transaction);
        } catch (e) {
            next(e);
        }
    }

    async requestWithdrawal(req: Request, res: Response, next: NextFunction) {
        try {
            const { amount } = req.body;
            const userId = req.user!.id;
            const transaction = await financialService.requestWithdrawal(userId, Number(amount));
            return res.status(202).json(transaction); // 202 Accepted
        } catch (e) {
            next(e);
        }
    }

    async getHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const history = await financialService.getTransactionHistory(userId, page, limit);
            return res.json(history);
        } catch (e) {
            next(e);
        }
    }
}

export default new FinancialController();