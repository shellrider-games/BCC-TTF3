import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import DensityMap from './charts/DensityMap.jsx'
import BarChart from './charts/BarChart.jsx'
import './App.css'
import {BrowserRouter, Route, Routes} from "react-router";
import Home from "@/pages/Home.jsx";

function App() {
  const [data, setData] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [date, setDate] = useState(null);

  const handleDateChange = (date) => {
    setDate(date);
    // Reset hour selection when date changes
    setSelectedHour(null);
  };

  const clearAllFilters = () => {
    setDate(null);
    setSelectedHour(null);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const loadedData = await getData();
        console.log('Data loaded in App:', loadedData);
        setData(loadedData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
    loadData();
  }, []);

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
