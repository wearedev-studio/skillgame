import { Schema, model } from 'mongoose';
import { KycStatus } from './kyc-request-model'; // Импортируем enum

const UserSchema = new Schema({
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    isActivated: { type: Boolean, default: false },
    activationLink: { type: String },
    // Добавляем поля, которые понадобятся в будущем
    avatar: { type: String, default: '' },
    balance: { type: Number, default: 0 },
    secondaryBalance: { type: Number, default: 0 },
    // Новые поля для статистики
    stats: {
        gamesPlayed: { type: Number, default: 0 },
        // Будем хранить в секундах для точности
        timePlayedInSeconds: { type: Number, default: 0 },
        moneyEarned: { type: Number, default: 0 }
    },
    // Новые поля
    kycStatus: { type: String, enum: Object.values(KycStatus), default: KycStatus.NOT_SUBMITTED },
    roles: [{ type: String, default: 'USER' }], // Например, ['USER', 'ADMIN']
});

export default model('User', UserSchema);
