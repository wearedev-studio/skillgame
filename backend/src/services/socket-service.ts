import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ApiError } from '../exceptions/api-error';
import tokenService from './token-service';
import { IUser } from '../types/IUser';
import { UserDto } from '../dtos/user-dto';
import UserModel from '../models/user-model';
import gameRoomService, { GameRoom, GameType } from './game-room-service';
import tournamentService from './tournament-service';
import { Move } from '../types/IGame';
import TournamentModel from '../models/tournament-model';

interface AuthenticatedSocket extends Socket {
    user?: UserDto;
    currentGameRoomId?: string;
    currentTournamentMatchId?: string;
}

const lobbies = new Map<string, Map<string, UserDto>>();

class SocketService {
    // @ts-ignore
    private io: Server;
    private tournamentStartTimers = new Map<string, NodeJS.Timeout>();

    public init(httpServer: HttpServer) {
        this.io = new Server(httpServer, {
            cors: { origin: process.env.CLIENT_URL, methods: ["GET", "POST"], credentials: true }
        });
        this.io.use(this.authenticateSocket.bind(this));
        this.io.on('connection', this.onConnection.bind(this));
        console.log('Socket.IO service initialized');
    }

    private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(ApiError.UnauthorizedError());
            const userData = tokenService.validateAccessToken(token) as IUser | null;
            if (!userData) return next(new Error('Authentication error: Invalid token'));
            const userFromDb = await UserModel.findById(userData.id);
            if (!userFromDb) return next(new Error('Authentication error: User not found'));
            socket.user = new UserDto(userFromDb); 
            next();
        } catch (e) { next(new Error('Authentication error')); }
    }

    private onConnection(socket: AuthenticatedSocket) {
        socket.on('lobby:join', (lobbyName: string) => this.handleLobbyJoin(socket, lobbyName));
        socket.on('lobby:leave', (lobbyName: string) => this.handleLobbyLeave(socket, lobbyName));
        socket.on('game:create', (data: { betAmount: number, gameType: GameType }) => this.handleGameCreate(socket, data.betAmount, data.gameType));
        socket.on('game:join', (roomId: string) => this.handleGameJoin(socket, roomId));
        socket.on('game:move', (data: { roomId: string, move: Move }) => this.handleGameMove(socket, data.roomId, data.move));
        socket.on('game:offerRematch', (roomId: string) => this.handleOfferRematch(socket, roomId));
        socket.on('game:acceptRematch', (roomId: string) => this.handleAcceptRematch(socket, roomId));
        socket.on('tournament:subscribe', (tournamentId: string) => socket.join(`tournament-${tournamentId}`));
        socket.on('tournament:unsubscribe', (tournamentId: string) => socket.leave(`tournament-${tournamentId}`));
        socket.on('tournament:join', (tournamentId: string) => this.handleTournamentJoin(socket, tournamentId));
        socket.on('tournament:move', (data: { tournamentId: string, matchId: string, move: Move }) => this.handleTournamentMove(socket, data.tournamentId, data.matchId, data.move));
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }

    public getPublicRooms() {
        return Array.from(gameRoomService.activeRooms.values())
            .filter(room => !room.game)
            .map(room => ({ id: room.id, host: room.host, betAmount: room.betAmount, gameType: room.gameType, playersCount: room.host ? 1 : 0 }));
    }

    public broadcastRooms() {
        this.io.to('game-lobby').emit('game:listUpdate', this.getPublicRooms());
    }
    
    private async handleGameCreate(socket: AuthenticatedSocket, betAmount: number, gameType: GameType) {
        if (!socket.user) return;
        try {
            await gameRoomService.createRoom(socket.user, betAmount, gameType);
            this.broadcastRooms();
        } catch (e) { socket.emit('game:error', e instanceof Error ? e.message : 'Ошибка создания игры'); }
    }

    private async handleGameJoin(socket: AuthenticatedSocket, roomId: string) {
        if (!socket.user) return;
        try {
            const room = await gameRoomService.joinRoom(roomId, socket.user);
            socket.currentGameRoomId = roomId;
            if (room.game) {
                const hostSocket = this.findSocketByUserId(room.host!.id);
                if (hostSocket) {
                    hostSocket.join(roomId);
                    hostSocket.currentGameRoomId = roomId;
                }
                socket.join(roomId);
                this.io.to(roomId).emit('game:start', { room, game: room.game.getState() });
            } else {
                socket.emit('game:hostAwaiting', { room });
            }
            this.broadcastRooms();
        } catch (e) { socket.emit('game:error', e instanceof Error ? e.message : 'Ошибка присоединения к игре'); }
    }
    
    private async handleGameMove(socket: AuthenticatedSocket, roomId: string, move: Move) {
        if (!socket.user) return;
        try {
            let room = await gameRoomService.makeMove(roomId, socket.user, move);
            if (room.game?.isBotTurn() && room.game?.getState().status === 'IN_PROGRESS') {
                const botMove = room.game.getBotMove!();

                // @ts-ignore
                const botPlayer = Object.values(room.game.getState().players).find(p => p.id.startsWith('bot-'))!;
                // @ts-ignore
                room = await gameRoomService.makeMove(roomId, botPlayer, botMove);
            }
            const gameState = room.game!.getState();
            this.io.to(roomId).emit('game:updateState', gameState);
            if (gameState.status === 'FINISHED') {
                 this.io.to(roomId).emit('game:end', gameState);
            }
        } catch (e) { socket.emit('game:error', e instanceof Error ? e.message : 'Ошибка во время хода'); }
    }
    
    private async handleOfferRematch(socket: AuthenticatedSocket, roomId: string) {
        if (!socket.user) return;
        try {
            gameRoomService.offerRematch(roomId, socket.user.id);
            socket.to(roomId).emit('game:rematchOffered', { from: socket.user });
        } catch (e) { socket.emit('game:error', e instanceof Error ? e.message : 'Ошибка предложения реванша'); }
    }
    
    private async handleAcceptRematch(socket: AuthenticatedSocket, roomId: string) {
        if (!socket.user) return;
        try {
            const room = await gameRoomService.acceptRematch(roomId, socket.user);
            this.io.to(roomId).emit('game:start', { room, game: room.game.getState() });
        } catch (e) { socket.emit('game:error', e instanceof Error ? e.message : 'Ошибка принятия реванша'); }
    }

    public notifyRematchExpired(roomId: string) {
        this.io.to(roomId).emit('game:rematchExpired');
        gameRoomService.activeRooms.delete(roomId);
        this.broadcastRooms();
    }

    public async handleBotMatch(roomId: string) {
        await gameRoomService.matchWithBot(roomId);
        const room = gameRoomService.activeRooms.get(roomId);
        if (room && room.game) {
            const hostSocket = this.findSocketByUserId(room.host!.id);
            if(hostSocket) {
                 hostSocket.join(roomId);
                 this.io.to(roomId).emit('game:start', { room, game: room.game.getState() });
                 this.broadcastRooms();
            }
        }
    }
    
    private findSocketByUserId(userId: string): AuthenticatedSocket | undefined {
        for (const socket of this.io.sockets.sockets.values()) {
            const authSocket = socket as AuthenticatedSocket;
            if (authSocket.user?.id === userId) return authSocket;
        }
        return undefined;
    }

    private async handleTournamentJoin(socket: AuthenticatedSocket, tournamentId: string) {
        if (!socket.user) return;
        try {
            const tournament = await tournamentService.joinTournament(tournamentId, socket.user.id);
            if (tournament.participants.length === 1 && !this.tournamentStartTimers.has(tournamentId)) {
                const timer = setTimeout(() => {
                    this.triggerTournamentStart(tournamentId);
                    this.tournamentStartTimers.delete(tournamentId);
                }, 15 * 1000);
                this.tournamentStartTimers.set(tournamentId, timer);
            }
            this.io.to(`tournament-${tournamentId}`).emit('tournament:update', tournament);
        } catch(e) { socket.emit('tournament:error', e instanceof Error ? e.message : 'Ошибка входа в турнир'); }
    }
    
    private async triggerTournamentStart(tournamentId: string) {
        let tournament = await tournamentService.startTournament(tournamentId);
        if (tournament) {
            // @ts-ignore
            tournament = await tournamentService.startMatchesForRound(tournamentId, 0);
            this.io.to(`tournament-${tournamentId}`).emit('tournament:start', tournament);
            this.io.to(`tournament-${tournamentId}`).emit('tournament:update', tournament);
            this.processBotMatches(tournamentId, 0);
        }
    }

    private async handleTournamentMove(socket: AuthenticatedSocket, tournamentId: string, matchId: string, move: Move) {
        if(!socket.user) return;
        const game = tournamentService.activeTournamentGames.get(matchId);
        if (!game) return socket.emit('tournament:error', 'Игра не найдена или завершена');
        try {
            let gameState = game.makeMove(socket.user, move);
            if(gameState.status === 'FINISHED') {
                if(gameState.winner?.reason === 'draw') {
                    const newGame = await tournamentService.rematchTournamentGame(tournamentId, matchId);
                    this.io.to(`match-${matchId}`).emit('tournament:rematch', newGame.getState());
                } else {
                    const winnerId = gameState.winner!.playerId!;
                    const updatedTournament = await tournamentService.handleMatchResult(tournamentId, matchId, winnerId.toString());
                    this.io.to(`tournament-${tournamentId}`).emit('tournament:update', updatedTournament);
                    const nextRoundIndex = updatedTournament.bracket.length - 1;
                    this.processBotMatches(tournamentId, nextRoundIndex);
                }
            } else {
                this.io.to(`match-${matchId}`).emit('tournament:gameStateUpdate', gameState);
            }
        } catch(e) { socket.emit('tournament:error', e instanceof Error ? e.message : 'Ошибка во время хода в турнире'); }
    }
    
    private async processBotMatches(tournamentId: string, roundIndex: number) {
        const tournament = await TournamentModel.findById(tournamentId);
        if(!tournament || !tournament.bracket[roundIndex]) return;
        const round = tournament.bracket[roundIndex];
        for (const match of round.matches) {
            if (match.status === 'active' && match.players[0]?.isBot && match.players[1]?.isBot) {
                const winner = Math.random() < 0.5 ? match.players[0] : match.players[1];
                const updatedTournament = await tournamentService.handleMatchResult(tournamentId, match.matchId, winner.playerId.toString());
                this.io.to(`tournament-${tournamentId}`).emit('tournament:update', updatedTournament);
            }
        }
    }
    
    private handleLobbyJoin(socket: AuthenticatedSocket, lobbyName: string) { socket.join(lobbyName); }
    private handleLobbyLeave(socket: AuthenticatedSocket, lobbyName: string) { socket.leave(lobbyName); }
    private async handleDisconnect(socket: AuthenticatedSocket) {
        if (socket.currentTournamentMatchId) {
            const matchId = socket.currentTournamentMatchId;
            const game = tournamentService.activeTournamentGames.get(matchId);
            if (game) {
                const opponent = Object.values(game.getState().players).find(p => p.id !== socket.user?.id);
                if (opponent) {
                    const tournament = await TournamentModel.findOne({ "bracket.matches.matchId": matchId });
                    if (tournament) {
                        const updatedTournament = await tournamentService.handleMatchResult(tournament._id.toString(), matchId, opponent.id);
                        this.io.to(`tournament-${tournament._id}`).emit('tournament:update', updatedTournament);
                    }
                }
            }
        }
    }
}

export default new SocketService();