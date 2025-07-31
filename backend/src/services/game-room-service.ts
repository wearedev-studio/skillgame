// import { v4 as uuidv4 } from 'uuid';
import { UserDto } from '../dtos/user-dto';
import { IGame, IGameState, Move } from '../game-logic/IGame';
import { TicTacToeGame } from '../game-logic/tic-tac-toe';
import { ChessGame } from '../game-logic/chess';
import { CheckersGame } from '../game-logic/checkers';
import { BackgammonGame } from '../game-logic/backgammon';
import financialService from './financial-service';
import { ApiError } from '../exceptions/api-error';
import UserModel from '../models/user-model';
import socketService from './socket-service';
import GameHistoryModel from '../models/game-history-model';
import { Types } from 'mongoose';

export type GameType = 'TicTacToe' | 'Chess' | 'Checkers' | 'Backgammon';

export interface GameRoom {
    id: string;
    gameType: GameType;
    betAmount: number;
    host: UserDto | null;
    game: IGame | null;
    matchmakingTimer?: NodeJS.Timeout;
    rematchOffer: { from: string, timer: NodeJS.Timeout } | null;
}

class GameRoomService {
    public activeRooms = new Map<string, GameRoom>();
    private botUsernames = ["AlphaPlayer", "BetaGamer", "CyberPro", "NexusBot", "QuantumJoe"];

    private createBotUser(): UserDto {
        const randomName = this.botUsernames[Math.floor(Math.random() * this.botUsernames.length)];
        return { id: `bot-${uuidv4()}`, username: `${randomName}${Math.floor(Math.random() * 100)}`, email: '', isActivated: true, balance: 9999, secondaryBalance: 0, avatar: '' };
    }
    
    private createGameInstance(gameType: GameType, player1: UserDto, player2: UserDto): IGame {
        switch (gameType) {
            case 'TicTacToe': return new TicTacToeGame(player1, player2);
            case 'Chess': return new ChessGame(player1, player2);
            case 'Checkers': return new CheckersGame(player1, player2);
            case 'Backgammon': return new BackgammonGame(player1, player2);
            default: throw new Error(`Игра типа ${gameType} не поддерживается.`);
        }
    }

    public async createRoom(host: UserDto, betAmount: number, gameType: GameType): Promise<GameRoom> {
        const hostUser = await UserModel.findById(host.id);
        if (!hostUser || hostUser.balance < betAmount) throw ApiError.BadRequest('Недостаточно средств для создания игры.');
        hostUser.balance -= betAmount;
        await hostUser.save();
        const room: GameRoom = { id: uuidv4(), gameType, betAmount, host, game: null, matchmakingTimer: undefined, rematchOffer: null };
        const timeoutSeconds = parseInt(process.env.MATCHMAKING_TIMEOUT_SECONDS || '10');
        room.matchmakingTimer = setTimeout(() => socketService.handleBotMatch(room.id), timeoutSeconds * 1000);
        this.activeRooms.set(room.id, room);
        return room;
    }

    public async createAdminRoom(gameType: GameType, betAmount: number): Promise<GameRoom> {
        const room: GameRoom = { id: uuidv4(), gameType, betAmount, host: null, game: null, matchmakingTimer: undefined, rematchOffer: null };
        this.activeRooms.set(room.id, room);
        socketService.broadcastRooms();
        return room;
    }

    public async joinRoom(roomId: string, player: UserDto): Promise<GameRoom> {
        const room = this.activeRooms.get(roomId);
        if (!room) throw ApiError.BadRequest('Комната не найдена.');
        if (room.game) throw ApiError.BadRequest('Игра в этой комнате уже началась.');
        if (room.host?.id === player.id) throw ApiError.BadRequest('Вы не можете присоединиться к своей же игре.');
        const playerUser = await UserModel.findById(player.id);
        if (!playerUser || playerUser.balance < room.betAmount) throw ApiError.BadRequest('Недостаточно средств для присоединения к игре.');
        playerUser.balance -= room.betAmount;
        await playerUser.save();
        if (!room.host) {
            room.host = player;
            const timeoutSeconds = parseInt(process.env.MATCHMAKING_TIMEOUT_SECONDS || '10');
            room.matchmakingTimer = setTimeout(() => socketService.handleBotMatch(room.id), timeoutSeconds * 1000);
            return room;
        } else {
            if (room.matchmakingTimer) clearTimeout(room.matchmakingTimer);
            room.game = this.createGameInstance(room.gameType, room.host, player);
            return room;
        }
    }
    
