interface ChessTimerProps {
    whiteTime: number;
    blackTime: number;
    playerColor: 'white' | 'black' | null;
    currentTurn: 'white' | 'black';
}

export const ChessTimer = ({ whiteTime, blackTime, playerColor, currentTurn }: ChessTimerProps) => {
    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            {/* Black Timer */}
            <div className={`p-4 rounded ${
                currentTurn === 'black' ? 'bg-yellow-500' : 'bg-gray-600'
            }`}>
                <div className="text-white text-2xl font-bold">
                    Black: {formatTime(blackTime)}
                </div>
            </div>

            {/* White Timer */}
            <div className={`p-4 rounded ${
                currentTurn === 'white' ? 'bg-yellow-500' : 'bg-gray-600'
            }`}>
                <div className="text-white text-2xl font-bold">
                    White: {formatTime(whiteTime)}
                </div>
            </div>
        </div>
    );
};