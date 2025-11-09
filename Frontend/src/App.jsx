import { useState, useEffect } from 'react'
import DensityMap from './charts/DensityMap.jsx'
import BarChart from './charts/BarChart.jsx'
import { getData } from './dataExtraction.js'
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './App.css'
import {BrowserRouter, Route, Routes} from "react-router";
import Home from "@/pages/Home.jsx";

function App() {
  const [data, setData] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [date, setDate] = useState(null);

  const handleDateChange = (date) => {
    setDate(date);
    setSelectedHour(null);
  };

  const handleHourChange = (hour) => {
    setSelectedHour(hour);

    // Update the date picker to reflect the selected hour
    if (hour !== null) {
      if (date) {
        // If a date is already selected, just update its hour
        const newDate = new Date(date);
        newDate.setHours(hour);
        newDate.setMinutes(0);
        newDate.setSeconds(0);
        setDate(newDate);
      } else {
        // If no date is selected, create a new date with current date and selected hour
        const newDate = new Date();
        newDate.setHours(hour);
        newDate.setMinutes(0);
        newDate.setSeconds(0);
        setDate(newDate);
      }
    }
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
      <div style={{
        padding: '20px',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        background: '#f5f5f5',
        borderBottom: '2px solid #ddd'
      }}>
        <div>
          <DatePicker
            selected={date}
            onChange={handleDateChange}
            withPortal
            showTimeSelect
            dateFormat="MMMM d, yyyy HH:mm"
            timeFormat='HH:mm'
            placeholderText="All dates"
          />
        </div>

        {(date || selectedHour !== null) && (
          <button
            onClick={clearAllFilters}
            style={{
              padding: '8px 16px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ✕ Clear All Filters
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
        <div>
          <h3 style={{ margin: '0 0 10px 0' }}>Density Map</h3>
          <DensityMap data={data} selectedHour={selectedHour} setSelectedHour={handleHourChange} selectedDate={date} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 10px 0' }}>Hourly Distribution</h3>
          <BarChart
            data={data}
            selectedHour={selectedHour}
            setSelectedHour={handleHourChange}
            selectedDate={date}
          />
        </div>
      </div>
    </>
  )
}

export default App