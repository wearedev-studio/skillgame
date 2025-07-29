import { Schema, model, Document, Types } from 'mongoose';

export interface IGame extends Document {
    gameType: 'checkers' | 'chess' | 'backgammon' | 'tic-tac-toe';
    players: {
        userId: Types.ObjectId;
        username: string;
    }[];
    bet: number;
    winner: {
        userId: Types.ObjectId;
        username: string;
    } | 'draw' | null;
    commission: number; // Сумма комиссии, удержанная платформой
    endedAt: Date;
}

const GameSchema = new Schema<IGame>({
    gameType: { type: String, required: true },
    players: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        username: { type: String, required: true }
    }],
    bet: { type: Number, required: true, default: 0 },
    winner: { type: Schema.Types.Mixed, default: null }, // Может быть объектом или строкой 'draw'
    commission: { type: Number, required: true, default: 0 },
    endedAt: { type: Date, default: Date.now }
});

export const Game = model<IGame>('Game', GameSchema);