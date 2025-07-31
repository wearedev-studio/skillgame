import { UserDto } from '../dtos/user-dto';
import { IGame, IGameState, Move } from '../types/IGame';

export type PlayerSymbol = 'X' | 'O';
export type Board = (PlayerSymbol | null)[];

export enum GameStatus {
    WAITING_FOR_OPPONENT = 'WAITING_FOR_OPPONENT',
    IN_PROGRESS = 'IN_PROGRESS',
    FINISHED = 'FINISHED',
}

export class TicTacToeGame implements IGame {
    public board: Board = Array(9).fill(null);
    public players: { 'X': UserDto, 'O': UserDto };
    public currentPlayer: PlayerSymbol = 'X';
    public status: GameStatus = GameStatus.IN_PROGRESS;
    public winner: PlayerSymbol | 'draw' | null = null;
    
    constructor(player1: UserDto, player2: UserDto) {
        if (Math.random() < 0.5) {
            this.players = { 'X': player1, 'O': player2 };
        } else {
            this.players = { 'X': player2, 'O': player1 };
        }
    }

    getState(): IGameState {
        const currentPlayerDto = this.status === 'IN_PROGRESS' ? this.players[this.currentPlayer] : null;

        return {
            board: this.board,
            players: {
                [this.players.X.id]: this.players.X,
                [this.players.O.id]: this.players.O
            },
            currentPlayerId: currentPlayerDto ? currentPlayerDto.id : null,
            status: this.status,
            winner: this.status === 'FINISHED' ? {
                playerId: this.winner === 'draw' || !this.winner ? null : this.players[this.winner].id,
                reason: this.winner === 'draw' ? 'draw' : 'win'
            } : null,
            meta: {
                playerSymbols: {
                    [this.players.X.id]: 'X',
                    [this.players.O.id]: 'O'
                }
            }
        };
    }

    makeMove(player: UserDto, moveIndex: Move): IGameState {
        const playerSymbol = this.getPlayerSymbol(player);

        // **Вот та самая "старая логика", теперь полностью интегрированная**
        if (!playerSymbol || playerSymbol !== this.currentPlayer || this.board[moveIndex] !== null || this.status !== GameStatus.IN_PROGRESS) {
            // **Изменение №1: Вместо return false, мы выбрасываем ошибку**
            throw new Error('Неверный ход.');
        }

        this.board[moveIndex] = this.currentPlayer;
        this.checkGameState();

        if (this.status === GameStatus.IN_PROGRESS) {
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        }
        
        // **Изменение №2: Вместо return true, мы возвращаем актуальное состояние игры**
        return this.getState();
    }

    private checkGameState() {
        const winningCombos = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6]             // diagonals
        ];

        for (const combo of winningCombos) {
            const [a, b, c] = combo;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                this.status = GameStatus.FINISHED;
                this.winner = this.board[a] as PlayerSymbol;
                return;
            }
        }
        
        if (!this.board.includes(null)) {
            this.status = GameStatus.FINISHED;
            this.winner = 'draw';
        }
    }
    
    public getPlayerSymbol(player: UserDto): PlayerSymbol | null {
        if (this.players.X.id === player.id) return 'X';
        if (this.players.O.id === player.id) return 'O';
        return null;
    }

    // --- Логика Бота (Минимакс) ---
    isBotTurn(): boolean {
        const currentPlayerId = this.players[this.currentPlayer].id;
        return currentPlayerId.startsWith('bot-');
    }
    
    getBotMove(): Move {
        let bestScore = -Infinity;
        let move = -1;

        for (let i = 0; i < 9; i++) {
            if (this.board[i] === null) {
                this.board[i] = this.currentPlayer;
                let score = this.minimax(this.board, 0, false);
                this.board[i] = null;
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    }

    private minimax(board: Board, depth: number, isMaximizing: boolean): number {
        const winner = this.checkWinner(board);
        if (winner !== null) {
            if (winner === this.currentPlayer) return 10 - depth;
            if (winner !== 'draw') return depth - 10;
            return 0;
        }

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = this.currentPlayer;
                    let score = this.minimax(board, depth + 1, false);
                    board[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            const opponent = this.currentPlayer === 'X' ? 'O' : 'X';
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = opponent;
                    let score = this.minimax(board, depth + 1, true);
                    board[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }
    
    private checkWinner(board: Board): PlayerSymbol | 'draw' | null {
         const winningCombos = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]
        ];
        for (const combo of winningCombos) {
            const [a, b, c] = combo;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        return board.includes(null) ? null : 'draw';
    }
}