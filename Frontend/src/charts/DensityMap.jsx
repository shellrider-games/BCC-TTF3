import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';
import { getData } from '../dataExtraction.js';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';

export default function DensityMap() {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const heatLayerRef = useRef(null);
    const legendRef = useRef(null);
    const [data, setData] = useState(null);

    useEffect(() => {
        async function loadData() {
            try {
                const loadedData = await getData();
                console.log('Data loaded:', loadedData);
                setData(loadedData);
            } catch (error) {
                console.error('Error loading data:', error);
            }
        }
        loadData();
    }, []);

    useEffect(() => {
        if (!data) return;

        if (!mapRef.current && mapContainerRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([47.9062383605987, 13.5680551914288], 7.5);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapRef.current);
        }

        if (mapRef.current) {
            drawDensityMap(data);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [data]);

    function drawDensityMap(data) {
        const map = mapRef.current;
        if (!map) return;

        if (heatLayerRef.current) {
            map.removeLayer(heatLayerRef.current);
        }
        if (legendRef.current) {
            map.removeControl(legendRef.current);
        }

        const heatPoints = data
            .filter(d => d.latitude_coordinate && d.longitude_coordinate)
            .map(d => [d.latitude_coordinate, d.longitude_coordinate, 1.0]);

        console.log('Heat points created:', heatPoints.length);

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
            <div style={{ height: '90vh', width: '90vw'}}>
                Loading map data...
            </div>
        );
    }

    return (
        <div
            ref={mapContainerRef}
            style={{height: '100vh', width: '100vh'}}
        />
    );
}