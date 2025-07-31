import TournamentModel, { TournamentStatus, BracketPlayer, BracketRound, BracketMatch } from '../models/tournament-model';
import { GameType } from './game-room-service';
import { UserDto } from '../dtos/user-dto';
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../exceptions/api-error';
import UserModel from '../models/user-model';
import { Types } from 'mongoose';
import financialService from './financial-service';
import { TicTacToeGame } from '../game-logic/tic-tac-toe';
import { ChessGame } from '../game-logic/chess';
import { CheckersGame } from '../game-logic/checkers';
import { BackgammonGame } from '../game-logic/backgammon';
import { IGame } from '../types/IGame';

// Вспомогательный класс для генерации ботов
class BotGenerator {
    private static botUsernames = ["AlphaBot", "BetaGamer", "CyberPro", "NexusAI", "QuantumJoe", "GhostRacer"];
    
    public static createBot(idSuffix: string | number): BracketPlayer {
        const randomName = this.botUsernames[Math.floor(Math.random() * this.botUsernames.length)];
        const botId = `bot-${idSuffix}`;
        // @ts-ignore
        return {
            playerId: botId,
            isBot: true,
            username: `${randomName}${Math.floor(Math.random() * 100)}`
        };
    }
    public static createBotUserDto(bracketPlayer: BracketPlayer): UserDto {
        return {
            id: bracketPlayer.playerId.toString(),
            username: bracketPlayer.username,
            email: '', isActivated: true, balance: 0, secondaryBalance: 0, avatar: ''
        };
    }
}

class TournamentService {
    // Храним активные ИГРЫ турниров в памяти
    public activeTournamentGames = new Map<string, IGame>(); // key: matchId

    // --- Admin methods ---
    async createTournament(name: string, gameType: GameType, size: 4 | 8 | 16, entryFee: number) {
        const tournament = await TournamentModel.create({
            name, gameType, size, entryFee,
            prizePool: size * entryFee,
        });
        return tournament;
    }

    // --- User methods ---
    async joinTournament(tournamentId: string, userId: string) {
        const tournament = await TournamentModel.findById(tournamentId);
        if (!tournament) throw ApiError.BadRequest('Турнир не найден.');
        if (tournament.status !== TournamentStatus.PENDING) throw ApiError.BadRequest('Регистрация на турнир закрыта.');
        // @ts-ignore
        if (tournament.participants.some(p => p.user.toString() === userId)) throw ApiError.BadRequest('Вы уже зарегистрированы в этом турнире.');
        if (tournament.participants.length >= tournament.size) throw ApiError.BadRequest('Турнир уже заполнен.');
        
        const user = await UserModel.findById(userId);
        if (!user) throw ApiError.BadRequest('Пользователь не найден.');
        if (user.balance < tournament.entryFee) throw ApiError.BadRequest('Недостаточно средств для входа.');
        
        // Списываем взнос
        user.balance -= tournament.entryFee;
        
        tournament.participants.push({ user: user._id, username: user.username });
        
        await user.save();
        await tournament.save();
        
        return tournament;
    }

    // --- Core Logic ---
    async startTournament(tournamentId: string) {
        const tournament = await TournamentModel.findById(tournamentId);
        if (!tournament || tournament.status !== TournamentStatus.PENDING || tournament.participants.length === 0) {
            return null; // Не запускаем, если нет игроков или уже запущен
        }

        // Заполняем оставшиеся места ботами
        const botsNeeded = tournament.size - tournament.participants.length;
        const botPlayers: BracketPlayer[] = [];
        for (let i = 0; i < botsNeeded; i++) {
            botPlayers.push(BotGenerator.createBot(i));
        }
        
        // Формируем полный список участников
        // @ts-ignore
        const realPlayers: BracketPlayer[] = tournament.participants.map(p => ({
            playerId: p.user,
            isBot: false,
            username: p.username
        }));
        
        let allParticipants = [...realPlayers, ...botPlayers];
        // Перемешиваем участников
        allParticipants.sort(() => Math.random() - 0.5);

        // Создаем первый раунд
        // @ts-ignore
        const firstRound: BracketRound = { roundIndex: 0, matches: [] };
        for (let i = 0; i < tournament.size; i += 2) {
            const matchId = `round-0-match-${i/2}`;
            // @ts-ignore
            firstRound.matches.push({
                matchId: matchId,
                players: [allParticipants[i], allParticipants[i+1]],
                winnerId: null,
                status: 'pending'
            });
        }
        
        tournament.bracket.push(firstRound);
        tournament.status = TournamentStatus.ACTIVE;
        tournament.startedAt = new Date();
        
        await tournament.save();
        return tournament;
    }
    
