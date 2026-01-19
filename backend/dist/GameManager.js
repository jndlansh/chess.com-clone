import WebSocket from "ws";
import { Game } from "./Game.js";
import { INIT_GAME, MOVE } from "./messages.js";
export class GameManager {
    games;
    pendingUser;
    users;
    constructor() {
        this.games = [];
        this.pendingUser = null;
        this.users = new Map();
    }
    addUser(socket, userId) {
        const userSocket = socket;
        userSocket.userId = userId;
        this.users.set(userId, userSocket);
        this.addHandler(userSocket);
    }
    removeUser(socket) {
        const userSocket = socket;
        this.users.delete(userSocket.userId);
        // Remove from pending if waiting
        if (this.pendingUser === userSocket) {
            this.pendingUser = null;
        }
        // Remove from any active games as spectator
        this.games.forEach(game => {
            game.removeSpectator(userSocket);
        });
    }
    addHandler(socket) {
        socket.on("message", (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === INIT_GAME) {
                if (this.pendingUser && this.pendingUser.userId !== socket.userId) {
                    // Create a new game
                    const game = new Game(this.pendingUser, socket, this.pendingUser.userId, socket.userId);
                    this.games.push(game);
                    this.pendingUser = null;
                }
                else {
                    // Add to waiting queue
                    this.pendingUser = socket;
                    socket.send(JSON.stringify({
                        type: 'WAITING',
                        payload: { message: 'Waiting for opponent...' }
                    }));
                }
            }
            if (message.type === MOVE) {
                const game = this.games.find(game => game.player1 === socket || game.player2 === socket);
                if (game) {
                    game.makeMove(socket, message.payload.move);
                }
            }
            if (message.type === 'SPECTATE') {
                const gameId = message.payload.gameId;
                const game = this.games.find(g => g.gameId === gameId);
                if (game) {
                    game.addSpectator(socket);
                }
            }
        });
    }
    getActiveGames() {
        return this.games.map(game => ({
            gameId: game.gameId,
            spectatorCount: game.spectators.size
        }));
    }
}
//# sourceMappingURL=GameManager.js.map