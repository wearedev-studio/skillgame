import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

interface GameState {
    board: (string | null)[];
    currentPlayer: string;
    winner: string | null | 'draw';
}

export const GamePage = () => {
    const { gameId } = useParams();
    const { socket } = useSocket();
    const { user } = useAuth();
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;
        
        // Запрашиваем состояние игры при входе на страницу
        socket.emit('game:getState', gameId);

        socket.on('game:update', (newState: GameState) => {
            setGameState(newState);
            setError(null);
        });
        
        socket.on('game:end', (finalState: GameState) => {
            setGameState(finalState);
        });
        
        socket.on('game:error', ({ message }: { message: string }) => {
            setError(message);
            setTimeout(() => setError(null), 3000); // Скрывать ошибку через 3 секунды
        });
        
        return () => {
            socket.off('game:update');
            socket.off('game:end');
            socket.off('game:error');
        };

    }, [socket, gameId]);

    const handleCellClick = (index: number) => {
        if (!socket || gameState?.board[index] || gameState?.winner) return;
        if (gameState?.currentPlayer !== user?.id) return; // Доп. проверка на клиенте

        socket.emit('game:makeMove', { roomId: gameId, cellIndex: index });
    };

    const getGameStatusMessage = () => {
        if (!gameState) return "Загрузка игры...";
        if (gameState.winner) {
            if (gameState.winner === 'draw') return "Ничья!";
            return gameState.winner === user?.id ? "Вы победили!" : "Вы проиграли.";
        }
        return gameState.currentPlayer === user?.id ? "Ваш ход" : "Ход оппонента";
    };

    return (
        <div style={{ textAlign: 'center' }}>
            <h2>Крестики-нолики</h2>
            <h3>{getGameStatusMessage()}</h3>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 100px)', gap: '5px', justifyContent: 'center', margin: '20px 0' }}>
                {gameState?.board.map((cell, index) => (
                    <div 
                        key={index}
                        onClick={() => handleCellClick(index)}
                        style={{
                            width: '100px', height: '100px', border: '1px solid black',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '48px', cursor: 'pointer'
                        }}
                    >
                        {cell}
                    </div>
                ))}
            </div>
        </div>
    );
};