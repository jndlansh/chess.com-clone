import WebSocket from "ws";
import { Game } from "./Game.js";
import { INIT_GAME, MOVE, ABANDON_GAME } from "./messages.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface UserSocket extends WebSocket {
    userId: string;
}

export class GameManager {
    private games: Game[];
    private pendingUser: UserSocket | null;
    private users: Map<string, UserSocket>;
    private reconnecting: Set<string>; // Track users currently reconnecting

    constructor() {
        this.games = [];
        this.pendingUser = null;
        this.users = new Map();
        this.reconnecting = new Set();
    }

    async addUser(socket: WebSocket, userId: string) {
        const userSocket = socket as UserSocket;
        userSocket.userId = userId;
        
        // Close any existing connection for this user
        const existingSocket = this.users.get(userId);
        if (existingSocket && existingSocket.readyState === WebSocket.OPEN) {
            console.log(`[AddUser] Closing existing socket for user ${userId}`);
            existingSocket.close();
        }
        
        this.users.set(userId, userSocket);

        //check for active game on reconnection
        await this.reconnectToActiveGame(userSocket, userId);

        this.addHandler(userSocket);
    }
    private async reconnectToActiveGame(socket: UserSocket, userId: string) {
        // Prevent multiple simultaneous reconnections
        if (this.reconnecting.has(userId)) {
            console.log(`[Reconnect] Already reconnecting user ${userId}, skipping`);
            return;
        }
        
        this.reconnecting.add(userId);
        
        try {
            console.log(`[Reconnect] User ${userId} attempting reconnection`);
            
            //find active game in memory
            let game = this.games.find(
                g => (g.player1Id === userId || g.player2Id === userId) 
            )

            if(game){
                console.log(`[Reconnect] Found game in memory - GameID: ${game.gameId}`);
            }

            //if not in memory, check database
            if(!game){
            console.log('[Reconnect] No game in memory, checking database...');
            const dbGame = await prisma.game.findFirst({
                where: {
                    OR: [
                        {whitePlayerId: userId},
                        {blackPlayerId: userId}
                    ],
                    status : 'IN_PROGRESS'
                },
                orderBy: {
                    startTime: 'desc'
                }
            });

            if(dbGame){
                console.log(`[Reconnect] Found game in DB - GameID: ${dbGame.id}, FEN: ${dbGame.fen}`);
                
                // Check if game is too old (more than 24 hours)
                const gameAge = Date.now() - new Date(dbGame.startTime).getTime();
                if (gameAge > 24 * 60 * 60 * 1000) {
                    console.log('[Reconnect] Game too old, abandoning');
                    // Automatically abandon old games
                    await prisma.game.update({
                        where: { id: dbGame.id },
                        data: { 
                            status: 'ABANDONED',
                            endTime: new Date()
                        }
                    });
                    return;
                }

                //Send game state and allow user to abandon or wait for opponent
                const playerColor = dbGame.whitePlayerId === userId ? 'white' : 'black';
                console.log(`[Reconnect] Sending GAME_STATE - Color: ${playerColor}`);
                socket.send(JSON.stringify({
                    type: 'GAME_STATE',
                    payload:{
                        gameId: dbGame.id,
                        fen: dbGame.fen,
                        pgn: dbGame.pgn,
                        moves: dbGame.moves,
                        color: playerColor,
                        whiteTime: (dbGame as any).whiteTimeLeft ?? (dbGame as any).timeControl ?? 600000,
                        blackTime: (dbGame as any).blackTimeLeft ?? (dbGame as any).timeControl ?? 600000,
                        canAbandon: true
                    }
                }));
                return;
            } else {
                console.log('[Reconnect] No active game found in database');
            }
        }
        //If game exixts in memory, reconnect the socket
        if(game){
            const playerColor = game.player1Id === userId ? 'white' : 'black';
            if(game.player1Id === userId){
                game.player1 = socket;
                console.log(`[Reconnect] Updated player1 socket`);
            }else if(game.player2Id === userId){
                game.player2 = socket;
                console.log(`[Reconnect] Updated player2 socket`);
            }
            console.log(`[Reconnect] Sending in-memory GAME_STATE - Color: ${playerColor}`);
            //Send current game state to the reconnected user
            socket.send(JSON.stringify({
                type: 'GAME_STATE',
                payload:{
                    gameId: game.gameId,
                    fen: game.board.fen(),
                    pgn: game.board.pgn(),
                    moves: game.board.history(),
                    color: playerColor,
                    whiteTime: game.whiteTime,
                    blackTime: game.blackTime,
                    canAbandon: true
                }
            }));
        }
        } finally {
            this.reconnecting.delete(userId);
        }
    }

