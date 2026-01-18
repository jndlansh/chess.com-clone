import { WebSocket } from "ws";
import { Chess } from "chess.js";
import { INIT_GAME, MOVE, GAME_OVER } from "./messages.js";
export class Game {
    player1;
    player2;
    board;
    startTime;
    moveCount = 0;
    constructor(player1, player2) {
        this.player1 = player1;
        this.player2 = player2;
        this.board = new Chess();
        this.startTime = new Date();
        this.player1.send(JSON.stringify({
            type: INIT_GAME,
            payload: {
                color: 'white'
            }
        }));
        this.player2.send(JSON.stringify({
            type: INIT_GAME,
            payload: {
                color: 'black'
            }
        }));
    }
    makeMove(socket, move) {
        if (this.moveCount % 2 === 0 && socket !== this.player1)
            return;
        if (this.moveCount % 2 === 1 && socket !== this.player2)
            return;
        try {
            this.board.move(move);
        }
        catch (error) {
            console.log(error);
            return;
        }
        if (this.board.isGameOver()) {
            //send game over message to both players
            this.player1.emit(JSON.stringify({
                type: GAME_OVER,
                payload: {
                    winner: this.board.turn() === 'w' ? 'black' : 'white'
                }
            }));
            this.player2.emit(JSON.stringify({
                type: GAME_OVER,
                payload: {
                    winner: this.board.turn() === 'w' ? 'black' : 'white'
                }
            }));
            return;
        }
        if (this.moveCount % 2 === 0) {
            this.player2.send(JSON.stringify({
                type: MOVE,
                payload: move
            }));
        }
        else {
            this.player1.send(JSON.stringify({
                type: MOVE,
                payload: move
            }));
        }
        this.moveCount++;
    }
}
//# sourceMappingURL=Game.js.map