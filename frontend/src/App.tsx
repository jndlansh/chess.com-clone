import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Landing from './screens/Landing'
import Game from './screens/Game'
import Login from './screens/Login'
import Signup from './screens/Signup'
import { Navbar } from './components/Navbar'

function App() {

  return (
    <>
      <section className='m-0 p-0 min-h-screen w-full bg-[#2C2B29]'>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path='/' element={<Landing />} />
            <Route path='/game' element={<Game />} />
            <Route path='/login' element={<Login />} />
            <Route path='/signup' element={<Signup />} />
          </Routes>
        </BrowserRouter>
      </section>
    </>
  )
}

export default App
