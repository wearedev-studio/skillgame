import { Room } from './game.types';

// В реальном приложении для масштабирования здесь лучше использовать Redis
// Но для старта и для одного инстанса сервера массив - отличное рабочее решение
const rooms = new Map<string, Room>();

export const createRoom = (roomDetails: Omit<Room, 'id' | 'players'>, socketId: string): Room => {
    const roomId = `room_${Date.now()}_${Math.random()}`;
    const newRoom: Room = {
        ...roomDetails,
        id: roomId,
        players: [{ ...roomDetails.creator, socketId }]
    };
    rooms.set(roomId, newRoom);
    return newRoom;
};

export const joinRoom = (roomId: string, player: { id: string; username: string }, socketId: string): Room | null => {
    const room = rooms.get(roomId);

    if (room && room.players.length < 2) {
        room.players.push({ ...player, socketId });
        // ▼▼▼ ИНИЦИАЛИЗАЦИЯ ИГРЫ ▼▼▼
        room.gameState = {
            board: Array(9).fill(null),
            // Белые (первый игрок) ходят первыми
            currentPlayer: room.players[0].id,
            winner: null
        };
        return room;
    }

    return null;
};

export const checkWinner = (board: (string | null)[]): string | null | 'draw' => {
    const winConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Горизонтали
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Вертикали
        [0, 4, 8], [2, 4, 6]             // Диагонали
    ];

    for (const condition of winConditions) {
        const [a, b, c] = condition;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a]; // Возвращает 'X' или 'O' (в нашем случае ID игрока)
        }
    }
    
    // Проверка на ничью
    if (board.every(cell => cell !== null)) {
        return 'draw';
    }

    return null; // Игра продолжается
};

export const getRoom = (roomId: string): Room | undefined => rooms.get(roomId);

export const removeRoom = (roomId: string) => rooms.delete(roomId);

export const getRoomsByGameType = (gameType: Room['gameType']): Room[] => {
    return Array.from(rooms.values()).filter(r => r.gameType === gameType && r.players.length < 2);
};

export const removePlayerFromRooms = (socketId: string) => {
    for (const [roomId, room] of rooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.socketId === socketId);
        if (playerIndex !== -1) {
            // Если игрок был один в комнате (создатель), удаляем комнату
            if (room.players.length === 1) {
                rooms.delete(roomId);
            } else {
                // Если игрок был вторым, просто убираем его (хотя игра уже должна была начаться)
                room.players.splice(playerIndex, 1);
            }
            // Возвращаем ID комнаты, чтобы уведомить остальных об изменении
            return roomId;
        }
    }
    return null;
};