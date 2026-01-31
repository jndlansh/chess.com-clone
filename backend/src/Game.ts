import { WebSocket } from "ws";
import { Chess } from "chess.js";
import { PrismaClient } from '@prisma/client';
import { INIT_GAME, MOVE, GAME_OVER } from "./messages.js";

const prisma = new PrismaClient();

interface RestoreGameOptions {
    gameId: string;
    player1Id: string;
    player2Id: string;
    fen: string;
    whiteTime: number;
    blackTime: number;
    moveCount: number;
}

export class Game {
    public gameId: string;
    public player1: WebSocket | null;
    public player2: WebSocket | null;
    public player1Id: string;
    public player2Id: string;
    public board: Chess;
    public spectators: Set<WebSocket> = new Set();
    public whiteTime: number; // in milliseconds
    public blackTime: number;
    public status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' = 'IN_PROGRESS'; // Track game status
    private moveCount = 0;
    private lastMoveTime: Date;
    private timerInterval?: NodeJS.Timeout | undefined;
    private isRestored: boolean = false; // Track if this is a restored game


    constructor(
        player1: WebSocket | null,
        player2: WebSocket | null,
        player1Id: string,
        player2Id: string,
        timeControl: number = 600000,
        gameId?: string
    ) {
        this.player1 = player1;
        this.player2 = player2;
        this.player1Id = player1Id;
        this.player2Id = player2Id;
        this.board = new Chess();
        this.gameId = gameId || this.generateGameId();
        this.whiteTime = timeControl;
        this.blackTime = timeControl;
        this.lastMoveTime = new Date();
        this.startTimer();

        // Save game to database
        this.saveGame();

        // Notify players with user info
        this.sendInitMessages();
    }

    // Fetch player info and send INIT_GAME messages
    private async sendInitMessages() {
        try {
            const [whiteUser, blackUser] = await Promise.all([
                prisma.user.findUnique({ where: { id: this.player1Id }, select: { username: true, rating: true } }),
                prisma.user.findUnique({ where: { id: this.player2Id }, select: { username: true, rating: true } })
            ]);

            const whitePlayer = { name: whiteUser?.username || 'White', rating: whiteUser?.rating || 1200 };
            const blackPlayer = { name: blackUser?.username || 'Black', rating: blackUser?.rating || 1200 };

            if (this.player1) {
                this.player1.send(JSON.stringify({
                    type: INIT_GAME,
                    payload: {
                        color: 'white',
                        gameId: this.gameId,
                        whitePlayer,
                        blackPlayer
                    }
                }));
            }
            if (this.player2) {
                this.player2.send(JSON.stringify({
                    type: INIT_GAME,
                    payload: {
                        color: 'black',
                        gameId: this.gameId,
                        whitePlayer,
                        blackPlayer
                    }
                }));
            }
        } catch (error) {
            console.error('Error fetching player info:', error);
        }
    }

    // Static method to restore a game from database state
    static restore(options: RestoreGameOptions): Game {
        const game = Object.create(Game.prototype) as Game;
        
        game.gameId = options.gameId;
        game.player1Id = options.player1Id;
        game.player2Id = options.player2Id;
        game.player1 = null;
        game.player2 = null;
        game.board = new Chess(options.fen);
        game.spectators = new Set();
        game.whiteTime = options.whiteTime;
        game.blackTime = options.blackTime;
        game.status = 'IN_PROGRESS';
        game.moveCount = options.moveCount;
        game.lastMoveTime = new Date();
        game.timerInterval = undefined;
        game.isRestored = true;
        
        // Start the timer for restored games
        game.startTimer();
        
        console.log(`[Game.restore] Restored game ${options.gameId} with moveCount=${options.moveCount}, FEN=${options.fen}`);
        
        return game;
    }

    private generateGameId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    private startTimer() {
        this.timerInterval = setInterval(() => {
            const now = new Date();
            const elapsed = now.getTime() - this.lastMoveTime.getTime();

            // Deduct time from current player
            if (this.moveCount % 2 === 0) {
                this.whiteTime -= elapsed;
                if (this.whiteTime <= 0) {
                    this.timeOut('black');
                }
            } else {
                this.blackTime -= elapsed;
                if (this.blackTime <= 0) {
                    this.timeOut('white');
                }
            }
            this.lastMoveTime = now;
                    // Broadcast time update
            this.broadcastTime();
        }, 100); // Update every 100ms
    }

    private broadcastTime() {
        const timeUpdate = JSON.stringify({
            type: 'TIME_UPDATE',
            payload: {
                whiteTime: Math.max(0, this.whiteTime),
                blackTime: Math.max(0, this.blackTime)
            }
        });

        if (this.player1 && this.player1.readyState === 1) {
            this.player1.send(timeUpdate);
        }
        if (this.player2 && this.player2.readyState === 1) {
            this.player2.send(timeUpdate);
        }
        this.spectators.forEach(s => {
            if (s.readyState === 1) s.send(timeUpdate);
        });
    }

    private async timeOut(winner: string) {
        // Mark as completed immediately
        this.status = 'COMPLETED';

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        // Update database
        await prisma.game.update({
            where: { id: this.gameId },
            data: {
                status: 'COMPLETED',
                result: winner,
                endTime: new Date()
            }
        });
        await this.updateRatings(winner);

        const message = JSON.stringify({
            type: GAME_OVER,
            payload: {
                winner,
                reason: 'timeout'
            }
        });

        if (this.player1 && this.player1.readyState === 1) {
            this.player1.send(message);
        }
        if (this.player2 && this.player2.readyState === 1) {
            this.player2.send(message);
        }
        this.spectators.forEach(s => {
            if (s.readyState === 1) s.send(message);
        });
    }

