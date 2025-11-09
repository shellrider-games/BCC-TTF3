import * as d3 from 'd3';

export async function getData(dataString) {
    try {
        const parser = d3.dsvFormat(",");
        const csvData = parser.parse(dataString);
        //const csvData = await d3.dsv(";", "Data/POI_Full.csv");
        const data = csvData.map(d => ({
            installationId: d.installationId,
            timestamp: d.timestamp,
            value: +d.value,
            city: d.Ort,
            name: d.Name,
            trackerId: d.TrackerID,
            tourDataId: d.TourdataID,
            objectID: d.ObjectGUID,
            latitude_coordinate: +d.Latitude?.replace(',', '.'),
            longitude_coordinate: +d.Longitude?.replace(',', '.')
        }));
        return data;
    } catch (error) {
        console.error('Error in getData():', error);
        throw error;
    }
}

export function dateTimeParser(dateString) {
    const date = new Date(dateString);

    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hours: date.getHours(),
        minutes: date.getMinutes(),
        seconds: date.getSeconds(),
        fullDate: date
    };
}