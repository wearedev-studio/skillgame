import { UserDto } from '../dtos/user-dto';
import { IGame, IGameState, Move } from '../types/IGame';

type PlayerColor = 'w' | 'b';
type Point = { owner: PlayerColor, count: number } | null;
type BackgammonBoard = Point[];
type BackgammonSingleMove = { from: number; to: number };

// from: 0-23 (доска), -1 (бар белых), 24 (бар черных)
// to: 0-23 (доска), 24 (выброс белых), -1 (выброс черных)
const BAR_WHITE = -1;
const BAR_BLACK = 24;
const OFF_WHITE = 24;
const OFF_BLACK = -1;

export class BackgammonGame implements IGame {
    private board: BackgammonBoard;
    private players: { w: UserDto, b: UserDto };
    private turn: PlayerColor;
    private dice: [number, number] | null = null;
    private movesLeft: number[] = [];
    private bar: { w: number, b: number } = { w: 0, b: 0 };
    private off: { w: number, b: number } = { w: 0, b: 0 };

    constructor(player1: UserDto, player2: UserDto) {
        this.board = this.createInitialBoard();
        let p1Roll: number, p2Roll: number;
        do {
            p1Roll = Math.floor(Math.random() * 6) + 1;
            p2Roll = Math.floor(Math.random() * 6) + 1;
        } while (p1Roll === p2Roll);
        
        if (p1Roll > p2Roll) {
            this.players = { w: player1, b: player2 };
            this.turn = 'w';
        } else {
            this.players = { w: player2, b: player1 };
            this.turn = 'b';
        }
        this.movesLeft = [p1Roll, p2Roll];
    }
    
    private createInitialBoard(): BackgammonBoard {
        const board: BackgammonBoard = Array(24).fill(null);
        board[0] = { owner: 'w', count: 2 };
        board[5] = { owner: 'b', count: 5 };
        board[7] = { owner: 'b', count: 3 };
        board[11] = { owner: 'w', count: 5 };
        board[12] = { owner: 'b', count: 5 };
        board[16] = { owner: 'w', count: 3 };
        board[18] = { owner: 'w', count: 5 };
        board[23] = { owner: 'b', count: 2 };
        return board;
    }

    private rollDice() {
        this.dice = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
        if (this.dice[0] === this.dice[1]) {
            this.movesLeft = Array(4).fill(this.dice[0]);
        } else {
            this.movesLeft = [...this.dice];
        }
    }

    getState(): IGameState {
        let status = 'IN_PROGRESS';
        let winnerState: IGameState['winner'] = null;
        if (this.off.w === 15) {
            status = 'FINISHED';
            winnerState = { playerId: this.players.w.id, reason: 'win' };
        } else if (this.off.b === 15) {
            status = 'FINISHED';
            winnerState = { playerId: this.players.b.id, reason: 'win' };
        }

        const possibleMoves = status === 'IN_PROGRESS' ? this.generatePossibleMoves(this.turn, this.movesLeft) : [];

        return {
            board: this.board,
            players: { [this.players.w.id]: this.players.w, [this.players.b.id]: this.players.b },
            currentPlayerId: status === 'IN_PROGRESS' ? this.players[this.turn].id : null,
            status, winner: winnerState,
            meta: { turn: this.turn, dice: this.dice, bar: this.bar, off: this.off, possibleMoves }
        };
    }
    
    makeMove(player: UserDto, moves: BackgammonSingleMove[]): IGameState {
        const playerColor = this.getPlayerColor(player.id);
        if (!playerColor || playerColor !== this.turn) throw new Error('Сейчас не ваш ход.');

        // --- ВАЛИДАЦИЯ ХОДА ---
        const possibleMoveSequences = this.generatePossibleMoves(playerColor, this.movesLeft);
        const isMoveValid = possibleMoveSequences.some(seq => 
            seq.length === moves.length && seq.every((move, i) => move.from === moves[i].from && move.to === moves[i].to)
        );

        if (!isMoveValid && possibleMoveSequences.length > 0) {
             throw new Error('Недопустимый ход.');
        }

        // --- ПРИМЕНЕНИЕ ХОДА ---
        for (const move of moves) {
            this.applySingleMove(move, playerColor);
        }

        this.turn = this.turn === 'w' ? 'b' : 'w';
        this.rollDice();
        
        return this.getState();
    }

    private applySingleMove(move: BackgammonSingleMove, color: PlayerColor) {
        // Вывод с бара
        const barIndex = color === 'w' ? BAR_WHITE : BAR_BLACK;
        if (move.from === barIndex) {
            this.bar[color]--;
        } else {
            this.board[move.from]!.count--;
            if (this.board[move.from]!.count === 0) this.board[move.from] = null;
        }

        // Выброс с доски
        const offIndex = color === 'w' ? OFF_WHITE : OFF_BLACK;
        if (move.to === offIndex) {
            this.off[color]++;
        } else {
            const targetPoint = this.board[move.to];
            if (targetPoint && targetPoint.owner !== color && targetPoint.count === 1) {
                // Сбиваем шашку противника на бар
                this.bar[targetPoint.owner]++;
                targetPoint.owner = color;
            } else {
                if (!targetPoint) this.board[move.to] = { owner: color, count: 0 };
                this.board[move.to]!.count++;
            }
        }
    }

