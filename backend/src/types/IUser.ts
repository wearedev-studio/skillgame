export interface IUser {
    roles: string[];
    id: string;
    email: string;
    username: string;
    isActivated: boolean;
    balance: number;
    secondaryBalance: number;
    avatar: string;
}