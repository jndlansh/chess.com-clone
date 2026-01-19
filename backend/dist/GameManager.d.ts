import WebSocket from "ws";
export declare class GameManager {
    private games;
    private pendingUser;
    private users;
    constructor();
    addUser(socket: WebSocket, userId: string): void;
    removeUser(socket: WebSocket): void;
    private addHandler;
    getActiveGames(): {
        gameId: string;
        spectatorCount: number;
    }[];
}
//# sourceMappingURL=GameManager.d.ts.map