import { Chess, Square } from 'chess.js';
import { UserDto } from '../dtos/user-dto';
import { IGame, IGameState, Move } from '../types/IGame';

export class ChessGame implements IGame {
    private game: Chess;
    private players: { w: UserDto, b: UserDto };

    constructor(player1: UserDto, player2: UserDto) {
        this.game = new Chess();
        // Случайно определяем, кто играет белыми (w), а кто черными (b)
        if (Math.random() < 0.5) {
            this.players = { w: player1, b: player2 };
        } else {
            this.players = { w: player2, b: player1 };
        }
    }

    getState(): IGameState {
        const turn = this.game.turn();
        const currentPlayer = this.players[turn];
        
        let status = 'IN_PROGRESS';
        let winnerState: IGameState['winner'] = null;

        if (this.game.isCheckmate()) {
            status = 'FINISHED';
            const winnerColor = turn === 'w' ? 'b' : 'w';
            winnerState = { playerId: this.players[winnerColor].id, reason: 'checkmate' };
        } else if (this.game.isDraw()) {
            status = 'FINISHED';
            winnerState = { playerId: null, reason: 'draw' };
        }

        return {
            board: this.game.fen(), // FEN - стандартное представление шахматной позиции
            players: this.players,
            currentPlayerId: status === 'IN_PROGRESS' ? currentPlayer.id : null,
            status,
            winner: winnerState,
            meta: {
                turn: turn, // 'w' или 'b'
                history: this.game.history({ verbose: true }),
                inCheck: this.game.inCheck(),
            }
        };
    }

    makeMove(player: UserDto, move: Move): IGameState {
        const playerColor = this.getPlayerColor(player.id);
        if (!playerColor || playerColor !== this.game.turn()) {
            throw new Error('Сейчас не ваш ход.');
        }
        
        const result = this.game.move(move);
        if (result === null) {
            throw new Error('Недопустимый ход.');
        }

        return this.getState();
    }
    
    private getPlayerColor(playerId: string): 'w' | 'b' | null {
        if (this.players.w.id === playerId) return 'w';
        if (this.players.b.id === playerId) return 'b';
        return null;
    }

    isBotTurn(): boolean {
        const currentPlayerId = this.players[this.game.turn()].id;
        return currentPlayerId.startsWith('bot-');
    }

    getBotMove(): Move {
        // Очень простой AI: делает случайный валидный ход
        const possibleMoves = this.game.moves({ verbose: true });
        if (possibleMoves.length === 0) return '';
        
        // Умный бот здесь бы использовал negamax/alpha-beta или Stockfish.js
        const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        return { from: randomMove.from, to: randomMove.to, promotion: 'q' }; // Всегда продвигает в ферзя
    }
}