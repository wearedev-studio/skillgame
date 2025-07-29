// Этот файл поможет нам избежать ошибок благодаря типизации
export interface IRegisterCredentials {
    email: string;
    username: string;
    password: any;
}

export interface ILoginCredentials {
    email: string;
    password: any;
}

export interface IResetPasswordPayload {
    email: string;
    secretCode: string;
    newPassword: any;
}

export interface IUser {
    id: string;
    email: string;
    username: string;
}

export interface IAuthResponse {
    token: string;
    user: IUser;
}