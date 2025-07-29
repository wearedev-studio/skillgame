import React, { useEffect, useState } from 'react';
// import { getGameHistory } from '../api/userService'; // Надо будет создать этот сервис
import { useAuth } from '../context/AuthContext';

// Временный тип, пока не создадим API
interface IGameHistoryItem {
    _id: string;
    gameType: string;
    bet: number;
    winner: any;
    endedAt: string;
    players: { username: string }[];
}

export const HistoryPage = () => {
    const [history, setHistory] = useState<IGameHistoryItem[]>([]);
    const { user } = useAuth();
    
    useEffect(() => {
        // Здесь будет вызов API для получения истории игр
        // const fetchHistory = async () => {
        //     const { data } = await getGameHistory();
        //     setHistory(data);
        // };
        // fetchHistory();
    }, []);

    return (
        <div>
            <h1>История игр</h1>
            {/* Здесь будет таблица с историей */}
            <p>Страница истории игр в разработке.</p>
        </div>
    );
};