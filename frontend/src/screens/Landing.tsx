import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { Button } from "../components/Button";
import { Navbar } from "../components/Navbar";
import { AuthContext } from '../contexts/AuthContext';

const Landing = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    return <>
        <Navbar />
        <div className="ml-[180px] flex justify-center pt-2">
            <div className="max-w-screen-lg">

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex justify-center">
                        <img src={"/chessboardLandingPage.gif"} className="max-w-96" />
                    </div>
                    <div className='pt-16'>
                        <div className='flex justify-center'>
                            <h1 className='text-5xl font-bold text-white'>Play chess online<br/> on the #2 Site!</h1>
                        </div>
                        <div className='flex justify-center mt-4'>
                            <h1 className='text-xl text-[#ffffff] pl-4'>Join lakhs of Players<br /> on the best online chess site.
                            </h1>
                        </div>

                        <div className='mt-8 flex justify-center'>
                            <Button onClick={() => {
                                navigate(user ? '/game' : '/login');
                            }}>
                                Get Started
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className='pt-16'>
                        <div className='flex justify-center'>
                            <h1 className='text-4xl font-bold text-white text-left'>Improve Your Game<br /> with Lessons</h1>
                        </div>
                        <div className='flex justify-center mt-4'>
                            <h1 className='text-2xl text-[#ffffff] text-left pl-4'>Learn with quick, fun lessons<br /> designed for players of all levels.
                            </h1>
                        </div>

                        <div className='mt-8 flex justify-center'>
                            <Button className='bg-[#4b4847]' onClick={() => {
                                window.open('https://www.youtube.com/playlist?list=PLQKBpQZcRycrvUUxLdVmlfMChJS0S5Zw0', '_blank');
                            }}>
                                <div className='flex flex-row items-center'>
                                    <img src={"/lessons.svg"} className="flex flex-row inline mr-2 w-8 h-8" />
                                    <h2 className='text-2xl text-[#ffffff] text-left pl-6'>Start a Lesson</h2>
                                </div>
                            </Button>
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <img src={"https://assets-configurator.chess.com/image/configurator/lessons_1765898983227.webp"} className="max-w-96" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex justify-center">
                        <img src={"https://assets-configurator.chess.com/image/configurator/bots_1765899028922.webp"} className="max-w-96" />
                    </div>
                    <div className='pt-16'>
                        <div className='flex justify-center'>
                            <h1 className='text-4xl font-bold text-white'>Play chess against bots</h1>
                        </div>

                        <div className='mt-8 flex justify-center'>
                            <Button variant="grey" onClick={() => {
                                navigate('/game');
                            }}>
                                <div className='flex flex-row items-center'>
                                    <img src={"https://www.chess.com/bundles/web/images/color-icons/device-bot.svg"} className="flex flex-row inline mr-2 w-8 h-8" />
                                    <h2 className='text-2xl text-[#ffffff] text-left pl-6'>Challenge a Bot</h2>
                                </div>
                                
                            </Button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </>
}

export default Landing