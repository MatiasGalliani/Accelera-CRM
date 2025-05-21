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
import { cn } from "@/lib/utils"

export default function ActionCard({ 
    title, 
    description, 
    buttonText = "Inizia", 
    to = "/client-type",
    icon: Icon = FaArrowRight,
    disabled = false
}) {
    return (
        <Card className={cn(
            "w-full h-full shadow-lg transition-transform hover:scale-105",
            disabled && "opacity-60 cursor-not-allowed hover:scale-100"
        )}>
            <CardHeader className="text-center">
                <CardTitle className="text-xl sm:text-2xl">
                    {title}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                    {description}
                </CardDescription>
            </CardHeader>

            <CardContent className="flex justify-center pb-6">
                {disabled ? (
                    <Button 
                        disabled 
                        className="w-full sm:w-auto rounded-xl bg-black hover:bg-gray-800 inline-flex items-center justify-center cursor-not-allowed"
                    >
                        {buttonText}
                        <Icon className="ml-2 w-4 h-4" aria-hidden="true" />
                    </Button>
                ) : (
                    <Link to={to} className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto rounded-xl bg-black hover:bg-gray-800 inline-flex items-center justify-center">
                            {buttonText}
                            <Icon className="ml-2 w-4 h-4" aria-hidden="true" />
                        </Button>
                    </Link>
                )}
            </CardContent>
        </Card>
    )
}