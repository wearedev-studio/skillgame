export interface Room {
    id: string;
    gameType: 'checkers' | 'chess' | 'backgammon' | 'tic-tac-toe';
    bet: number;
    creator: {
        id: string;
        username: string;
    };
    players: { id: string; username: string; socketId: string }[];
}