    removeUser(socket: WebSocket) {
        const userSocket = socket as UserSocket;
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

    private addHandler(socket: UserSocket) {
        socket.on("message", async (data) => {
            const message = JSON.parse(data.toString());

            if (message.type === INIT_GAME) {
                if (this.pendingUser && this.pendingUser.userId !== socket.userId) {
                    // Create a new game
                    const game = new Game(
                        this.pendingUser,
                        socket,
                        this.pendingUser.userId,
                        socket.userId
                    );
                    this.games.push(game);
                    this.pendingUser = null;
                } else {
                    // Add to waiting queue
                    this.pendingUser = socket;
                    socket.send(JSON.stringify({
                        type: 'WAITING',
                        payload: { message: 'Waiting for opponent...' }
                    }));
                }
            }

            if (message.type === MOVE) {
                const game = this.games.find(
                    game => game.player1 === socket || game.player2 === socket
                );
                if (game) {
                    game.makeMove(socket, message.payload.move);
                }
            }

            if (message.type === ABANDON_GAME) {
                // Find game in memory first
                const memoryGame = this.games.find(
                    game => game.player1 === socket || game.player2 === socket
                );

                // Mark game as abandoned in database
                const dbGame = await prisma.game.findFirst({
                    where: {
                        OR: [
                            {whitePlayerId: socket.userId},
                            {blackPlayerId: socket.userId}
                        ],
                        status: 'IN_PROGRESS'
                    }
                });

                if (dbGame) {
                    // Determine who abandoned
                    const abandoningUserId = socket.userId;
                    const playerColor = dbGame.whitePlayerId === abandoningUserId ? 'White' : 'Black';
                    
                    // Update game status
                    await prisma.game.update({
                        where: { id: dbGame.id },
                        data: { 
                            status: 'ABANDONED',
                            endTime: new Date(),
                            result: `abandoned_by_${playerColor.toLowerCase()}`
                        }
                    });

                    // Deduct 20 rating points from the abandoning player
                    await prisma.user.update({
                        where: { id: abandoningUserId },
                        data: {
                            rating: {
                                decrement: 20
                            }
                        }
                    });

                    // Remove from memory if exists
                    if (memoryGame) {
                        const index = this.games.indexOf(memoryGame);
                        if (index > -1) {
                            this.games.splice(index, 1);
                        }
                        
                        // Notify both players with specific message
                        const abandonMessage = JSON.stringify({
                            type: 'GAME_ABANDONED',
                            payload: { 
                                message: `Game abandoned by ${playerColor} player`,
                                abandonedBy: playerColor,
                                ratingChange: abandoningUserId === socket.userId ? -20 : 0
                            }
                        });
                        
                        memoryGame.player1.send(abandonMessage);
                        memoryGame.player2.send(abandonMessage);
                    } else {
                        // Only notify the requesting player
                        socket.send(JSON.stringify({
                            type: 'GAME_ABANDONED',
                            payload: { 
                                message: `Game abandoned by ${playerColor} player`,
                                abandonedBy: playerColor,
                                ratingChange: -20
                            }
                        }));
                    }
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