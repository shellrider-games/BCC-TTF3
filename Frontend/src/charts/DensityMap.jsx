import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';
import { getData, dateTimeParser } from '../dataExtraction.js';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import {Skeleton} from "@/components/ui/skeleton.jsx";

export default function DensityMap({ data, selectedHour, setSelectedHour, selectedDate }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const heatLayerRef = useRef(null);
    const legendRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current && mapContainerRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([47.7562383605987, 13.5680551914288], 9);
            
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

    // Handle map resize to ensure it fills container
    useEffect(() => {
        if (!mapRef.current) return;

        const handleResize = () => {
            if (mapRef.current) {
                console.log('Resizing map...');
                mapRef.current.invalidateSize();
            }
        };

        // Initial resize after a short delay to ensure container is rendered
        const resizeTimer = setTimeout(handleResize, 100);

        // Add window resize listener
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(resizeTimer);
            window.removeEventListener('resize', handleResize);
        };
    }, [data]);

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

    if (!data) {
        return (
            <div style={{height: '100%', width: '100%', minHeight: '400px'}} className={"rounded-xl"}>
                <Skeleton className="h-full w-full"/>
            </div>
        );
    }

    return (
        <div
            ref={mapContainerRef}
            style={{
                height: '100%',
                width: '100%',
                minHeight: '400px'
            }}
            className={"rounded-xl"}
        />
    );
}