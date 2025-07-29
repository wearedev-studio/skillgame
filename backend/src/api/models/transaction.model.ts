import { Schema, model, Document, Types } from 'mongoose';

export type TransactionType = 'deposit' | 'withdrawal' | 'game_win' | 'game_loss' | 'game_draw' | 'commission';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface ITransaction extends Document {
    userId: Types.ObjectId;
    type: TransactionType;
    status: TransactionStatus;
    amount: number; // Положительное для зачислений, отрицательное для списаний
    relatedGameId?: Types.ObjectId;
    createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    status: { type: String, required: true, default: 'completed' },
    amount: { type: Number, required: true },
    relatedGameId: { type: Schema.Types.ObjectId, ref: 'Game' },
    createdAt: { type: Date, default: Date.now }
});

export const Transaction = model<ITransaction>('Transaction', TransactionSchema);