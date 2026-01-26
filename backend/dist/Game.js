import { WebSocket } from "ws";
import { Chess } from "chess.js";
import { PrismaClient } from '@prisma/client';
import { INIT_GAME, MOVE, GAME_OVER } from "./messages.js";
const prisma = new PrismaClient();
export class Game {
    gameId;
    player1;
    player2;
    player1Id;
    player2Id;
    board;
    spectators = new Set();
    whiteTime; // in milliseconds
    blackTime;
    moveCount = 0;
    lastMoveTime;
    timerInterval;
    constructor(player1, player2, player1Id, player2Id, timeControl = 600000, gameId) {
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
    generateGameId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    startTimer() {
        this.timerInterval = setInterval(() => {
            const now = new Date();
            const elapsed = now.getTime() - this.lastMoveTime.getTime();
            // Deduct time from current player
            if (this.moveCount % 2 === 0) {
                this.whiteTime -= elapsed;
                if (this.whiteTime <= 0) {
                    this.timeOut('black');
                }
            }
            else {
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
    broadcastTime() {
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
    async timeOut(winner) {
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
                    moves: [],
                    whiteTimeLeft: this.whiteTime,
                    blackTimeLeft: this.blackTime,
                    timeControl: this.whiteTime
                },
                update: {
                    pgn: this.board.pgn(),
                    fen: this.board.fen(),
                    moves: this.board.history({ verbose: true }),
                    whiteTimeLeft: this.whiteTime,
                    blackTimeLeft: this.blackTime
                }
            });
        }
        catch (error) {
            console.error('Error saving game:', error);
        }
    }
    addSpectator(socket) {
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
    removeSpectator(socket) {
        this.spectators.delete(socket);
    }
    async makeMove(socket, move) {
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
            // Send to BOTH players (not just the other player)
            this.player1.send(moveMessage);
            this.player2.send(moveMessage);
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
        }
        catch (error) {
            console.error('Move error:', error);
            socket.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Invalid move' }
            }));
        }
    }
    async endGame() {
        let result;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        if (this.board.isCheckmate()) {
            result = this.board.turn() === 'w' ? 'black' : 'white';
        }
        else if (this.board.isDraw()) {
            result = 'draw';
        }
        else {
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
        }
        catch (error) {
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
    async updateRatings(result) {
        try {
            // ELO rating calculation
            const K = 32; // K-factor
            const white = await prisma.user.findUnique({ where: { id: this.player1Id } });
            const black = await prisma.user.findUnique({ where: { id: this.player2Id } });
            if (!white || !black)
                return;
            // Expected scores
            const expectedWhite = 1 / (1 + Math.pow(10, (black.rating - white.rating) / 400));
            const expectedBlack = 1 - expectedWhite;
            // Actual scores
            let whiteScore;
            let blackScore;
            if (result === 'white') {
                whiteScore = 1;
                blackScore = 0;
            }
            else if (result === 'black') {
                whiteScore = 0;
                blackScore = 1;
            }
            else {
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
        }
        catch (error) {
            console.error('Error updating ratings:', error);
        }
    }
}
//# sourceMappingURL=Game.js.map