import React from "react"
import { Link } from "react-router-dom"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import LogoHeader from "./LogoHeader"

export default function Success() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <LogoHeader />
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Richiesta Inviata!</CardTitle>
                    <CardDescription>
                        La richiesta documentale è stata inviata con successo al tuo cliente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center text-xl">
                    Grazie agente, buon lavoro!
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link to="/">
                        <Button className="rounded-xl">Torna all'inizio</Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}