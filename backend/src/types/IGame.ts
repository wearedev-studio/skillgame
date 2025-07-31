import { UserDto } from '../dtos/user-dto';

// Общий тип для хода. Может быть числом (крестики-нолики) или объектом (шахматы)
export type Move = any;

// Общий тип для состояния игры, который будет отправляться клиенту
export interface IGameState {
    board: any;
    players: { [key: string]: UserDto };
    currentPlayerId: string | null;
    status: string;
    winner: {
        playerId: string | null;
        reason: 'checkmate' | 'resignation' | 'timeout' | 'win' | 'draw';
    } | null;
    // Дополнительные данные, специфичные для игры (например, съеденные фигуры в шахматах)
    meta: any; 
}

export interface IGame {
    // Метод для совершения хода
    makeMove(player: UserDto, move: Move): IGameState;
    // Получение текущего состояния игры
    getState(): IGameState;
    // Ход бота
    getBotMove?(): Move;
    // Проверка, является ли текущий игрок ботом
    isBotTurn?(): boolean;
}