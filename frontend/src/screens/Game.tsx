import { Button } from '../components/Button'
import { Chessboard } from '../components/Chessboard'
import { Navbar } from '../components/Navbar'
import { useSocket } from '../hooks/useSocket'
import { useEffect, useState } from 'react'
import { Chess } from 'chess.js'
import { ChessTimer } from '../components/ChessTimer'
import { MoveHistory } from '../components/MoveHistory'

// TODO: Move together, there's code repetition here
export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";
export const ABANDON_GAME = "ABANDON_GAME";

const Game = () => {

    const socket = useSocket();
    const [chess, setChess] = useState(new Chess());
    const [board, setBoard] = useState(chess.board());
    const [started,setStarted] = useState(false);
    const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
    const [whiteTime, setWhiteTime] = useState(600000); // 10 min
    const [blackTime, setBlackTime] = useState(600000);
    const [currentTurn, setCurrentTurn] = useState<'white' | 'black'>('white');
    const [moveHistory, setMoveHistory] = useState<string[]>([]);
    const [canAbandon, setCanAbandon] = useState(false);

    useEffect(() => {
        if(!socket) return;

        const handleMessage = (event: MessageEvent) => {
            const message = JSON.parse(event.data);
            console.log('Received message:', message.type, message.payload);

            switch (message.type) {
                case INIT_GAME:
                    const newGame = new Chess();
                    setChess(newGame);
                    setBoard(newGame.board());
                    setPlayerColor(message.payload.color);
                    setStarted(true);
                    setMoveHistory([]);
                    setCanAbandon(false);
                    setWhiteTime(600000);
                    setBlackTime(600000);
                    setCurrentTurn('white');
                    console.log('New game started as:', message.payload.color);
                    break;
                case "GAME_STATE":
                    //restore game from saved state
                    const restoredChess = new Chess();
                    restoredChess.load(message.payload.fen);
                    setChess(restoredChess);
                    setBoard(restoredChess.board());
                    setPlayerColor(message.payload.color);
                    setMoveHistory(restoredChess.history());
                    setCurrentTurn(restoredChess.turn() === 'w' ? 'white' : 'black');
                    setWhiteTime(message.payload.whiteTime || 600000);
                    setBlackTime(message.payload.blackTime || 600000);
                    setStarted(true);
                    setCanAbandon(message.payload.canAbandon || false);
                    console.log("Game Restored - Color:", message.payload.color, "FEN:", message.payload.fen);
                    break;
                case MOVE:
                    const move = message.payload;
                    setChess(prevChess => {
                        const updatedChess = new Chess(prevChess.fen());
                        updatedChess.move(move);
                        setBoard(updatedChess.board());
                        setCurrentTurn(updatedChess.turn() === 'w' ? 'white' : 'black');
                        setMoveHistory(updatedChess.history());
                        return updatedChess;
                    });
                    break;
                case 'TIME_UPDATE':
                    setWhiteTime(message.payload.whiteTime);
                    setBlackTime(message.payload.blackTime);
                    break;
                case GAME_OVER:
                    console.log("Game Over");
                    break;
                case 'GAME_ABANDONED':
                    const freshGame = new Chess();
                    setStarted(false);
                    setCanAbandon(false);
                    setChess(freshGame);
                    setBoard(freshGame.board());
                    setMoveHistory([]);
                    setWhiteTime(600000);
                    setBlackTime(600000);
                    setCurrentTurn('white');
                    console.log("Game abandoned");
                    break;
            }
        };

        socket.addEventListener('message', handleMessage);

        return () => {
            socket.removeEventListener('message', handleMessage);
        };
    }, [socket]);

    if(!socket) return <div>Connecting to server...</div>

    return <>
        <Navbar />
        <div className="ml-[180px] justify-center flex">
            <div className="pt-8 max-w-4xl w-full">
                <div className="grid grid-cols-6 gap-4 w-full">
                    <div className="col-span-4 w-full">
                        <Chessboard chess={chess} board={board} socket={socket} setBoard={setBoard} setChess={setChess} playerColor={playerColor} />
                    </div>

                    <div className="col-span-2 bg-slate-700 w-full">
                        <ChessTimer 
                            whiteTime={whiteTime}
                            blackTime={blackTime}
                            playerColor={playerColor}
                            currentTurn={currentTurn}
                        />
                        <div className='pt-8'>
                            {!started && <Button onClick={() => {
                                socket.send(JSON.stringify({
                                    type: INIT_GAME,
                                }))
                            }}>
                                Play
                            </Button>}
                            {canAbandon && <Button onClick={() => {
                                socket.send(JSON.stringify({
                                    type: ABANDON_GAME,
                                }))
                            }}>
                                Abandon Game
                            </Button>}
                        </div>
                        {started && <MoveHistory moves={moveHistory} />}
                    </div>
                </div>
            </div>
        </div>
    </>
}

export default Game