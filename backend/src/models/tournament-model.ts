import { Schema, model, Types } from 'mongoose';
import { GameType } from '../services/game-room-service'; // Можем переиспользовать этот enum

export enum TournamentStatus {
    PENDING = 'PENDING', // Ожидает игроков
    ACTIVE = 'ACTIVE',   // Идет
    FINISHED = 'FINISHED', // Завершен
}

// Описывает одного участника в сетке
interface BracketPlayer {
    _id: false;
    playerId: Types.ObjectId | string; // ID пользователя или ID бота (например, 'bot-123')
    isBot: boolean;
    username: string;
}

// Описывает один матч в сетке
interface BracketMatch {
    _id: false;
    matchId: string; // Уникальный ID матча, например `round-1-match-0`
    players: (BracketPlayer | null)[];
    winnerId: Types.ObjectId | string | null;
    status: 'pending' | 'active' | 'finished';
}

// Описывает один раунд
interface BracketRound {
    _id: false;
    roundIndex: number;
    matches: BracketMatch[];
}

const TournamentSchema = new Schema({
    name: { type: String, required: true },
    gameType: { type: String, enum: ['TicTacToe', 'Chess', 'Checkers', 'Backgammon'], required: true },
    status: { type: String, enum: Object.values(TournamentStatus), default: TournamentStatus.PENDING },
    size: { type: Number, enum: [4, 8, 16], required: true }, // Количество участников
    entryFee: { type: Number, default: 0 },
    prizePool: { type: Number, default: 0 },
    
    participants: [{
        user: { type: Types.ObjectId, ref: 'User' },
        username: { type: String }
    }],
    
    // Вся структура турнирной сетки
    // @ts-ignore
    bracket: [BracketRound],

    winner: { type: Types.ObjectId, ref: 'User', default: null },
    
    createdAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    finishedAt: { type: Date },
});

export default model('Tournament', TournamentSchema);
export type { BracketPlayer, BracketMatch, BracketRound };