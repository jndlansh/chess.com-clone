import { WebSocket } from "ws";
import { Chess } from "chess.js";
export declare class Game {
    gameId: string;
    player1: WebSocket;
    player2: WebSocket;
    player1Id: string;
    player2Id: string;
    board: Chess;
    spectators: Set<WebSocket>;
    private moveCount;
    private whiteTime;
    private blackTime;
    private lastMoveTime;
    private timerInterval?;
    constructor(player1: WebSocket, player2: WebSocket, player1Id: string, player2Id: string, timeControl?: number, gameId?: string);
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
//# sourceMappingURL=Game.d.ts.map