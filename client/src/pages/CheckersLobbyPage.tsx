import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { type Room } from '../types/game.types'; // Создадим этот файл

export const CheckersLobbyPage = () => {
    const { socket, isConnected } = useSocket();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [bet, setBet] = useState(10);

    useEffect(() => {
        if (!socket || !isConnected) return;

        // Сообщаем серверу, что мы вошли в лобби шашек
        socket.emit('lobby:join', 'checkers');

        // Слушаем обновление списка комнат
        socket.on('lobby:roomList', (updatedRooms: Room[]) => {
            setRooms(updatedRooms);
        });

        // Слушаем событие начала игры
        socket.on('game:start', (gameSession) => {
            console.log('Game is starting!', gameSession);
            // Перенаправляем на страницу игры
            navigate(`/game/checkers/${gameSession.id}`);
        });

        // Очистка при выходе со страницы
        return () => {
            socket.emit('lobby:leave', 'checkers');
            socket.off('lobby:roomList');
            socket.off('game:start');
        };
    }, [socket, isConnected, navigate]);

    const handleCreateRoom = () => {
        if (socket) {
            socket.emit('lobby:createRoom', { gameType: 'checkers', bet });
        }
    };

    const handleJoinRoom = (roomId: string) => {
        if (socket) {
            socket.emit('lobby:joinRoom', roomId);
        }
    };
    
    if (!isConnected) return <div>Подключение к игровому серверу...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h1>Лобби: Шашки</h1>
            <div>
                <h3>Создать свою игру</h3>
                <input 
                    type="number" 
                    value={bet} 
                    onChange={(e) => setBet(Number(e.target.value))} 
                    min="1"
                />
                <button onClick={handleCreateRoom}>Создать игру на ${bet}</button>
            </div>
            <hr />
            <div>
                <h3>Доступные игры</h3>
                {rooms.length === 0 ? (
                    <p>Нет доступных игр. Создайте свою!</p>
                ) : (
                    rooms.map(room => (
                        <div key={room.id} style={{ border: '1px solid black', padding: '10px', margin: '10px' }}>
                            <p>Игрок: {room.creator.username}</p>
                            <p>Ставка: ${room.bet}</p>
                            <button onClick={() => handleJoinRoom(room.id)}>Присоединиться</button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};