import { Schema, model, Document } from 'mongoose';

// Интерфейс для KYC документов
export interface IKYCDocument {
    type: 'passport' | 'utility_bill' | 'international_passport' | 'residence_permit';
    url: string; // URL загруженного файла
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
}

// Интерфейс для Пользователя
export interface IUser extends Document {
    email: string;
    username: string;
    passwordHash: string;
    avatarUrl?: string;
    balance: number; // Основной баланс
    bonusBalance: number; // Баланс для внутренней валюты
    stats: {
        totalPlatformGames: number; // Это поле лучше хранить глобально, но для примера пока здесь
        gamesPlayed: number;
        hoursPlayed: number; // В минутах, для точности
        moneyEarned: number;
    };
    kyc: {
        status: 'not_started' | 'pending' | 'verified' | 'rejected';
        documents: IKYCDocument[];
    };
    passwordResetCode?: string;
    passwordResetExpires?: Date;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true, match: /.+\@.+\..+/ },
    username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20 },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: 'default_avatar_url' }, // Ссылка на аватар по умолчанию
    balance: { type: Number, default: 0 },
    bonusBalance: { type: Number, default: 0 },
    stats: {
        totalPlatformGames: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        hoursPlayed: { type: Number, default: 0 },
        moneyEarned: { type: Number, default: 0 },
    },
    kyc: {
        status: { type: String, enum: ['not_started', 'pending', 'verified', 'rejected'], default: 'not_started' },
        documents: [{
            type: { type: String, required: true },
            url: { type: String, required: true },
            status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
            rejectionReason: { type: String }
        }]
    },
    passwordResetCode: { type: String },
    passwordResetExpires: { type: Date }
});

export const User = model<IUser>('User', UserSchema);