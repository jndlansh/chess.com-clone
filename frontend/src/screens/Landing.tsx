import { useNavigate } from 'react-router-dom';
import { Button } from "../components/Button";
import { Navbar } from "../components/Navbar";

const Landing = () => {
    const navigate = useNavigate();
    return <>
        {/* <Navbar /> */}
        <div className="flex justify-center pt-20">
            <div className="pt-8 max-w-screen-lg">

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex justify-center">
                        <img src={"/chessboardLandingPage.gif"} className="max-w-96" />
                    </div>
                    <div className='pt-16'>
                        <div className='flex justify-center'>
                            <h1 className='text-4xl font-bold text-white'>Play chess online on the #2 Site!</h1>
                        </div>

                        <div className='mt-8 flex justify-center'>
                            <Button onClick={() => {
                                navigate('/game');
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
                                navigate('/game');
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
                            <h1 className='text-4xl font-bold text-white'>Play chess online on the #2 Site!</h1>
                        </div>

                        <div className='mt-8 flex justify-center'>
                            <Button onClick={() => {
                                navigate('/game');
                            }}>
                                Play Online
                            </Button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </>
}

export default Landing