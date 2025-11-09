import * as d3 from 'd3';
import React, {useEffect, useRef, useState} from 'react';
import {getData} from '../dataExtraction.js';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import {Skeleton} from "@/components/ui/skeleton.jsx";

export default function DensityMap({data, zoom}) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const heatLayerRef = useRef(null);
    const legendRef = useRef(null);

    useEffect(() => {
        if (!data) return;

        if (!mapRef.current && mapContainerRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([zoom.center.lat, zoom.center.lng], zoom.zoom);

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
    }, [data, zoom]);

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

    function drawDensityMap(data) {
        const map = mapRef.current;
        if (!map) return;

        if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);

        const heatPoints = data
            .filter(d => d.latitude_coordinate && d.longitude_coordinate)
            .map(d => ({
                lat: d.latitude_coordinate,
                lng: d.longitude_coordinate,
                value: typeof d.value === 'number' && !isNaN(d.value) ? d.value : 1,
                city: d.city,
                timestamp: d.timestamp,
                temperature_2m: d.temperature_2m,
                humidity_2m: d.humidity_2m,
                wind_speed: d.wind_speed
            }));

        if (heatPoints.length === 0) return;

        const values = heatPoints.map(d => d.value);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const radiusScale = d3.scaleLinear().domain([minVal, maxVal]).range([15, 50]);
        const intensityScale = d3.scaleLinear().domain([minVal, maxVal]).range([0.3, 1.0]);

        const createHeatLayer = (zoomFactor = 1) => {
            const points = heatPoints.flatMap(d => {
                const count = Math.max(1, Math.min(50, Math.round(radiusScale(d.value) / 5 * zoomFactor)));
                return Array(count).fill([d.lat, d.lng, intensityScale(d.value)]);
            });

            return L.heatLayer(points, {
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
        };

        heatLayerRef.current = createHeatLayer();

        map.on('zoomend', () => {
            const zoom = map.getZoom();
            const zoomFactor = 1 + (zoom - 9) * 0.3;
            if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
            heatLayerRef.current = createHeatLayer(zoomFactor);
        });

        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            let nearestPoint = null;
            let minDistance = Infinity;

            heatPoints.forEach(d => {
                const distance = Math.sqrt(Math.pow(lat - d.lat, 2) + Math.pow(lng - d.lng, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestPoint = d;
                }
            });

            if (!nearestPoint) return;

            setSelectedCity(nearestPoint.city);

            const timeStr = selectedTime || "00:00";
            const [hours, minutes] = timeStr.split(":").map(Number);
            const selDate = selectedDate ? new Date(selectedDate) : new Date();
            const selDateUTC = new Date(Date.UTC(
                selDate.getFullYear(),
                selDate.getMonth(),
                selDate.getDate(),
                hours,
                minutes,
                0
            ));

            const cityData = heatPoints.filter(d => d.city === nearestPoint.city);
            const weatherPoint = cityData.reduce((closest, curr) => {
                const currTime = new Date(curr.timestamp).getTime();
                const selTime = selDateUTC.getTime();
                if (!closest) return curr;
                const closestTime = new Date(closest.timestamp).getTime();
                return Math.abs(currTime - selTime) < Math.abs(closestTime - selTime) ? curr : closest;
            }, null);

            // Black-and-white ShadCN-style tooltip
            const content = weatherPoint
                ? `<div style="
                        font-family:sans-serif;
                        min-width:180px;
                        background:white;
                        padding:12px;
                        border-radius:0.75rem;
                        box-shadow:0 2px 10px rgba(0,0,0,0.12);
                        line-height:1.4;
                        color:#111;">
                      <div style="font-weight:600; font-size:1.05em;">${weatherPoint.city}</div>
                      <hr style="margin:6px 0; border-color:#E5E7EB;">
                      <div>Temperature: <span style="font-weight:500;">${weatherPoint.temperature_2m}°C</span></div>
                      <div>Humidity: <span style="font-weight:500;">${weatherPoint.humidity_2m}%</span></div>
                      <div>Wind Speed: <span style="font-weight:500;">${weatherPoint.wind_speed} m/s</span></div>
                   </div>`
                : `<div style="
                        font-family:sans-serif;
                        min-width:180px;
                        background:white;
                        padding:12px;
                        border-radius:0.75rem;
                        box-shadow:0 2px 10px rgba(0,0,0,0.12);
                        line-height:1.4;
                        color:#111;">
                      <div style="font-weight:600; font-size:1.05em;">${nearestPoint.city}</div>
                      <div style="font-size:0.85em; color:#555;">No weather data for selected date/time</div>
                   </div>`;

            L.popup()
                .setLatLng([nearestPoint.lat, nearestPoint.lng])
                .setContent(content)
                .openOn(map);
        });
    }

    if (!data) {
        return (
            <div style={{ height: '100%', width: '100%', minHeight: '400px' }} className="rounded-xl">
                <Skeleton className="h-full w-full" />
            </div>
        );
    }

    return (
        <div
            ref={mapContainerRef}
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
            className="rounded-xl"
        />
    );
}
