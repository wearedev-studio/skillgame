import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import { type IAuthResponse, type IUser } from '../types/auth.types';

interface AuthContextType {
    user: IUser | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (authResponse: IAuthResponse) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<IUser | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    useEffect(() => {
        // При загрузке приложения пытаемся получить данные пользователя, если есть токен
        const storedUser = localStorage.getItem('user');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
    }, [token]);

    const login = (authResponse: IAuthResponse) => {
        setUser(authResponse.user);
        setToken(authResponse.token);
        localStorage.setItem('user', JSON.stringify(authResponse.user));
        localStorage.setItem('token', authResponse.token);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Хук для удобного доступа к контексту
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};