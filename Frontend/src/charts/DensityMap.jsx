import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';
import { getData, dateTimeParser } from '../dataExtraction.js';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';

export default function DensityMap({ data, selectedHour, setSelectedHour, selectedDate }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const heatLayerRef = useRef(null);
    const legendRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current && mapContainerRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([47.9062383605987, 13.5680551914288], 7.5);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapRef.current);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (data && mapRef.current) {
            drawDensityMap(data, selectedHour);
        }
    }, [data, selectedHour, selectedDate]);

    function drawDensityMap(data, selectedHour) {
        const map = mapRef.current;
        if (!map) return;

        if (heatLayerRef.current) {
            map.removeLayer(heatLayerRef.current);
        }
        if (legendRef.current) {
            map.removeControl(legendRef.current);
        }

        let filteredData = data;
        if (selectedDate) {
            filteredData = filteredData.filter(d => {
                const parsed = dateTimeParser(d.timestamp);
                const dataDate = parsed.fullDate;

                // Filter by date (year, month, day)
                const sameDate = (
                    dataDate.getFullYear() === selectedDate.getFullYear() &&
                    dataDate.getMonth() === selectedDate.getMonth() &&
                    dataDate.getDate() === selectedDate.getDate()
                );

                // Filter by time (hour and minute) if time is set
                // const sameTime = (
                //     dataDate.getHours() === selectedDate.getHours() &&
                //     dataDate.getMinutes() === selectedDate.getMinutes()
                // );

                // return sameDate && sameTime;
                return sameDate;
            });
        }

        const heatPoints = filteredData
            .filter(d => d.latitude_coordinate && d.longitude_coordinate)
            .map(d => [d.latitude_coordinate, d.longitude_coordinate, 1.0]);

        console.log('Heat points created:', heatPoints.length, 'for hour:', selectedHour);

        heatLayerRef.current = L.heatLayer(heatPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: {
                0.0: 'blue',
                0.2: 'cyan',
                0.4: 'lime',
                0.6: 'yellow',
                0.8: 'orange',
                1.0: 'red'
            }
        }).addTo(map);
    }

    return (
        <div
            ref={mapContainerRef}
            style={{ height: '90vh', width: '90vw' }}
        />
    );
}