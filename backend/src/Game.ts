import { WebSocket } from "ws";
import { Chess } from "chess.js";
import { PrismaClient } from '@prisma/client';
import { INIT_GAME, MOVE, GAME_OVER } from "./messages.js";

const prisma = new PrismaClient();

export class Game {
    public gameId: string;
    public player1: WebSocket;
    public player2: WebSocket;
    public player1Id: string;
    public player2Id: string;
    public board: Chess;
    public spectators: Set<WebSocket> = new Set();
    private moveCount = 0;
    private whiteTime: number; // in milliseconds
    private blackTime: number;
    private lastMoveTime: Date;
    private timerInterval?: NodeJS.Timeout;


    constructor(
        player1: WebSocket,
        player2: WebSocket,
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

        // Notify players
        this.player1.send(JSON.stringify({
            type: INIT_GAME,
            payload: {
                color: 'white',
                gameId: this.gameId
            }
        }));
        this.player2.send(JSON.stringify({
            type: INIT_GAME,
            payload: {
                color: 'black',
                gameId: this.gameId
            }
        }));
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

        this.player1.send(timeUpdate);
        this.player2.send(timeUpdate);
        this.spectators.forEach(s => s.send(timeUpdate));
    }

    private async timeOut(winner: string) {
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

        this.player1.send(message);
        this.player2.send(message);
        this.spectators.forEach(s => s.send(message));
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
                    moves: []
                },
                update: {
                    pgn: this.board.pgn(),
                    fen: this.board.fen(),
                    moves: this.board.history({ verbose: true }) as any[]
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
        // Validate turn
        if (this.moveCount % 2 === 0 && socket !== this.player1) {
            socket.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Not your turn' }
            }));
            return;
        }
        if (this.moveCount % 2 === 1 && socket !== this.player2) {
            socket.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Not your turn' }
            }));
            return;
        }

        try {
            // Make the move
            this.board.move(move);
            this.lastMoveTime = new Date(); // Reset timer for next player


            // Save to database
            await this.saveGame();

            // Broadcast to all participants (both players and spectators)
            const moveMessage = JSON.stringify({
                type: MOVE,
                payload: move
            });

            // Send to the other player
            const otherPlayer = socket === this.player1 ? this.player2 : this.player1;
            otherPlayer.send(moveMessage);

            // Send to all spectators
            this.spectators.forEach(spectator => {
                spectator.send(moveMessage);
            });

            // Check if game is over
            if (this.board.isGameOver()) {
                await this.endGame();
                return;
            }

            this.moveCount++;
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

        this.player1.send(gameOverMessage);
        this.player2.send(gameOverMessage);
        this.spectators.forEach(spectator => {
            spectator.send(gameOverMessage);
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
