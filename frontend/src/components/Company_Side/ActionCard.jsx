import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"
import { FaArrowRight } from "react-icons/fa"

export default function ActionCard({ 
    title, 
    description, 
    buttonText = "Inizia", 
    to = "/client-type",
    icon: Icon = FaArrowRight 
}) {
    return (
        <Card className="w-full h-full shadow-lg transition-transform hover:scale-105">
            <CardHeader className="text-center">
                <CardTitle className="text-xl sm:text-2xl">
                    {title}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                    {description}
                </CardDescription>
            </CardHeader>

            <CardContent className="flex justify-center pb-6">
                <Link to={to} className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto rounded-xl bg-black hover:bg-gray-800 inline-flex items-center justify-center">
                        {buttonText}
                        <Icon className="ml-2 w-4 h-4" aria-hidden="true" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    )
}