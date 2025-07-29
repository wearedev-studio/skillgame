import mongoose from 'mongoose';
import { User } from '../../api/models/user.model';
import { Game } from '../../api/models/game.model';
import { Transaction } from '../../api/models/transaction.model';
import { Room } from '../../game/game.types';

const PLATFORM_COMMISSION_RATE = 0.10; // 10%

export const finishGameAndProcessFunds = async (room: Room) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!room.gameState || !room.gameState.winner) {
            throw new Error('Game state is not final.');
        }

        const { winner, board } = room.gameState;
        const { players, bet, gameType, id: roomId } = room;

        const player1 = await User.findById(players[0].id).session(session);
        const player2 = await User.findById(players[1].id).session(session);

        if (!player1 || !player2) {
            throw new Error('One of the players not found');
        }
        
        // Проверяем, достаточно ли у игроков денег на ставку
        if (player1.balance < bet || player2.balance < bet) {
            // В реальном приложении эта проверка должна быть ПЕРЕД началом игры.
            // Здесь это страховка. Откатываем транзакцию.
            throw new Error('Insufficient funds.');
        }

        let commission = 0;
        let gameWinnerData: any = null;

        if (winner === 'draw') {
            // Ничья: возвращаем ставки за вычетом комиссии
            commission = bet * PLATFORM_COMMISSION_RATE * 2; // с каждого игрока
            
            player1.balance -= bet * PLATFORM_COMMISSION_RATE;
            player2.balance -= bet * PLATFORM_COMMISSION_RATE;
            
            gameWinnerData = 'draw';

        } else {
            // Есть победитель
            const winnerId = winner; // ID победителя
            const loserId = players.find(p => p.id !== winnerId)?.id;
            if (!loserId) throw new Error('Loser not found');

            const winnerUser = winnerId === player1.id ? player1 : player2;
            const loserUser = loserId === player1.id ? player1 : player2;
            
            const totalPot = bet * 2;
            commission = totalPot * PLATFORM_COMMISSION_RATE;
            const prize = totalPot - commission;

            winnerUser.balance += prize;
            loserUser.balance -= bet;
            
            gameWinnerData = { userId: winnerUser._id, username: winnerUser.username };
        }

        await player1.save({ session });
        await player2.save({ session });

        // Создаем запись об игре
        const newGame = new Game({
            gameType,
            players: players.map(p => ({ userId: p.id, username: p.username })),
            bet,
            winner: gameWinnerData,
            commission
        });
        await newGame.save({ session });

        // Создаем записи о транзакциях
        if (winner === 'draw') {
            await Transaction.create([{
                userId: player1._id, type: 'game_draw', amount: -(bet * PLATFORM_COMMISSION_RATE), relatedGameId: newGame._id
            }, {
                userId: player2._id, type: 'game_draw', amount: -(bet * PLATFORM_COMMISSION_RATE), relatedGameId: newGame._id
            }], { session });
        } else {
            const winnerId = winner;
            const loserId = players.find(p => p.id !== winnerId)!.id;
            const prize = (bet * 2) * (1 - PLATFORM_COMMISSION_RATE);
            
            await Transaction.create([{
                userId: winnerId, type: 'game_win', amount: prize, relatedGameId: newGame._id
            }, {
                userId: loserId, type: 'game_loss', amount: -bet, relatedGameId: newGame._id
            }], { session });
        }

        await session.commitTransaction();
        return { newGame, player1, player2 };

    } catch (error) {
        await session.abortTransaction();
        console.error("Game finish transaction failed:", error);
        throw error; // Пробрасываем ошибку выше
    } finally {
        session.endSession();
    }
};