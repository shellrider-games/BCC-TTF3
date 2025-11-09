import {useEffect, useState} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import DensityMap from './charts/DensityMap.jsx'
import BarChart from './charts/BarChart.jsx'
import './App.css'
import {BrowserRouter, Route, Routes} from "react-router";
import Home from "@/pages/Home.jsx";

function App() {
    
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
