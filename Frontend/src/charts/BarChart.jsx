import * as d3 from 'd3';
import { dateTimeParser } from '../dataExtraction.js';
import React, { useEffect, useRef } from 'react';
import {Skeleton} from "@/components/ui/skeleton.jsx";

export default function BarChart({ data, selectedHour, setSelectedHour, selectedDate }) {
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
        d3.select(svgRef.current).selectAll("*").remove();
        drawBarChart(data);
    }, [data, selectedHour, selectedDate, dimensions]);

    function drawBarChart(data) {
        const {width, height} = dimensions;
        const marginTop = 30;
        const marginRight = 20;
        const marginBottom = 40;
        const marginLeft = 80;

        console.log('Drawing chart with dimensions:', {width, height});
        console.log('Chart margins:', {marginTop, marginRight, marginBottom, marginLeft});
        console.log('Chart drawing area:', {
            left: marginLeft,
            right: width - marginRight,
            top: marginTop,
            bottom: height - marginBottom,
            width: width - marginLeft - marginRight,
            height: height - marginTop - marginBottom
        });

        let hourToHighlight = selectedHour;
        if (selectedDate && hourToHighlight === null) {
            // If a date with time is selected but no bar is clicked, highlight the date's hour
            hourToHighlight = selectedDate.getHours();
        }

        // Filter data by selected date first
        let filteredData = data;
        if (selectedDate) {
            filteredData = data.filter(d => {
                const parsed = dateTimeParser(d.timestamp);
                const dataDate = parsed.fullDate;
                return (
                    dataDate.getFullYear() === selectedDate.getFullYear() &&
                    dataDate.getMonth() === selectedDate.getMonth() &&
                    dataDate.getDate() === selectedDate.getDate()
                );
            });
        }

        console.log('Filtered data by date:', filteredData.length, 'out of', data.length);

        // Then count by hours
        const hourCounts = d3.rollups(
            filteredData,
            v => d3.sum(v, d => +d.value),
            d => dateTimeParser(d.timestamp).hours
        ).map(([hour, value]) => ({ hour, value }));

        hourCounts.sort((a, b) => a.hour - b.hour);
        console.log('Hour counts:', hourCounts);

        // If no data for selected date, show empty chart with message
        if (hourCounts.length === 0) {
            const svg = d3.select(svgRef.current)
                .attr("width", width)
                .attr("height", height)
                .attr("viewBox", [0, 0, width, height])
                .attr("style", "max-width: 100%; height: auto;");

            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "#666")
                .style("font-size", "18px")
                .text("No data available for selected date");

            return;
        }

        const x = d3.scaleBand()
            .domain(hourCounts.map(d => d.hour))
            .range([marginLeft, width - marginRight])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, d3.max(hourCounts, d => d.value)])
            .nice()
            .range([height - marginBottom, marginTop]);

        const svg = d3.select(svgRef.current)
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, width, height])
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("style", "display: block; margin: auto;");

        svg.append("g")
            .selectAll("rect")
            .data(hourCounts)
            .join("rect")
            .attr("x", d => x(d.hour))
            .attr("y", d => y(d.value))
            .attr("height", d => y(0) - y(d.value))
            .attr("width", x.bandwidth())
            .attr("fill", d => d.hour === hourToHighlight ? "orange" : "steelblue")
            .attr("cursor", "pointer")
            .on("click", (event, d) => {
                setSelectedHour(d.hour === selectedHour ? null : d.hour);
            })
            .on("mouseover", function () {
                d3.select(this).attr("opacity", 0.7);
            })
            .on("mouseout", function () {
                d3.select(this).attr("opacity", 1);
            });

        // Add x-axis
        svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(d3.axisBottom(x).tickFormat(d => `${d}:00`))
            .selectAll("text")
            .style("text-anchor", "center");

        // Add y-axis
        svg.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y).tickFormat(d => d3.format(".0f")(d)))
            .call(g => g.select(".domain").remove())
            .call(g => g.append("text")
                .attr("x", -marginLeft)
                .attr("y", 10)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start")
                .text("Count"));
    }

    if (!data) {
        const mockBarCount = 24; // Assuming hourly data like the real chart
        const bars = Array.from({length: mockBarCount}, (_, i) => i);
        const randomHeights = bars.map(() => Math.random() * 350 + 10); // 10% to 90% height

        return (
            <div
                ref={containerRef}
                style={{
                    height: '100%',
                    width: '100%',
                    minHeight: '400px',
                    position: 'relative'
                }}
                className={"rounded-xl"}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: 40, // Matches marginLeft
                        right: 20, // Matches marginRight
                        top: 30, // Matches marginTop
                        bottom: 40, // Matches marginBottom
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between'
                    }}
                >
                    {bars.map((_, index) => (
                        <div
                            key={index}
                            style={{
                                flex: 1,
                                margin: '0 1px' // Small spacing between bars
                            }}
                        >
                            <Skeleton
                                className="w-full"
                                style={{
                                    height: `${randomHeights[index]}px`, // Use pre-generated random heights
                                    minHeight: '15px'
                                }}
                            />
                        </div>
                    ))}
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