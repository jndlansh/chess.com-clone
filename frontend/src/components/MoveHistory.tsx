interface MoveHistoryProps {
    moves: string[];
}

export const MoveHistory = ({ moves }: MoveHistoryProps) => {
    // If moves are in {from: "e2", to: "e4"} format
    const formatMove = (move: any) => {
        if (typeof move === 'string') return move;
        return `${move.from}→${move.to}`;
    };

    const movePairs: Array<[any, any?]> = [];
    for (let i = 0; i < moves.length; i += 2) {
        movePairs.push([moves[i], moves[i + 1]]);
    }

    return (
        <div className="bg-slate-800 rounded p-4 h-96 overflow-y-auto">
            <h3 className="text-white text-xl font-bold mb-4">Move History</h3>
            
            <div className="space-y-1">
                {movePairs.map(([whiteMove, blackMove], index) => (
                    <div 
                        key={index} 
                        className="flex items-center gap-3 text-white hover:bg-slate-700 p-2 rounded"
                    >
                        <span className="text-gray-400 w-8">{index + 1}.</span>
                        <span className="flex-1 font-mono text-sm">
                            {formatMove(whiteMove)}
                        </span>
                        {blackMove && (
                            <span className="flex-1 font-mono text-sm">
                                {formatMove(blackMove)}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};