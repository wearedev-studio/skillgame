import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { token, isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated && token) {
            // Подключаемся к серверу, передавая токен для аутентификации
            const newSocket = io('http://localhost:5001', {
                auth: {
                    token: token
                }
            });

            setSocket(newSocket);

            newSocket.on('connect', () => {
                setIsConnected(true);
                console.log('Socket connected!');
            });

            newSocket.on('disconnect', () => {
                setIsConnected(false);
                console.log('Socket disconnected!');
            });
            
            // Обработка ошибки аутентификации
            newSocket.on('connect_error', (err) => {
                console.error("Socket Connection Error:", err.message);
            });

            // Очистка при размонтировании компонента или смене токена
            return () => {
                newSocket.disconnect();
            };
        }
    }, [isAuthenticated, token]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

// Хук для удобного использования
export const useSocket = () => {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};