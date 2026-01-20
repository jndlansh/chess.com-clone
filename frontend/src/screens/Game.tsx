import { Button } from '../components/Button'
import { Chessboard } from '../components/Chessboard'
import { useSocket } from '../hooks/useSocket'
import { useEffect, useState } from 'react'
import { Chess } from 'chess.js'
import { ChessTimer } from '../components/ChessTimer'

// TODO: Move together, there's code repetition here
export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";

const Game = () => {

    const socket = useSocket();
    const [chess, setChess] = useState(new Chess());
    const [board, setBoard] = useState(chess.board());
    const [started,setStarted] = useState(false);
    const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
    const [whiteTime, setWhiteTime] = useState(600000); // 10 min
    const [blackTime, setBlackTime] = useState(600000);
    const [currentTurn, setCurrentTurn] = useState<'white' | 'black'>('white');

    useEffect(() => {
        if(!socket) return;

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case INIT_GAME:
                    setPlayerColor(message.payload.color);
                    setBoard(chess.board());
                    setStarted(true);
                    break;
                case MOVE:
                    const move = message.payload;
                    chess.move(move);
                    setBoard(chess.board());
                    setCurrentTurn(chess.turn() === 'w' ? 'white' : 'black');
                    break;
                case 'TIME_UPDATE':
                    setWhiteTime(message.payload.whiteTime);
                    setBlackTime(message.payload.blackTime);
                    break;
                case GAME_OVER:
                    console.log("Game Over");
                    break;
            }
        }
    }, [socket])

    if(!socket) return <div>Connecting to server...</div>

    return <div className="justify-center flex">
        <div className="pt-8 max-w-4xl w-full">
            <div className="grid grid-cols-6 gap-4 w-full">
                <div className="col-span-4 w-full">
                    <Chessboard chess={chess} board={board} socket={socket} setBoard={setBoard} playerColor={playerColor} />
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

                    </div>
                </div>

            </div>

        </div>
    </div>
}

export default Game