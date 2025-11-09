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

function Input(props) {
    return null;
}

function Home() {

    return (
        <>
            <div className={"flex flex-col justify-center min-h-screen gap-2"}>
                <TypographyH1 className={"text-[#E52423]"}>TourSight</TypographyH1>
                <TypographyH3 className={"text-[#921110]"}>Smart predictions. Smarter tourism.</TypographyH3>
                <Card className="w-full pb-0">
                    <CardHeader>
                        <CardTitle>Density of Visitors</CardTitle>
                        <CardDescription>
                            Heatmap visualization tracking the concentration of individuals across the defined space,
                            revealing real-time or aggregate traffic patterns.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[60vh] min-h-[400px] p-0 overflow-clip">
                        <DensityMap/>
                    </CardContent>
                </Card>
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>Density of Visitors</CardTitle>
                        <CardDescription>
                            Heatmap visualization tracking the concentration of individuals across the defined space,
                            revealing real-time or aggregate traffic patterns.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-fit overflow-clip">
                        <BarChart/>
                    </CardContent>
                </Card>
            </div>
        </>
    )
}

export default Home
