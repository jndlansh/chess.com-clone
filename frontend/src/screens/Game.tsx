import { Button } from '../components/Button'
import { Chessboard } from '../components/Chessboard'
import { Navbar } from '../components/Navbar'
import { useSocket } from '../hooks/useSocket'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
import { MoveHistory } from '../components/MoveHistory'

// TODO: Move together, there's code repetition here
export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";
export const ABANDON_GAME = "ABANDON_GAME";

const Game = () => {

    const socket = useSocket();
    const navigate = useNavigate();
    const [chess, setChess] = useState(new Chess());
    const [board, setBoard] = useState(chess.board());
    const [started,setStarted] = useState(false);
    const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
    const [whiteTime, setWhiteTime] = useState(600000); // 10 min
    const [blackTime, setBlackTime] = useState(600000);
    const [currentTurn, setCurrentTurn] = useState<'white' | 'black'>('white');
    const [moveHistory, setMoveHistory] = useState<string[]>([]);
    const [canAbandon, setCanAbandon] = useState(false);
    
    // Use a ref to track the current socket to avoid stale closures
    const socketRef = useRef<WebSocket | null>(null);
    const handlerAttachedRef = useRef(false);

    // Handle incoming messages
    const handleMessage = useCallback((event: MessageEvent) => {
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
                const winner = message.payload.winner;
                const reason = message.payload.reason;
                
                // Determine the result message
                let resultMessage = '';
                if (winner === 'draw') {
                    resultMessage = `Game ended in a draw!`;
                } else {
                    const winnerName = winner.charAt(0).toUpperCase() + winner.slice(1);
                    if (reason === 'timeout') {
                        resultMessage = `${winnerName} wins by timeout!`;
                    } else if (reason === 'checkmate') {
                        resultMessage = `${winnerName} wins by checkmate!`;
                    } else {
                        resultMessage = `${winnerName} wins!`;
                    }
                }
                
                alert(resultMessage + '\n\nRatings have been updated.');
                console.log("Game Over:", resultMessage);
                
                // Reset game state
                setCanAbandon(false);
                setStarted(false);
                
                // Navigate to landing page
                setTimeout(() => {
                    navigate('/');
                }, 500);
                break;
            case 'GAME_ABANDONED':
                // Show alert with who abandoned
                const abandonMessage = message.payload.message || 'Game has been abandoned';
                alert(abandonMessage);
                
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
                
                // Navigate to landing page
                setTimeout(() => {
                    navigate('/');
                }, 500);
                break;
        }
    }, [navigate]);

    // Extended WebSocket type with message queue
    interface QueuedWebSocket extends WebSocket {
        messageQueue: MessageEvent[];
        flushQueue: () => void;
    }

    useEffect(() => {
        if(!socket) {
            handlerAttachedRef.current = false;
            return;
        }
        
        // Avoid attaching handler multiple times to the same socket
        if (socketRef.current === socket && handlerAttachedRef.current) {
            return;
        }

        socketRef.current = socket;
        handlerAttachedRef.current = true;
        
        console.log('[Game] Attaching message handler to socket');
        
        // Process any queued messages first
        const queuedSocket = socket as QueuedWebSocket;
        if (queuedSocket.messageQueue && queuedSocket.messageQueue.length > 0) {
            console.log(`[Game] Processing ${queuedSocket.messageQueue.length} queued messages`);
            queuedSocket.messageQueue.forEach(event => handleMessage(event));
            queuedSocket.messageQueue = [];
        }
        
        // Stop queueing and attach the real handler
        if (queuedSocket.flushQueue) {
            queuedSocket.flushQueue();
        }
        socket.addEventListener('message', handleMessage);

        return () => {
            console.log('[Game] Removing message handler from socket');
            socket.removeEventListener('message', handleMessage);
            handlerAttachedRef.current = false;
        };
    }, [socket, handleMessage]);

    if(!socket) return <div>Connecting to server...</div>

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return <>
        <Navbar />
        <div className="ml-[180px] justify-center flex">
            <div className="pt-8 max-w-screen-lg w-full px-4">
                <div className="grid grid-cols-6 gap-4 w-full">
                    {/* Left Column - Chessboard with Timers */}
                    <div className="col-span-4 flex flex-col gap-4">
                        {/* Black Timer - Above Board */}
                        {started && (
                            <div className={`p-4 rounded ${
                                currentTurn === 'black' ? 'bg-yellow-500' : 'bg-gray-600'
                            }`}>
                                <div className="text-white text-xl font-bold">
                                    Black: {formatTime(blackTime)}
                                </div>
                            </div>
                        )}

                        {/* Chessboard */}
                        <Chessboard chess={chess} board={board} socket={socket} playerColor={playerColor} />

                        {/* White Timer - Below Board */}
                        {started && (
                            <div className={`p-4 rounded ${
                                currentTurn === 'white' ? 'bg-yellow-500' : 'bg-gray-600'
                            }`}>
                                <div className="text-white text-xl font-bold">
                                    White: {formatTime(whiteTime)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Controls and Move History */}
                    <div className="col-span-2 bg-slate-700 w-full flex flex-col">
                        <div className='p-8'>
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