    public async matchWithBot(roomId: string) {
        const room = this.activeRooms.get(roomId);
        if (!room || room.game || !room.host) return;
        const bot = this.createBotUser();
        room.game = this.createGameInstance(room.gameType, room.host, bot);
    }

    public async makeMove(roomId: string, player: UserDto, move: Move): Promise<GameRoom> {
        const room = this.activeRooms.get(roomId);
        if (!room || !room.game) throw new Error('Игра не найдена.');
        room.game.makeMove(player, move);
        const gameState = room.game.getState();
        if (gameState.status === 'FINISHED') {
            await this.processGameEnd(room, gameState);
        }
        return room;
    }

    public isBotTurn = (room: GameRoom): boolean => room.game?.isBotTurn ? room.game.isBotTurn() : false;
    public getBotMove = (room: GameRoom): Move => room.game?.getBotMove ? room.game.getBotMove() : null;
    
    public async processGameEnd(room: GameRoom, gameState: IGameState) {
        if (!room.game || !gameState.winner) return;
        const winnerId = gameState.winner.playerId;
        const isDraw = gameState.winner.reason === 'draw';
        const playerIds = Object.keys(gameState.players);
        const realPlayerIds = playerIds.filter(id => !id.startsWith('bot-')).map(id => new Types.ObjectId(id));
        let historyResults: any[] = [];
        if (isDraw) {
            if (realPlayerIds.length === 2) {
                const commission = room.betAmount * parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || '0.1');
                await financialService.processGameResult(realPlayerIds[0].toString(), realPlayerIds[1].toString(), room.betAmount, true);
                historyResults = realPlayerIds.map(id => ({ playerId: id, status: 'draw', amount: -commission }));
            }
        } else if (winnerId) {
            const loserId = playerIds.find(id => id !== winnerId)!;
            if (!winnerId.startsWith('bot-') && !loserId.startsWith('bot-')) {
                await financialService.processGameResult(winnerId, loserId, room.betAmount, false);
                const prize = room.betAmount * 2 * (1 - parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || '0.1'));
                historyResults.push({ playerId: new Types.ObjectId(winnerId), status: 'win', amount: prize - room.betAmount });
                historyResults.push({ playerId: new Types.ObjectId(loserId), status: 'loss', amount: -room.betAmount });
            }
        }
        if (realPlayerIds.length > 0) {
            await GameHistoryModel.create({ gameType: room.gameType, players: realPlayerIds, results: historyResults });
        }
    }

    public offerRematch(roomId: string, playerId: string): GameRoom {
        const room = this.activeRooms.get(roomId);
        if (!room || room.rematchOffer) throw new Error('Невозможно предложить реванш.');
        const timer = setTimeout(() => {
            if (room.rematchOffer) { // Проверяем, не был ли реванш уже принят
                room.rematchOffer = null;
                socketService.notifyRematchExpired(roomId);
            }
        }, 5000);
        room.rematchOffer = { from: playerId, timer };
        return room;
    }

    public async acceptRematch(roomId: string, acceptingPlayer: UserDto): Promise<GameRoom> {
        const room = this.activeRooms.get(roomId);
        if (!room || !room.rematchOffer || room.rematchOffer.from === acceptingPlayer.id) {
            throw new Error('Невозможно принять реванш.');
        }
        clearTimeout(room.rematchOffer.timer);
        room.rematchOffer = null;

        const player1Dto = acceptingPlayer;
        const player2Dto = Object.values(room.game!.getState().players).find(p => p.id !== player1Dto.id)!;
        
        // --- ПОЛНАЯ ЛОГИКА СПИСАНИЯ СТАВОК ---
        const player1User = await UserModel.findById(player1Dto.id);
        const player2User = await UserModel.findById(player2Dto.id);

        if (!player1User || player1User.balance < room.betAmount) {
            throw new ApiError.BadRequest(`У игрока ${player1User?.username} недостаточно средств для реванша.`);
        }
        if (!player2User || player2User.balance < room.betAmount) {
            throw new ApiError.BadRequest(`У игрока ${player2User?.username} недостаточно средств для реванша.`);
        }
        
        player1User.balance -= room.betAmount;
        player2User.balance -= room.betAmount;

        await player1User.save();
        await player2User.save();
        // --- КОНЕЦ ЛОГИКИ СПИСАНИЯ ---

        room.game = this.createGameInstance(room.gameType, player1Dto, player2Dto);
        return room;
    }
}

export default new GameRoomService();