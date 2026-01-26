import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import React, { useState } from 'react'
import { MOVE } from '../screens/Game';

export const Chessboard = ({ chess, board, socket, setBoard, setChess, playerColor }: {
  chess: Chess;
  setBoard: React.Dispatch<React.SetStateAction<({
    square: Square;
    type: PieceSymbol;
    color: Color
  } | null)[][]>>;
  setChess: React.Dispatch<React.SetStateAction<Chess>>;
  board: ({
    square: Square;
    type: PieceSymbol;
    color: Color
  } | null)[][];
  socket: WebSocket;
  playerColor: 'white' | 'black' | null;
}) => {
  const [from, setFrom] = useState<null | Square>(null);

  //reverse board if player is black
  const displayedBoard = playerColor === 'black' ? [...board].reverse().map(row => [...row].reverse()) : board;

  return <div className='text-white-200'>
    {displayedBoard.map((row, i) => {
      const boardRow = playerColor === 'black' ? 7 - i : i;

      return <div key={i} className='flex'>
        {row.map((square, j) => {
          const boardCol = playerColor === 'black' ? 7 - j : j;
          const squareRepresentation = String.fromCharCode(97 + boardCol) + "" + (8 - boardRow) as Square;

          return <div onClick={() => {
            if (!playerColor) return; // Can't move if color not assigned
            
            if (!from) {
              // Only allow selecting pieces of player's color
              if (square && square.color === playerColor.charAt(0)) {
                setFrom(squareRepresentation);
              }
            } else {
              // Check if it's the player's turn
              const currentTurn = chess.turn();
              const playerTurn = playerColor === 'white' ? 'w' : 'b';
              
              if (currentTurn !== playerTurn) {
                setFrom(null);
                return;
              }

              // Validate move before sending
              try {
                // Create a new chess instance to test the move
                const testChess = new Chess(chess.fen());
                const move = testChess.move({
                  from,
                  to: squareRepresentation
                });
                
                if (move) {
                  // Valid move, send to server
                  socket.send(JSON.stringify({
                    type: MOVE,
                    payload: {
                      move: {
                        from, 
                        to: squareRepresentation
                      }
                    }
                  }));
                  
                  // Wait for server confirmation - don't update optimistically
                  setFrom(null);
                } else {
                  // Invalid move, reset
                  setFrom(null);
                }
              } catch (e) {
                // Move failed, undo and reset
                setFrom(null);
              }
            }
          }} key={j} className={`w-16 h-16 ${(i + j) % 2 === 0 ? 'bg-[#69923e]' : 'bg-[#fffcb7]'}`}>
            <div className="w-full justify-center flex h-full">
              <div className="h-full justify-center flex flex-col">
                {square ? <img className='w-9' src={`/${square?.color === "b" ? square?.type : `${square?.type?.toUpperCase()} copy`}.png`} /> : null}
              </div>
            </div>
          </div>
        })}
      </div>
    })}
  </div>

}

