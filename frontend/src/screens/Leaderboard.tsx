// frontend/src/screens/Leaderboard.tsx
import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  rating: number;
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('http://localhost:8080/leaderboard');
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data = await response.json();
      setLeaderboard(data.leaderboard);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Poll for updates every 10 seconds to keep leaderboard dynamic
    const interval = setInterval(fetchLeaderboard, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="ml-[180px] flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ml-[180px] flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="ml-[180px] min-h-screen py-8 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Leaderboard</h1>
        
        <div className="bg-[#262522] rounded-lg shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#5e9141] text-white">
                  <th className="py-4 px-6 text-left font-semibold text-lg w-24">Rank</th>
                  <th className="py-4 px-6 text-center font-semibold text-lg">Name</th>
                  <th className="py-4 px-6 text-left font-semibold text-lg w-32">Rating</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 px-6 text-center text-gray-400 text-lg">
                      No players yet
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((entry, index) => (
                    <tr
                      key={`${entry.rank}-${entry.name}`}
                      className={`
                        ${index % 2 === 0 ? 'bg-[#2C2B29]' : 'bg-[#262522]'}
                        hover:bg-[#3d3d3d] transition-colors
                        ${entry.rank <= 3 ? 'font-bold' : ''}
                      `}
                    >
                      <td className="py-4 px-6 text-white">
                        <div className="flex items-center gap-2">
                          {entry.rank === 1 && <span className="text-2xl">🥇</span>}
                          {entry.rank === 2 && <span className="text-2xl">🥈</span>}
                          {entry.rank === 3 && <span className="text-2xl">🥉</span>}
                          <span className={`text-lg ${entry.rank <= 3 ? 'text-[#5e9141]' : ''}`}>
                            #{entry.rank}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-white text-lg">{entry.name}</td>
                      <td className="py-4 px-6 text-white text-lg font-semibold">
                        {entry.rating}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}