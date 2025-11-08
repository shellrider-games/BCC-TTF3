import '../App.css'
import TypographyH1 from "@/components/Typography.jsx";
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

function Input(props) {
    return null;
}

function Home() {

    return (
        <>
            <div className={"flex flex-col justify-center min-h-screen gap-2"}>
                <TypographyH1 className={"text-[#E52423]"}>Data. What? Fuck you.</TypographyH1>
                <Card className="w-full pb-0">
                    <CardHeader>
                        <CardTitle>Cool Chart Titsle</CardTitle>
                        <CardDescription>
                            Description of the Chart
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[60vh] min-h-[400px] p-0 overflow-clip">
                        <DensityMap/>
                    </CardContent>
                </Card>
            </div>
        </>
    )
}

export default Home
