export interface IUpdateProfilePayload {
    username?: string;
    email?: string;
}

export interface IChangePasswordPayload {
    oldPassword: any;
    newPassword: any;
}

// Расширим интерфейс User из auth.types.ts
export interface IUserProfile {
    id: string;
    email: string;
    username: string;
    avatarUrl?: string;
    balance: number;
    bonusBalance: number;
    stats: {
        totalPlatformGames: number;
        gamesPlayed: number;
        hoursPlayed: number;
        moneyEarned: number;
    };
    kyc: {
        status: string;
    };
    createdAt: string;
}