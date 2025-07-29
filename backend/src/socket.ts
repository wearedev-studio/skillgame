import { Server } from 'socket.io';
import { socketAuthMiddleware, AuthenticatedSocket } from './api/middlewares/socket.auth';
import * as gameManager from './game/game.manager';
import * as gameService from '../src/api/services/game.service'; // <-- Импортируем


export const initializeSocket = (io: Server) => {
    // Защищаем все подключения нашим middleware
    io.use(socketAuthMiddleware);

    io.on('connection', (socket: AuthenticatedSocket) => {
        console.log(`User connected: ${socket.user?.username} (${socket.id})`);

        // --- ЛОББИ ---
        socket.on('lobby:join', (gameType) => {
            // Присоединяем сокет к "комнате" лобби конкретной игры
            socket.join(`${gameType}-lobby`);
            // Отправляем новому пользователю текущий список комнат
            socket.emit('lobby:roomList', gameManager.getRoomsByGameType(gameType));
        });

        socket.on('lobby:leave', (gameType) => {
            socket.leave(`${gameType}-lobby`);
        });

        // --- СОЗДАНИЕ КОМНАТЫ ---
        socket.on('lobby:createRoom', ({ gameType, bet }) => {
            if (!socket.user) return;

            const room = gameManager.createRoom({
                gameType,
                bet,
                creator: { id: socket.user.id, username: socket.user.username }
            }, socket.id);

            // Оповещаем всех в лобби этой игры о новой комнате
            io.to(`${gameType}-lobby`).emit('lobby:roomList', gameManager.getRoomsByGameType(gameType));
        });

        // --- ПРИСОЕДИНЕНИЕ К КОМНАТЕ ---
        socket.on('lobby:joinRoom', (roomId) => {
            if (!socket.user) return;

            const room = gameManager.joinRoom(roomId, { id: socket.user.id, username: socket.user.username }, socket.id);
            if (room) {
                // Комната заполнена, игра начинается
                // Уведомляем обоих игроков о начале игры
                const player1SocketId = room.players[0].socketId;
                const player2SocketId = room.players[1].socketId;

                io.to(player1SocketId).to(player2SocketId).emit('game:start', room);

                // Удаляем комнату из публичного списка и оповещаем лобби
                gameManager.removeRoom(roomId);
                io.to(`${room.gameType}-lobby`).emit('lobby:roomList', gameManager.getRoomsByGameType(room.gameType));
            }
        });

        socket.on('game:makeMove', ({ roomId, cellIndex }) => {
            if (!socket.user) return;

            const room = gameManager.getRoom(roomId);
            const playerSymbol = room?.players[0].id === socket.user.id ? 'X' : 'O'; // Условно

            // Проверки на сервере - источник правды
            if (!room || !room.gameState || room.gameState.winner) return; // Игра не найдена или закончена
            if (room.gameState.currentPlayer !== socket.user.id) {
                return socket.emit('game:error', { message: 'Сейчас не ваш ход' });
            }
            if (room.gameState.board[cellIndex] !== null) {
                return socket.emit('game:error', { message: 'Эта клетка уже занята' });
            }

            // Обновляем состояние игры
            room.gameState.board[cellIndex] = playerSymbol; // Или можно использовать ID игрока

            // Проверяем победителя
            const winner = gameManager.checkWinner(room.gameState.board.map(p => p === playerSymbol ? socket.user!.id : (p ? p : null))); // Это надо будет переделать под ID

            const realWinner = gameManager.checkWinner(room.gameState.board);
            if (realWinner) {
                room.gameState.winner = realWinner;
                // ▼▼▼ ЗАПУСКАЕМ ПРОЦЕСС ЗАВЕРШЕНИЯ ИГРЫ ▼▼▼
                gameService.finishGameAndProcessFunds(room)
                    .then(({ newGame }) => {
                        // Уведомляем игроков о конце игры, теперь с ID игры для истории
                        room.players.forEach(p => {
                            io.to(p.socketId).emit('game:end', { 
                                gameState: room.gameState, 
                                gameId: newGame._id 
                            });
                        });
                    })
                    .catch(err => {
                        // Если произошла ошибка с транзакцией, сообщаем игрокам
                        room.players.forEach(p => {
                            io.to(p.socketId).emit('game:error', { message: 'Произошла ошибка при расчете результатов игры. Средства не были списаны.' });
                        });
                    });
                
                // Удаляем комнату из менеджера после завершения
                gameManager.removeRoom(roomId);

            } else {
                // Меняем игрока
                const nextPlayer = room.players.find(p => p.id !== socket.user!.id);
                if (nextPlayer) {
                    room.gameState.currentPlayer = nextPlayer.id;
                }

                // Отправляем обновленное состояние обоим игрокам
                room.players.forEach(p => {
                    io.to(p.socketId).emit('game:update', room.gameState);
                });
            }
        });

        // --- ОБРАБОТКА ОТКЛЮЧЕНИЯ ---
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user?.username} (${socket.id})`);
            const affectedRoomId = gameManager.removePlayerFromRooms(socket.id);
            if (affectedRoomId) {
                const room = gameManager.getRoom(affectedRoomId);
                const gameType = room ? room.gameType : 'checkers'; // тут нужен более надежный способ
                // Оповещаем лобби об изменении списка комнат
                io.to(`${gameType}-lobby`).emit('lobby:roomList', gameManager.getRoomsByGameType(gameType));
            }
        });
    });
};