    async saveGame() {
        try {
            await prisma.game.upsert({
                where: { id: this.gameId },
                create: {
                    id: this.gameId,
                    whitePlayerId: this.player1Id,
                    blackPlayerId: this.player2Id,
                    pgn: this.board.pgn(),
                    fen: this.board.fen(),
                    status: 'IN_PROGRESS',
                    moves: [],
                    whiteTimeLeft: this.whiteTime,
                    blackTimeLeft: this.blackTime,
                    timeControl: this.whiteTime
                },
                update: {
                    pgn: this.board.pgn(),
                    fen: this.board.fen(),
                    moves: this.board.history({ verbose: true }) as any[],
                    whiteTimeLeft: this.whiteTime,
                    blackTimeLeft: this.blackTime
                }
            });
        } catch (error) {
            console.error('Error saving game:', error);
        }
    }

    addSpectator(socket: WebSocket) {
        this.spectators.add(socket);
        socket.send(JSON.stringify({
            type: 'SPECTATE',
            payload: {
                gameId: this.gameId,
                fen: this.board.fen(),
                pgn: this.board.pgn(),
                moves: this.board.history()
            }
        }));
    }

    removeSpectator(socket: WebSocket) {
        this.spectators.delete(socket);
    }

    async makeMove(socket: WebSocket, move: { from: string; to: string }) {
        // Get userId from socket
        const userId = (socket as any).userId;
        
        // Validate turn using userId (more reliable than socket reference)
        const isPlayer1 = userId === this.player1Id;
        const isPlayer2 = userId === this.player2Id;
        
        if (!isPlayer1 && !isPlayer2) {
            socket.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'You are not a player in this game' }
            }));
            return;
        }
        
        // White's turn (moveCount even) - must be player1
        if (this.moveCount % 2 === 0 && !isPlayer1) {
            socket.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Not your turn' }
            }));
            return;
        }
        // Black's turn (moveCount odd) - must be player2
        if (this.moveCount % 2 === 1 && !isPlayer2) {
            socket.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Not your turn' }
            }));
            return;
        }

        try {
            // Make the move
            this.board.move(move);
            this.moveCount++; // Increment moveCount right after successful move
            this.lastMoveTime = new Date(); // Reset timer for next player

            // Save to database
            await this.saveGame();

            // Broadcast to all participants (both players and spectators)
            const moveMessage = JSON.stringify({
                type: MOVE,
                payload: move
            });

            // Send to BOTH players (not just the other player)
            if (this.player1 && this.player1.readyState === 1) {
                this.player1.send(moveMessage);
            }
            if (this.player2 && this.player2.readyState === 1) {
                this.player2.send(moveMessage);
            }

            // Send to all spectators
            this.spectators.forEach(spectator => {
                if (spectator.readyState === 1) {
                    spectator.send(moveMessage);
                }
            });

            // Check if game is over
            if (this.board.isGameOver()) {
                await this.endGame();
                return;
            }
        } catch (error) {
            console.error('Move error:', error);
            socket.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Invalid move' }
            }));
        }
    }

    async endGame() {
        let result: string;

        // Mark as completed immediately
        this.status = 'COMPLETED';

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        if (this.board.isCheckmate()) {
            result = this.board.turn() === 'w' ? 'black' : 'white';
        } else if (this.board.isDraw()) {
            result = 'draw';
        } else {
            result = 'draw';
        }

        // Update game in database
        try {
            await prisma.game.update({
                where: { id: this.gameId },
                data: {
                    status: 'COMPLETED',
                    result,
                    endTime: new Date()
                }
            });

            // Update player ratings
            await this.updateRatings(result);
        } catch (error) {
            console.error('Error ending game:', error);
        }

        // Notify all participants
        const gameOverMessage = JSON.stringify({
            type: GAME_OVER,
            payload: {
                winner: result,
                reason: this.board.isCheckmate() ? 'checkmate' : 'draw'
            }
        });

        if (this.player1 && this.player1.readyState === 1) {
            this.player1.send(gameOverMessage);
        }
        if (this.player2 && this.player2.readyState === 1) {
            this.player2.send(gameOverMessage);
        }
        this.spectators.forEach(spectator => {
            if (spectator.readyState === 1) {
                spectator.send(gameOverMessage);
            }
        });
    }

    async updateRatings(result: string) {
        try {
            // ELO rating calculation
            const K = 32; // K-factor

            const white = await prisma.user.findUnique({ where: { id: this.player1Id } });
            const black = await prisma.user.findUnique({ where: { id: this.player2Id } });

            if (!white || !black) return;

            // Expected scores
            const expectedWhite = 1 / (1 + Math.pow(10, (black.rating - white.rating) / 400));
            const expectedBlack = 1 - expectedWhite;

            // Actual scores
            let whiteScore: number;
            let blackScore: number;

            if (result === 'white') {
                whiteScore = 1;
                blackScore = 0;
            } else if (result === 'black') {
                whiteScore = 0;
                blackScore = 1;
            } else {
                whiteScore = 0.5;
                blackScore = 0.5;
            }

            // New ratings
            const newWhiteRating = Math.round(white.rating + K * (whiteScore - expectedWhite));
            const newBlackRating = Math.round(black.rating + K * (blackScore - expectedBlack));

            // Update in database
            await prisma.user.update({
                where: { id: this.player1Id },
                data: { rating: newWhiteRating }
            });

            await prisma.user.update({
                where: { id: this.player2Id },
                data: { rating: newBlackRating }
            });

            console.log(`Rating update: ${white.username} ${white.rating} -> ${newWhiteRating}, ${black.username} ${black.rating} -> ${newBlackRating}`);
        } catch (error) {
            console.error('Error updating ratings:', error);
        }
    }
}
