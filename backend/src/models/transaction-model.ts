import { Schema, model } from 'mongoose';

export enum TransactionType {
    DEPOSIT = 'DEPOSIT',
    WITHDRAWAL = 'WITHDRAWAL',
    GAME_WIN = 'GAME_WIN',
    GAME_LOSS = 'GAME_LOSS',
    TIE_FEE = 'TIE_FEE',
    TOURNAMENT_WIN = 'TOURNAMENT_WIN',
    TOURNAMENT_FEE = 'TOURNAMENT_FEE',
    PLATFORM_COMMISSION = 'PLATFORM_COMMISSION',
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    CANCELLED = 'CANCELLED',
}

const TransactionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(TransactionType), required: true },
    status: { type: String, enum: Object.values(TransactionStatus), default: TransactionStatus.SUCCESS },
    amount: { type: Number, required: true }, // Может быть положительным (зачисление) или отрицательным (списание)
    date: { type: Date, default: Date.now },
});

export default model('Transaction', TransactionSchema);