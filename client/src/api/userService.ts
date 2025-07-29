import apiClient from './axiosConfig';
import { type IUpdateProfilePayload, type IChangePasswordPayload } from '../types/user.types'; // Создадим этот файл

export const getProfile = () => {
    return apiClient.get('/users/me');
};

export const updateUserProfile = (payload: IUpdateProfilePayload) => {
    return apiClient.put('/users/profile', payload);
};

export const changeUserPassword = (payload: IChangePasswordPayload) => {
    return apiClient.put('/users/password', payload);
};