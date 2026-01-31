import { WebSocket } from "ws";
import { Chess } from "chess.js";
interface RestoreGameOptions {
    gameId: string;
    player1Id: string;
    player2Id: string;
    fen: string;
    whiteTime: number;
    blackTime: number;
    moveCount: number;
}
export declare class Game {
    gameId: string;
    player1: WebSocket | null;
    player2: WebSocket | null;
    player1Id: string;
    player2Id: string;
    board: Chess;
    spectators: Set<WebSocket>;
    whiteTime: number;
    blackTime: number;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
    private moveCount;
    private lastMoveTime;
    private timerInterval?;
    private isRestored;
    constructor(player1: WebSocket | null, player2: WebSocket | null, player1Id: string, player2Id: string, timeControl?: number, gameId?: string);
    private sendInitMessages;
    static restore(options: RestoreGameOptions): Game;
    private generateGameId;
    private startTimer;
    private broadcastTime;
    private timeOut;
    saveGame(): Promise<void>;
    addSpectator(socket: WebSocket): void;
    removeSpectator(socket: WebSocket): void;
    makeMove(socket: WebSocket, move: {
        from: string;
        to: string;
    }): Promise<void>;
    endGame(): Promise<void>;
    updateRatings(result: string): Promise<void>;
}
export {};
//# sourceMappingURL=Game.d.ts.map