import {useEffect, useState} from "react";
// Assuming the path to your data is correct
import hotels from '../../public/Data/csvjson.json';
import {Button} from "@/components/ui/button.jsx";
import {Input} from "@/components/ui/input.jsx";
import {Label} from "@/components/ui/label.jsx";
import {RotateCcwIcon} from "@/components/ui/icons/lucide-rotate-ccw.jsx";

export default function HotelList({setZoom}) {
    // State to store the user's search input (initialize to an empty string for easier filtering)
    const [searchTerm, setSearchTerm] = useState('');
    // State to store the list of hotels that match the search term
    const [filteredHotels, setFilteredHotels] = useState(hotels);

    // useEffect hook to run the filtering logic whenever the searchTerm changes
    useEffect(() => {
        // 1. Convert the search term to lowercase for case-insensitive searching
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        // 2. Filter the original 'hotels' array
        const results = hotels.filter(hotel =>
            // Check if the hotel's title includes the search term
            // Ensure hotel.title exists before calling .toLowerCase()
            hotel.title && hotel.title.toLowerCase().includes(lowerCaseSearchTerm)
        );

        // 3. Update the state with the filtered results
        setFilteredHotels(results);
    }, [searchTerm]); // Dependency array: re-run this effect whenever 'searchTerm' changes

    // Handler function to update the searchTerm state when the input changes
    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    return (
        <>
            <div className={"overflow-y-scroll"}>
                <Label htmlFor="search">Search</Label>
                {/* Bind the input's value to the searchTerm state
                    and attach the onChange handler to update the state
                */}
                <div className={"flex flex-row gap-1"}>
                    <Input
                        type="text"
                        id="search"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="mb-4" // Added some margin for spacing
                    />
                    <Button variant="outline" onclick={() => setZoom({
                        center: {
                            lat: 47.7562383605987,
                            lng: 13.5680551914288
                        },
                        zoom: 9
                    })}>
                        <RotateCcwIcon></RotateCcwIcon>
                    </Button>
                </div>

                {/* Map over the filteredHotels array instead of the original 'hotels' array */}
                {filteredHotels.length > 0 ? (
                    filteredHotels.map((hotel, index) => (
                        <Button
                            key={index} // Use index as key if hotel objects don't have a unique ID
                            variant="outline"
                            className={"w-full mb-2"} // Added some bottom margin for button spacing
                            onClick={() => {
                                setZoom({
                                    center: {
                                        lat: parseFloat(hotel.latitude),
                                        lng: parseFloat(hotel.longitude)
                                    },
                                    zoom: 15
                                });
                            }}
                        >
                            {hotel.title}
                        </Button>
                    ))
                ) : (
                    <p className="text-center text-gray-500 mt-4">No hotels found matching "{searchTerm}"</p>
                )}
            </div>
        </>
    );
}