    private generatePossibleMoves(color: PlayerColor, dice: number[]): BackgammonSingleMove[][] {
        const sequences: BackgammonSingleMove[][] = [];
        
        const findSequences = (currentBoard: BackgammonBoard, currentBar: {w: number, b:number}, diceLeft: number[], path: BackgammonSingleMove[]) => {
            if (diceLeft.length === 0) {
                if(path.length > 0) sequences.push(path);
                return;
            }
            
            let hasMadeMove = false;
            // Используем Set, чтобы не пробовать один и тот же кубик дважды, если они одинаковые
            const uniqueDice = [...new Set(diceLeft)];
            
            for (const die of uniqueDice) {
                const movesForDie = this.getMovesForDie(currentBoard, currentBar, color, die);
                if (movesForDie.length > 0) hasMadeMove = true;
                
                for (const move of movesForDie) {
                    const { nextBoard, nextBar } = this.getBoardAfterMove(currentBoard, currentBar, move, color);
                    const nextDice = [...diceLeft];
                    nextDice.splice(nextDice.indexOf(die), 1);
                    findSequences(nextBoard, nextBar, nextDice, [...path, move]);
                }
            }

            // Если не было сделано ни одного хода, но путь не пустой, это валидная конечная последовательность
            if (!hasMadeMove && path.length > 0) {
                sequences.push(path);
            }
        };

        findSequences(this.board, this.bar, dice, []);
        
        // Если нет вообще никаких ходов, возвращаем пустой массив
        if(sequences.length === 0) return [];
        
        // Оставляем только самые длинные последовательности, т.к. игрок обязан использовать макс. число костей
        const maxLength = Math.max(...sequences.map(s => s.length));
        return sequences.filter(s => s.length === maxLength);
    }
    
    private getMovesForDie(board: BackgammonBoard, bar: {w:number, b:number}, color: PlayerColor, die: number): BackgammonSingleMove[] {
        const moves: BackgammonSingleMove[] = [];
        const dir = color === 'w' ? 1 : -1;
        
        // 1. Проверяем выход с бара
        if (bar[color] > 0) {
            const from = color === 'w' ? BAR_WHITE : BAR_BLACK;
            const to = color === 'w' ? die - 1 : 24 - die;
            const target = board[to];
            if (!target || target.owner === color || target.count <= 1) {
                moves.push({ from, to });
            }
            return moves;
        }

        const canBearOff = this.canBearOff(board, color);

        // 2. Проверяем ходы с доски
        for (let i = 0; i < 24; i++) {
            const point = board[i];
            if (point && point.owner === color) {
                const to = i + die * dir;
                
                if (canBearOff && (to >= 24 || to < 0)) {
                    moves.push({ from: i, to: color === 'w' ? OFF_WHITE : OFF_BLACK });
                } else if (to >= 0 && to < 24) {
                    const target = board[to];
                     if (!target || target.owner === color || target.count <= 1) {
                        moves.push({ from: i, to });
                    }
                }
            }
        }

        // Если можно выкинуть, но нет точного хода, проверяем ход с более старших позиций
        if (canBearOff && moves.every(m => m.to !== (color === 'w' ? OFF_WHITE : OFF_BLACK))) {
            const homeStart = color === 'w' ? 0 : 18;
            const homeEnd = color === 'w' ? 5 : 23;
            const targetPoint = color === 'w' ? die - 1 : 24 - die;

            let highestCheckerInHome = -1;
             if (dir > 0) { // white
                for (let i = targetPoint - 1; i >= homeStart; i--) {
                    if (board[i]?.owner === color) {
                        highestCheckerInHome = i;
                        break;
                    }
                }
            } else { // black
                for (let i = targetPoint + 1; i <= homeEnd; i++) {
                    if (board[i]?.owner === color) {
                        highestCheckerInHome = i;
                        break;
                    }
                }
            }

            if(highestCheckerInHome !== -1) {
                moves.push({ from: highestCheckerInHome, to: color === 'w' ? OFF_WHITE : OFF_BLACK });
            }
        }
        
        return moves;
    }
    
    private getBoardAfterMove(board: BackgammonBoard, bar: {w:number, b:number}, move: BackgammonSingleMove, color: PlayerColor): { nextBoard: BackgammonBoard, nextBar: {w:number, b:number} } {
        const nextBoard = board.map(p => p ? {...p} : null);
        const nextBar = {...bar};
        
        const barIndex = color === 'w' ? BAR_WHITE : BAR_BLACK;
        if (move.from === barIndex) {
            nextBar[color]--;
        } else {
            nextBoard[move.from]!.count--;
            if (nextBoard[move.from]!.count === 0) nextBoard[move.from] = null;
        }
        
        const offIndex = color === 'w' ? OFF_WHITE : OFF_BLACK;
        if (move.to !== offIndex) {
            const targetPoint = nextBoard[move.to];
            if (targetPoint && targetPoint.owner !== color && targetPoint.count === 1) {
                nextBar[targetPoint.owner]++;
                targetPoint.owner = color;
            } else {
                if (!targetPoint) nextBoard[move.to] = { owner: color, count: 0 };
                nextBoard[move.to]!.count++;
            }
        }
        return { nextBoard, nextBar };
    }
    
    private canBearOff(board: BackgammonBoard, color: PlayerColor): boolean {
        let total = this.off[color] + this.bar[color];
        const homeStart = color === 'w' ? 0 : 18;
        const homeEnd = color === 'w' ? 5 : 23;
        for (let i = homeStart; i <= homeEnd; i++) {
            if (board[i]?.owner === color) {
                total += board[i]!.count;
            }
        }
        return total === 15;
    }
    
    private getPlayerColor = (playerId: string): PlayerColor | null => (this.players.w.id === playerId ? 'w' : this.players.b.id === playerId ? 'b' : null);
    isBotTurn = (): boolean => this.players[this.turn].id.startsWith('bot-');

    getBotMove(): Move {
        const moveSequences = this.generatePossibleMoves(this.turn, this.movesLeft);
        if (moveSequences.length === 0) return [];
        // Простой бот: выбирает случайную из лучших (самых длинных) последовательностей ходов
        return moveSequences[Math.floor(Math.random() * moveSequences.length)];
    }
}