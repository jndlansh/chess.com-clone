import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const Navbar = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);

    return (
        <nav className="fixed top-0 left-0 h-screen w-[180px] bg-[#262522] text-white flex flex-col z-50 shadow-xl">
            {/* Logo */}
            <div 
                className="p-4 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/')}
            >
                <div className="w-8 h-8 bg-[#5e9141] rounded-full flex items-center justify-center text-xl font-bold">
                    ♟
                </div>
                <span className="text-xl font-bold">Chess.com</span>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 flex flex-col gap-1 py-4">
                <NavItem 
                    icon="♟" 
                    label="Play" 
                    onClick={() => navigate('/game')}
                />
                <NavItem 
                    icon="🧩" 
                    label="Puzzles" 
                    onClick={() => {}}
                />
                <NavItem 
                    icon="📚" 
                    label="Learn" 
                    onClick={() => {}}
                />
                <NavItem 
                    icon="👁" 
                    label="Watch" 
                    onClick={() => {}}
                />
                <NavItem 
                    icon="📰" 
                    label="News" 
                    onClick={() => {}}
                />
                <NavItem 
                    icon="👥" 
                    label="Social" 
                    onClick={() => {}}
                />
                <NavItem 
                    icon="⋯" 
                    label="More" 
                    onClick={() => {}}
                />
            </div>

            {/* Search Bar */}
            <div className="px-3 mb-4">
                <input 
                    type="text" 
                    placeholder="Search" 
                    className="w-full bg-[#3d3d3d] text-white px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5e9141]"
                />
            </div>

            {/* Auth Buttons */}
            <div className="px-3 pb-4 flex flex-col gap-2">
                {user ? (
                    <>
                        <div className="text-sm px-3 py-2 text-gray-300">
                            {user.username} ({user.rating})
                        </div>
                        <button
                            onClick={logout}
                            className="w-full px-4 py-2 bg-[#3d3d3d] rounded hover:bg-[#4d4d4d] transition-colors text-sm"
                        >
                            Log Out
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => navigate('/signup')}
                            className="w-full px-4 py-2 bg-[#5e9141] rounded hover:bg-[#6ea551] transition-colors font-semibold text-sm"
                        >
                            Sign Up
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full px-4 py-2 bg-[#3d3d3d] rounded hover:bg-[#4d4d4d] transition-colors text-sm"
                        >
                            Log In
                        </button>
                    </>
                )}
            </div>

            {/* Language Selector */}
            <div className="px-3 pb-4 border-t border-[#3d3d3d] pt-3">
                <div className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
                    <span>🌐</span>
                    <span>English</span>
                </div>
            </div>
        </nav>
    );
};

// Navigation Item Component
const NavItem = ({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) => {
    return (
        <div 
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded cursor-pointer hover:bg-[#3d3d3d] transition-colors group"
        >
            <span className="text-xl">{icon}</span>
            <span className="text-sm font-medium group-hover:text-[#5e9141]">{label}</span>
        </div>
    );
};
