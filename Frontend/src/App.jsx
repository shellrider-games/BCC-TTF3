import { useState } from 'react'
import './App.css'
import {BrowserRouter, Route, Routes} from "react-router";
import Home from "@/pages/Home.jsx";

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
        <div className={"max-w-7xl mx-auto flex flex-col justify-center min-h-screen p-4"}>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home/>}/>
                </Routes>
            </BrowserRouter>
        </div>
    </>
  )
}

export default App
