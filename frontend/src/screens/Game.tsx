import { Button } from '../components/Button'
import { Chessboard } from '../components/Chessboard'
import { Navbar } from '../components/Navbar'
import { useSocket, type QueuedWebSocket } from '../hooks/useSocket'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
import { MoveHistory } from '../components/MoveHistory'
import { PlayerTimer } from '../components/ChessTimer'

// TODO: Move together, there's code repetition here
export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";
export const ABANDON_GAME = "ABANDON_GAME";

interface PlayerInfo {
    name: string;
    rating: number;
}

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
    const [whitePlayer, setWhitePlayer] = useState<PlayerInfo>({ name: 'White', rating: 1200 });
    const [blackPlayer, setBlackPlayer] = useState<PlayerInfo>({ name: 'Black', rating: 1200 });
    
    // Use a ref to track the current socket to avoid stale closures
    const socketRef = useRef<WebSocket | null>(null);
    const handlerAttachedRef = useRef(false);
    const chessRef = useRef(chess);
    
    // Keep chessRef in sync with chess state
    useEffect(() => {
        chessRef.current = chess;
    }, [chess]);

    // Handle incoming messages
    const handleMessage = useCallback((event: MessageEvent) => {
        const message = JSON.parse(event.data);
        console.log('Received message:', message.type, message.payload);

        switch (message.type) {
            case INIT_GAME:
                const newGame = new Chess();
                chessRef.current = newGame;
                setChess(newGame);
                setBoard(newGame.board());
                setPlayerColor(message.payload.color);
                setStarted(true);
                setMoveHistory([]);
                setCanAbandon(false);
                setWhiteTime(600000);
                setBlackTime(600000);
                setCurrentTurn('white');
                // Set player info from payload
                if (message.payload.whitePlayer) {
                    setWhitePlayer(message.payload.whitePlayer);
                }
                if (message.payload.blackPlayer) {
                    setBlackPlayer(message.payload.blackPlayer);
                }
                console.log('New game started as:', message.payload.color);
                break;
            case "GAME_STATE":
                //restore game from saved state
                const restoredChess = new Chess();
                restoredChess.load(message.payload.fen);
                chessRef.current = restoredChess;
                setChess(restoredChess);
                setBoard(restoredChess.board());
                setPlayerColor(message.payload.color);
                // Use moves from payload (FEN doesn't preserve history)
                setMoveHistory(message.payload.moves || []);
                setCurrentTurn(restoredChess.turn() === 'w' ? 'white' : 'black');
                setWhiteTime(message.payload.whiteTime || 600000);
                setBlackTime(message.payload.blackTime || 600000);
                setStarted(true);
                setCanAbandon(message.payload.canAbandon || false);
                // Set player info from payload
                if (message.payload.whitePlayer) {
                    setWhitePlayer(message.payload.whitePlayer);
                }
                if (message.payload.blackPlayer) {
                    setBlackPlayer(message.payload.blackPlayer);
                }
                console.log("Game Restored - Color:", message.payload.color, "FEN:", message.payload.fen);
                break;
            case MOVE:
                const move = message.payload;
                // Use ref to get the current chess state (avoids stale closure)
                const updatedChess = new Chess(chessRef.current.fen());
                const madeMove = updatedChess.move(move);
                
                if (madeMove) {
                    chessRef.current = updatedChess;
                    setChess(updatedChess);
                    setBoard(updatedChess.board());
                    setCurrentTurn(updatedChess.turn() === 'w' ? 'white' : 'black');
                    setMoveHistory(prev => [...prev, madeMove.san]);
                }
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

    // Process queued messages - this runs whenever socket changes
    useEffect(() => {
        if(!socket) {
            handlerAttachedRef.current = false;
            return;
        }
        
        const queuedSocket = socket as QueuedWebSocket;
        
        // Avoid attaching handler multiple times to the same socket
        if (socketRef.current === socket && handlerAttachedRef.current) {
            // Still check for any new queued messages
            if (queuedSocket.messageQueue && queuedSocket.messageQueue.length > 0) {
                console.log(`[Game] Processing ${queuedSocket.messageQueue.length} late queued messages`);
                const queuedMessages = [...queuedSocket.messageQueue];
                queuedSocket.messageQueue = [];
                queuedMessages.forEach(event => handleMessage(event));
            }
            return;
        }

        socketRef.current = socket;
        handlerAttachedRef.current = true;
        
        console.log('[Game] Attaching message handler to socket');
        
        // Set the game handler first (BEFORE processing queue)
        queuedSocket.gameHandler = handleMessage;
        
        // Stop queueing new messages (they'll go to gameHandler now)
        queuedSocket.isQueueing = false;
        
        console.log('[Game] Handler attached, queue length:', queuedSocket.messageQueue?.length || 0);
        
        // Process any queued messages
        if (queuedSocket.messageQueue && queuedSocket.messageQueue.length > 0) {
            console.log(`[Game] Processing ${queuedSocket.messageQueue.length} queued messages`);
            // Process each queued message
            const queuedMessages = [...queuedSocket.messageQueue];
            queuedSocket.messageQueue = [];
            queuedMessages.forEach(event => {
                console.log('[Game] Processing queued:', JSON.parse(event.data).type);
                handleMessage(event);
            });
        }

        return () => {
            console.log('[Game] Removing message handler from socket');
            queuedSocket.gameHandler = null;
            handlerAttachedRef.current = false;
        };
    }, [socket, handleMessage]);
    
    // Additional effect to catch any messages that arrived during the render cycle
    useEffect(() => {
        if (!socket) return;
        
        const queuedSocket = socket as QueuedWebSocket;
        
        // Check for queued messages after a short delay to catch any race conditions
        const timeoutId = setTimeout(() => {
            if (queuedSocket.messageQueue && queuedSocket.messageQueue.length > 0) {
                console.log(`[Game] Processing ${queuedSocket.messageQueue.length} delayed queued messages`);
                const queuedMessages = [...queuedSocket.messageQueue];
                queuedSocket.messageQueue = [];
                queuedMessages.forEach(event => handleMessage(event));
            }
        }, 100);
        
        return () => clearTimeout(timeoutId);
    }, [socket, handleMessage]);

    if(!socket) return <div>Connecting to server...</div>

    // Determine which player's timer should be at top/bottom based on player's color
    // The player's own timer should be at the bottom
    const topPlayer = playerColor === 'white' ? blackPlayer : whitePlayer;
    const bottomPlayer = playerColor === 'white' ? whitePlayer : blackPlayer;
    const topTime = playerColor === 'white' ? blackTime : whiteTime;
    const bottomTime = playerColor === 'white' ? whiteTime : blackTime;
    const topColor: 'white' | 'black' = playerColor === 'white' ? 'black' : 'white';
    const bottomColor: 'white' | 'black' = playerColor === 'white' ? 'white' : 'black';

    return <>
        <Navbar />
        <div className="ml-[180px] justify-center flex">
            <div className="pt-8 max-w-screen-lg w-full px-4">
                <div className="grid grid-cols-6 gap-4 w-full">
                    {/* Left Column - Chessboard with Timers */}
                    <div className="col-span-4 flex flex-col gap-2">
                        {/* Opponent Timer - Above Board */}
                        {started && (
                            <PlayerTimer
                                time={topTime}
                                isActive={currentTurn === topColor}
                                playerName={topPlayer.name}
                                rating={topPlayer.rating}
                                color={topColor}
                            />
                        )}

                        {/* Chessboard */}
                        <Chessboard chess={chess} board={board} socket={socket} playerColor={playerColor} />

                        {/* Player Timer - Below Board */}
                        {started && (
                            <PlayerTimer
                                time={bottomTime}
                                isActive={currentTurn === bottomColor}
                                playerName={bottomPlayer.name}
                                rating={bottomPlayer.rating}
                                color={bottomColor}
                            />
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