    // Запускает все матчи раунда, где есть два игрока
    async startMatchesForRound(tournamentId: string, roundIndex: number) {
        const tournament = await TournamentModel.findById(tournamentId);
        if (!tournament) return;
        
        const round = tournament.bracket[roundIndex];
        for (const match of round.matches) {
            if (match.players.length === 2 && match.status === 'pending') {
                const player1 = match.players[0]!;
                const player2 = match.players[1]!;

                const userDto1 = player1.isBot ? BotGenerator.createBotUserDto(player1) : new UserDto(await UserModel.findById(player1.playerId));
                const userDto2 = player2.isBot ? BotGenerator.createBotUserDto(player2) : new UserDto(await UserModel.findById(player2.playerId));

                let game: IGame;
                 switch (tournament.gameType) {
                    case 'TicTacToe': game = new TicTacToeGame(userDto1, userDto2); break;
                    case 'Chess': game = new ChessGame(userDto1, userDto2); break;
                    case 'Checkers': game = new CheckersGame(userDto1, userDto2); break;
                    case 'Backgammon': game = new BackgammonGame(userDto1, userDto2); break;
                    default: throw new Error('Game type not implemented for tournaments');
                }
                
                this.activeTournamentGames.set(match.matchId, game);
                match.status = 'active';
            }
        }
        await tournament.save();
        return tournament;
    }

    private createGameInstance(gameType: GameType, player1: UserDto, player2: UserDto): IGame {
        switch (gameType) {
            case 'TicTacToe': return new TicTacToeGame(player1, player2);
            case 'Chess': return new ChessGame(player1, player2);
            case 'Checkers': return new CheckersGame(player1, player2);
            case 'Backgammon': return new BackgammonGame(player1, player2);
            default: throw new Error('Game type not implemented for tournaments');
        }
    }

        // НОВЫЙ МЕТОД для переигровки
    async rematchTournamentGame(tournamentId: string, matchId: string): Promise<IGame> {
        const tournament = await TournamentModel.findById(tournamentId);
        if (!tournament) throw new Error('Tournament not found for rematch');
        
        const match = tournament.bracket.flatMap(r => r.matches).find(m => m.matchId === matchId);
        if (!match || match.players.length < 2) throw new Error('Match not found or not ready for rematch');
        
        console.log(`Rematching game for match ${matchId}`);
        
        const player1 = match.players[0]!;
        const player2 = match.players[1]!;
        const userDto1 = player1.isBot ? BotGenerator.createBotUserDto(player1) : new UserDto(await UserModel.findById(player1.playerId));
        const userDto2 = player2.isBot ? BotGenerator.createBotUserDto(player2) : new UserDto(await UserModel.findById(player2.playerId));
        
        const newGame = this.createGameInstance(tournament.gameType, userDto1, userDto2);
        this.activeTournamentGames.set(matchId, newGame);
        
        return newGame;
    }

    
    // Обработка результата матча
    async handleMatchResult(tournamentId: string, matchId: string, winnerId: string) {
        const tournament = await TournamentModel.findById(tournamentId);
        if (!tournament) throw new Error('Tournament not found');

        // Находим матч и обновляем его
        let currentRoundIndex = -1, currentMatchIndex = -1, winnerPlayer: BracketPlayer | null = null;
        for (let i = 0; i < tournament.bracket.length; i++) {
            // @ts-ignore
            const matchIndex = tournament.bracket[i].matches.findIndex(m => m.matchId === matchId);
            if (matchIndex !== -1) {
                currentRoundIndex = i;
                currentMatchIndex = matchIndex;
                const match = tournament.bracket[i].matches[matchIndex];
                match.status = 'finished';
                match.winnerId = winnerId;
                // @ts-ignore
                winnerPlayer = match.players.find(p => p?.playerId.toString() === winnerId) || null;
                break;
            }
        }
        
        if (currentRoundIndex === -1 || !winnerPlayer) throw new Error('Match or winner not found in bracket');
        
        // Удаляем игру из памяти
        this.activeTournamentGames.delete(matchId);

        // Проверяем, это финал?
        const isFinalRound = Math.pow(2, currentRoundIndex + 1) === tournament.size;
        if (isFinalRound) {
            // Завершаем турнир
            tournament.status = TournamentStatus.FINISHED;
            tournament.finishedAt = new Date();
            // @ts-ignore
            tournament.winner = new Types.ObjectId(winnerId);
            await financialService.processTournamentWin(winnerId, tournament.entryFee, tournament.prizePool);
        } else {
            // Продвигаем победителя в следующий раунд
            const nextRoundIndex = currentRoundIndex + 1;
            const nextMatchIndex = Math.floor(currentMatchIndex / 2);

            // Если следующего раунда еще нет, создаем его
            if (!tournament.bracket[nextRoundIndex]) {
                const numMatchesInNextRound = tournament.bracket[currentRoundIndex].matches.length / 2;
                // @ts-ignore
                const nextRound: BracketRound = { roundIndex: nextRoundIndex, matches: [] };
                
                for (let i = 0; i < numMatchesInNextRound; i++) {
                    // @ts-ignore
                    nextRound.matches.push({
                        matchId: `round-${nextRoundIndex}-match-${i}`,
                        players: [], winnerId: null, status: 'pending'
                    });
                }
                tournament.bracket.push(nextRound);
            }
            
            // Добавляем победителя в матч следующего раунда
            tournament.bracket[nextRoundIndex].matches[nextMatchIndex].players.push(winnerPlayer);
        }
        
        await tournament.save();
        return tournament;
    }
}

export default new TournamentService();