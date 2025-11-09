import '../App.css'
import {TypographyH1, TypographyH3} from "@/components/Typography.jsx";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card.jsx";
import {Button} from "@/components/ui/button.jsx";
import DensityMap from "@/charts/DensityMap.jsx";
import BarChart from "@/charts/BarChart.jsx";
import {useEffect, useState} from "react";
import {Label} from "@/components/ui/label.jsx";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.jsx";
import {Calendar} from "@/components/ui/calendar.jsx";
import {ChevronDownIcon} from "lucide-react";
import {Input} from "@/components/ui/input.jsx";
import {getData} from "@/dataExtraction.js";
import HoteList from "@/charts/HoteList.jsx";

// Debug: Log to verify Input component is imported correctly
console.log('Input component imported:', Input);

function Home() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState((new Date().getHours() < 10 ? '0' : '') + new Date().getHours() + ":" + (new Date().getMinutes() < 10 ? '0' : '') + new Date().getMinutes());
    const [selectedCity, setSelectedCity] = useState("")
    //const [zoom, setZoom] = useState(9);
    const [zoom, setZoom] = useState({
        center: {
            lat: 47.7562383605987,
            lng: 13.5680551914288
        },
        zoom: 9
    });

    const fetchData = async () => {
        try {
            //const response = await fetch('http://10.6.22.67:42069/api/v1/visitors?date=2025-11-01');
            const response = await fetch('http://10.6.22.67:42069/api/v1/visitors?date=' + date.toISOString().split('T')[0]);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const csvText = await response.text();
            console.log(csvText)
            setData(await getData(csvText));

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [date, time]);


    useEffect(() => {
        fetchData();
    }, []);


    return (
        <>
            <div className={"flex flex-col justify-center min-h-screen gap-2"}>
                <div className={"flex flex-row justify-between w-full"}>
                    <div>
                        <TypographyH1 className={"text-[#E52423]"}>TourSight</TypographyH1>
                        <TypographyH3 className={"text-[#921110]"}>Smart predictions. Smarter tourism.</TypographyH3>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex flex-col gap-3">
                            <Label htmlFor="date-picker" className="px-1">
                                Date
                            </Label>
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        id="date-picker"
                                        className="w-32 justify-between font-normal"
                                    >
                                        {date ? date.toLocaleDateString() : "Select date"}
                                        <ChevronDownIcon/>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        captionLayout="dropdown"
                                        onSelect={(date) => {
                                            setDate(date)
                                            setOpen(false)
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label htmlFor="time-picker" className="px-1">
                                Time
                            </Label>
                            <Input
                                type="time"
                                id="time-picker"
                                step="60"
                                defaultValue={time}
                                className="bg-background"
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <div className={"flex flex-row gap-2 h-[60vh] min-h-[400px]"}>
                    <Card className="w-full pb-0 z-1 grow-7">
                        <CardHeader>
                            <CardTitle>Density of Visitors</CardTitle>
                            <CardDescription>
                                Heatmap visualization tracking the concentration of individuals across the defined
                                space,
                                revealing real-time or aggregate traffic patterns.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[60vh] min-h-[400px] p-0 overflow-clip">
                            <DensityMap data={data} zoom={zoom} setSelectedCity={setSelectedCity}/>
                        </CardContent>
                    </Card>
                    <Card className="w-96 pb-0 z-1 grow-3">
                        <CardHeader>
                            <CardTitle>List of Hotels in the Area</CardTitle>
                            <CardDescription>
                                List of hotels located within the area, providing quick access to accommodation options.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className=" overflow-y-scroll">
                            <HoteList setZoom={setZoom}/>
                        </CardContent>
                    </Card>
                </div>
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>Visitors over time</CardTitle>
                        <CardDescription>
                            Bar Chart visualization detailing the volume of visitors across a defined timeline,
                            revealing temporal trends in foot traffic and peak periods of attendance.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-fit overflow-clip">
                        <BarChart data={data} selectedHour={time?.substring(0, 2)}
                                  selectedDate={date}/>
                    </CardContent>
                </Card>
            </div>
        </>
    )
}

export default Home
