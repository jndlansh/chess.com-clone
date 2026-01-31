interface PlayerTimerProps {
    time: number;
    isActive: boolean;
    playerName: string;
    rating: number;
    color: 'white' | 'black';
}

// Clock icon component with ticking animation
const ClockIcon = ({ isActive }: { isActive: boolean }) => (
    <svg 
        className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-300'}`}
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
    >
        <circle cx="12" cy="12" r="10" />
        <path 
            d="M12 6v6l4 2" 
            className={isActive ? 'animate-pulse' : ''}
        />
    </svg>
);

export const PlayerTimer = ({ time, isActive, playerName, rating, color }: PlayerTimerProps) => {
    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const isLowTime = time < 60000; // Less than 1 minute

    return (
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 ${
            isActive 
                ? 'bg-yellow-500 shadow-lg shadow-yellow-500/30' 
                : 'bg-slate-700'
        }`}>
            {/* Player Info */}
            <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                    color === 'white' ? 'bg-white border border-gray-400' : 'bg-gray-900 border border-gray-600'
                }`} />
                <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-200'}`}>
                        {playerName}
                    </span>
                    <span className={`text-xs ${isActive ? 'text-yellow-100' : 'text-gray-400'}`}>
                        {rating}
                    </span>
                </div>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2">
                <ClockIcon isActive={isActive} />
                <span className={`font-mono text-lg font-bold ${
                    isActive 
                        ? isLowTime ? 'text-red-100 animate-pulse' : 'text-white'
                        : isLowTime ? 'text-red-400' : 'text-gray-200'
                }`}>
                    {formatTime(time)}
                </span>
            </div>
        </div>
    );
};

// Legacy component for backward compatibility
interface ChessTimerProps {
    whiteTime: number;
    blackTime: number;
    currentTurn: 'white' | 'black';
}

export const ChessTimer = ({ whiteTime, blackTime, currentTurn }: ChessTimerProps) => {
    return (
        <div className="flex flex-col gap-2">
            <PlayerTimer 
                time={blackTime} 
                isActive={currentTurn === 'black'} 
                playerName="Black" 
                rating={1200}
                color="black"
            />
            <PlayerTimer 
                time={whiteTime} 
                isActive={currentTurn === 'white'} 
                playerName="White" 
                rating={1200}
                color="white"
            />
        </div>
    );
};