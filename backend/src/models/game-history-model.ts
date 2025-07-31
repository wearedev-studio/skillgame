import { Schema, model, Types } from 'mongoose';
import { GameType } from '../services/game-room-service';

const GameHistorySchema = new Schema({
    gameType: { type: String, enum: ['TicTacToe', 'Chess', 'Checkers', 'Backgammon'], required: true },
    players: [{ type: Types.ObjectId, ref: 'User' }],
    // Для каждого игрока храним его результат
    results: [{
        _id: false,
        playerId: { type: Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['win', 'loss', 'draw'] },
        amount: { type: Number } // Сколько выиграл/проиграл
    }],
    playedAt: { type: Date, default: Date.now },
});

export default model('GameHistory', GameHistorySchema);