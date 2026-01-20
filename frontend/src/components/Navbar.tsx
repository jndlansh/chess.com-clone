import { useNavigate } from 'react-router-dom';
import { Button } from './Button';

export const Navbar = () => {
    const navigate = useNavigate();

    return (
        <nav className="fixed top-0 left-0 w-full bg-[#1f1e1d] shadow-lg z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo/Title */}
                    <div 
                        className="text-white text-2xl font-bold cursor-pointer hover:text-[#5e9141] transition-colors"
                        onClick={() => navigate('/')}
                    >
                        chess.com
                    </div>

                    {/* Auth Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2 text-white hover:text-[#5e9141] transition-colors"
                        >
                            Sign In
                        </button>
                        <Button onClick={() => navigate('/signup')}>
                            Sign Up
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    );
};
