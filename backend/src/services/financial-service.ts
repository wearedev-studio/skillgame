import UserModel from '../models/user-model';
import TransactionModel, { TransactionStatus, TransactionType } from '../models/transaction-model';
import { ApiError } from '../exceptions/api-error';
import mongoose from 'mongoose';
import { KycStatus } from '../models/kyc-request-model';

class FinancialService {

    async deposit(userId: string, amount: number) {
        if (amount <= 0) {
            throw ApiError.BadRequest('Сумма пополнения должна быть положительной.');
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const user = await UserModel.findById(userId).session(session);
            if (!user) {
                throw ApiError.BadRequest('Пользователь не найден.');
            }

            user.balance += amount;
            await user.save({ session });

            const transaction = await TransactionModel.create([{
                user: userId,
                type: TransactionType.DEPOSIT,
                status: TransactionStatus.SUCCESS,
                amount: amount
            }], { session });

            await session.commitTransaction();
            return transaction[0];

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async requestWithdrawal(userId: string, amount: number) {
        if (amount <= 0) {
            throw ApiError.BadRequest('Сумма вывода должна быть положительной.');
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const user = await UserModel.findById(userId).session(session);
            if (!user) {
                throw ApiError.BadRequest('Пользователь не найден.');
            }
            if (user.kycStatus !== KycStatus.APPROVED) {
                throw ApiError.BadRequest('Вывод средств доступен только для верифицированных пользователей.');
            }
            if (user.balance < amount) {
                throw ApiError.BadRequest('Недостаточно средств на балансе.');
            }
            
            user.balance -= amount;
            await user.save({ session });
            
            const transaction = await TransactionModel.create([{
                user: userId,
                type: TransactionType.WITHDRAWAL,
                status: TransactionStatus.PENDING,
                amount: -amount
            }], { session });

            await session.commitTransaction();
            return transaction[0];

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    async getTransactionHistory(userId: string, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const transactions = await TransactionModel.find({ user: userId })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);
        
        const total = await TransactionModel.countDocuments({ user: userId });
        
        return {
            transactions,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }

    async processGameResult(winnerId: string | null, loserId: string | null, betAmount: number, isDraw: boolean) {
        const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || '0.1');
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (isDraw) {
                if (!winnerId || !loserId) throw new Error('ID игроков для ничьи не предоставлены');
                const player1 = await UserModel.findById(winnerId).session(session);
                const player2 = await UserModel.findById(loserId).session(session);
                if (!player1 || !player2) throw new Error('Один из игроков не найден');

                const commission = betAmount * commissionRate;
                const amountToReturn = betAmount - commission;

                player1.balance += amountToReturn;
                player2.balance += amountToReturn;

                await TransactionModel.create([{
                    user: player1._id, type: TransactionType.TIE_FEE, status: TransactionStatus.SUCCESS, amount: -commission
                }, {
                    user: player2._id, type: TransactionType.TIE_FEE, status: TransactionStatus.SUCCESS, amount: -commission
                }], { session });

                await player1.save({ session });
                await player2.save({ session });

            } else {
                if (!winnerId || !loserId) throw new Error('Не определен победитель или проигравший');
                
                const winner = await UserModel.findById(winnerId).session(session);
                if (!winner) throw new Error('Победитель не найден');
                const loser = await UserModel.findById(loserId).session(session);
                if (!loser) throw new Error('Проигравший не найден');
                
                const totalPot = betAmount * 2;
                const platformCommission = totalPot * commissionRate;
                const winnerPrize = totalPot - platformCommission;

                winner.balance += winnerPrize;
                // @ts-ignore
                winner.stats.moneyEarned += (winnerPrize - betAmount);
                // @ts-ignore
                winner.stats.gamesPlayed += 1;
                // @ts-ignore
                loser.stats.gamesPlayed += 1;

                await TransactionModel.create([{
                    user: winnerId, type: TransactionType.GAME_WIN, status: TransactionStatus.SUCCESS, amount: winnerPrize
                }, {
                    user: loserId, type: TransactionType.GAME_LOSS, status: TransactionStatus.SUCCESS, amount: -betAmount
                }, {
                    type: TransactionType.PLATFORM_COMMISSION, status: TransactionStatus.SUCCESS, amount: platformCommission
                }], { session });

                await winner.save({ session });
                await loser.save({ session });
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            console.error('Failed to process game result:', error);
            throw ApiError.BadRequest('Не удалось обработать результат игры.');
        } finally {
            session.endSession();
        }
    }

    // Новый метод для турниров
    async processTournamentWin(winnerId: string, entryFee: number, prizePool: number) {
        const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || '0.1');
        const platformCommission = prizePool * commissionRate;
        const winnerPrize = prizePool - platformCommission;

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const winner = await UserModel.findById(winnerId).session(session);
            if (!winner) {
                throw ApiError.BadRequest('Победитель турнира не найден в базе.');
            }

            winner.balance += winnerPrize;
            // @ts-ignore
            winner.stats.moneyEarned += (winnerPrize - entryFee);
            await winner.save({ session });

            await TransactionModel.create([{
                user: winnerId,
                type: TransactionType.TOURNAMENT_WIN,
                status: TransactionStatus.SUCCESS,
                amount: winnerPrize,
            }, {
                type: TransactionType.PLATFORM_COMMISSION,
                status: TransactionStatus.SUCCESS,
                amount: platformCommission,
            }], { session });

            await session.commitTransaction();
            console.log(`Tournament prize of ${winnerPrize} awarded to ${winner.username}`);
        } catch (error) {
            await session.abortTransaction();
            console.error('Failed to process tournament win:', error);
            throw ApiError.BadRequest('Не удалось обработать выигрыш в турнире.');
        } finally {
            session.endSession();
        }
    }
}

export default new FinancialService();