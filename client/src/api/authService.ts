import apiClient from './axiosConfig';
import { type ILoginCredentials, type IRegisterCredentials, type IResetPasswordPayload } from '../types/auth.types'; // Создадим этот файл далее

export const registerUser = (credentials: IRegisterCredentials) => {
    return apiClient.post('/auth/register', credentials);
};

export const loginUser = (credentials: ILoginCredentials) => {
    return apiClient.post('/auth/login', credentials);
};

export const requestPasswordReset = (email: string) => {
    return apiClient.post('/auth/forgot-password', { email });
};

export const resetUserPassword = (payload: IResetPasswordPayload) => {
    return apiClient.post('/auth/reset-password', payload);
};