import * as d3 from 'd3';
import { getData, dateTimeParser } from '../dataExtraction.js';
import React, { useEffect, useRef, useState } from 'react';

export default function BarChart() {
    const svgRef = useRef(null);
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
        if (!data || !svgRef.current) return;

        // Clear previous chart
        d3.select(svgRef.current).selectAll("*").remove();

        drawBarChart(data);
    }, [data]);

    function drawBarChart(data) {
        const width = 928;
        const height = 500;
        const marginTop = 30;
        const marginRight = 20;
        const marginBottom = 40;
        const marginLeft = 40;

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
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("style", "max-width: 100%; height: auto;");

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
        return <div>Loading chart...</div>;
    }

    return (
        <div>
            <svg ref={svgRef}></svg>
        </div>
    );
}