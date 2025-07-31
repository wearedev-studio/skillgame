import { UserDto } from '../dtos/user-dto';
import { IGame, IGameState, Move } from '../types/IGame';

type PieceType = 'w' | 'b'; // w - white, b - black
type Cell = { type: PieceType, isKing: boolean } | null;
type CheckersBoard = Cell[];

interface CheckersMove {
    from: number;
    to: number;
    isCapture: boolean;
    capturedIndex?: number;
}

export class CheckersGame implements IGame {
    private board: CheckersBoard;
    private players: { w: UserDto, b: UserDto };
    private turn: PieceType = 'w';

    constructor(player1: UserDto, player2: UserDto) {
        this.players = { w: player1, b: player2 };
        this.board = this.createInitialBoard();
    }
    
    private createInitialBoard(): CheckersBoard {
        const board: CheckersBoard = Array(64).fill(null);
        for (let i = 0; i < 64; i++) {
            const row = Math.floor(i / 8);
            const col = i % 8;
            if ((row + col) % 2 !== 0) { // Только на темных клетках
                if (row < 3) board[i] = { type: 'b', isKing: false };
                if (row > 4) board[i] = { type: 'w', isKing: false };
            }
        }
        return board;
    }

    getState(): IGameState {
        const possibleMoves = this.getAllPossibleMoves(this.turn);
        let status = 'IN_PROGRESS';
        let winnerState: IGameState['winner'] = null;

        if (possibleMoves.length === 0) {
            status = 'FINISHED';
            const winnerColor = this.turn === 'w' ? 'b' : 'w';
            winnerState = { playerId: this.players[winnerColor].id, reason: 'win' };
        }

        return {
            board: this.board,
            players: { [this.players.w.id]: this.players.w, [this.players.b.id]: this.players.b },
            currentPlayerId: status === 'IN_PROGRESS' ? this.players[this.turn].id : null,
            status,
            winner: winnerState,
            meta: { turn: this.turn, possibleMoves }
        };
    }

    makeMove(player: UserDto, move: Move): IGameState {
        const playerColor = this.getPlayerColor(player.id);
        if (!playerColor || playerColor !== this.turn) throw new Error('Сейчас не ваш ход.');
        
        const possibleMoves = this.getAllPossibleMoves(playerColor);
        const legalMove = possibleMoves.find(m => m.from === move.from && m.to === move.to);
        
        if (!legalMove) throw new Error('Недопустимый ход.');
        
        this.board[legalMove.to] = this.board[legalMove.from];
        this.board[legalMove.from] = null;
        
        const piece = this.board[legalMove.to]!;
        const row = Math.floor(legalMove.to / 8);
        if (!piece.isKing && ((piece.type === 'w' && row === 0) || (piece.type === 'b' && row === 7))) {
            piece.isKing = true;
        }

        let canContinueCapture = false;
        if (legalMove.isCapture) {
            this.board[legalMove.capturedIndex!] = null;
            const nextCaptures = this.getCaptureMovesForPiece(legalMove.to, piece);
            if (nextCaptures.length > 0) {
                canContinueCapture = true;
            }
        }

        if (!canContinueCapture) {
            this.turn = this.turn === 'w' ? 'b' : 'w';
        }
        
        return this.getState();
    }

    private getPlayerColor = (playerId: string): PieceType | null => (this.players.w.id === playerId ? 'w' : this.players.b.id === playerId ? 'b' : null);

    private getAllPossibleMoves(color: PieceType): CheckersMove[] {
        let captureMoves: CheckersMove[] = [];
        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (piece && piece.type === color) {
                captureMoves.push(...this.getCaptureMovesForPiece(i, piece));
            }
        }
        if (captureMoves.length > 0) return captureMoves;

        let simpleMoves: CheckersMove[] = [];
        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (piece && piece.type === color) {
                simpleMoves.push(...this.getSimpleMovesForPiece(i, piece));
            }
        }
        return simpleMoves;
    }

    private getSimpleMovesForPiece(index: number, piece: Cell): CheckersMove[] {
        if (!piece) return [];
        const moves: CheckersMove[] = [];
        const directions = piece.isKing ? [-9, -7, 7, 9] : piece.type === 'w' ? [-9, -7] : [7, 9];

        for (const dir of directions) {
            let currentPos = index;
            while (true) {
                const to = currentPos + dir;
                if (!this.isValidSquare(currentPos, to) || this.board[to]) break;
                
                moves.push({ from: index, to, isCapture: false });
                if (!piece.isKing) break;
                currentPos = to;
            }
        }
        return moves;
    }
    
    private getCaptureMovesForPiece(index: number, piece: Cell): CheckersMove[] {
        if (!piece) return [];
        const moves: CheckersMove[] = [];
        const directions = [-9, -7, 7, 9];

        for (const dir of directions) {
            let opponentPos = -1, to = -1;
            let currentPos = index;
            while(true) {
                const nextPos = currentPos + dir;
                if (!this.isValidSquare(currentPos, nextPos)) break;

                const nextCell = this.board[nextPos];
                if (nextCell) {
                    if (nextCell.type !== piece.type) {
                        opponentPos = nextPos;
                        break;
                    } else {
                        break;
                    }
                }
                if (!piece.isKing) break;
                currentPos = nextPos;
            }

            if (opponentPos !== -1) {
                currentPos = opponentPos;
                 while(true) {
                    const nextPos = currentPos + dir;
                    if (!this.isValidSquare(currentPos, nextPos) || this.board[nextPos]) break;
                    moves.push({ from: index, to: nextPos, isCapture: true, capturedIndex: opponentPos });
                    if (!piece.isKing) break;
                    currentPos = nextPos;
                 }
            }
        }
        return moves;
    }

    private isValidSquare = (from: number, to: number): boolean => {
        if (to < 0 || to >= 64) return false;
        const fromCol = from % 8;
        const toCol = to % 8;
        return Math.abs(fromCol - toCol) !== 7;
    };

    isBotTurn = (): boolean => this.players[this.turn].id.startsWith('bot-');

    getBotMove(): Move {
        const moves = this.getAllPossibleMoves(this.turn);
        if (moves.length === 0) return null;
        // Умный бот: приоритет на становление дамкой при простом ходе
        if (moves[0].isCapture) {
            return moves[Math.floor(Math.random() * moves.length)];
        }
        const kingMoves = moves.filter(m => {
            const row = Math.floor(m.to / 8);
            return (this.turn === 'w' && row === 0) || (this.turn === 'b' && row === 7);
        });
        if (kingMoves.length > 0) {
            return kingMoves[Math.floor(Math.random() * kingMoves.length)];
        }
        return moves[Math.floor(Math.random() * moves.length)];
    }
}