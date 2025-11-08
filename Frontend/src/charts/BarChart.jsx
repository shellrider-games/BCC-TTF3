import * as d3 from 'd3';
import { getData, dateTimeParser } from '../dataExtraction.js';
import React, { useEffect, useRef, useState } from 'react';

export default function BarChart() {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [data, setData] = useState(null);
    const [dimensions, setDimensions] = useState({width: 928, height: 500});

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

    // Handle container resize to ensure chart fills container
    useEffect(() => {
        if (!containerRef.current) return;

        const handleResize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                console.log('Container rect:', rect);
                console.log('Resizing chart container to:', {
                    width: rect.width,
                    height: rect.height
                });

                // Ensure minimum dimensions
                const width = Math.max(rect.width, 300);
                const height = Math.max(rect.height, 200);

                setDimensions({width, height});
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
    }, []);

    useEffect(() => {
        if (!data || !svgRef.current) return;

        // Clear previous chart
        d3.select(svgRef.current).selectAll("*").remove();

        drawBarChart(data);
    }, [data, dimensions]);

    function drawBarChart(data) {
        const {width, height} = dimensions;
        const marginTop = 30;
        const marginRight = 20;
        const marginBottom = 40;
        const marginLeft = 40;

        console.log('Drawing chart with dimensions:', {width, height});

        // Group data by hour and count occurrences
        const hourCounts = d3.rollups(
            data,
            v => v.length, // Count entries per hour
            d => dateTimeParser(d.timestamp).hours
        ).map(([hour, count]) => ({ hour, count }));

        // Sort by hour
        hourCounts.sort((a, b) => a.hour - b.hour);

        console.log('Hour counts:', hourCounts);

        // Create scales
        const x = d3.scaleBand()
            .domain(hourCounts.map(d => d.hour))
            .range([marginLeft, width - marginRight])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, d3.max(hourCounts, d => d.count)])
            .nice()
            .range([height - marginBottom, marginTop]);

        // Create SVG
        const svg = d3.select(svgRef.current)
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, width, height])
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("style", "display: block; margin: auto;");

        // Add bars
        svg.append("g")
            .attr("fill", "steelblue")
            .selectAll("rect")
            .data(hourCounts)
            .join("rect")
            .attr("x", d => x(d.hour))
            .attr("y", d => y(d.count))
            .attr("height", d => y(0) - y(d.count))
            .attr("width", x.bandwidth());

        // Add x-axis
        svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(d3.axisBottom(x).tickFormat(d => `${d}:00`))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        // Add y-axis
        svg.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y))
            .call(g => g.select(".domain").remove())
            .call(g => g.append("text")
                .attr("x", -marginLeft)
                .attr("y", 10)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start")
                .text("Count"));
    }

    if (!data) {
        return (
            <div style={{height: '100%', width: '100%', minHeight: '400px'}} className={"rounded-xl"}>
                <div className="h-full w-full flex items-center justify-center">
                    Loading chart...
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{
                height: '100%',
                width: '100%',
                minHeight: '100px',
                position: 'relative'
            }}
            className={"rounded-xl"}
        >
            <svg
                ref={svgRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%'
                }}
            ></svg>
        </div>
    );
}