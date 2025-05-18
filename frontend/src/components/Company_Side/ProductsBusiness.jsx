// ProductsBusiness.jsx
import React, { useState } from "react"
import { useFormContext } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import LogoHeader from "./LogoHeader"

export default function ProductsBusiness() {
    // Lista dei prodotti (stessi title/description di prima)
    const options = [
        { title: "Prestito a Breve Termine", description: "S.r.l." },
        { title: "Prestito a Breve Termine", description: "S.p.A." },
        { title: "Mutuo Immobiliare", description: "Commerciale" },
        { title: "Mutuo Immobiliare", description: "Industrial" },
        { title: "Leasing Operativo", description: "Veicoli" },
        { title: "Leasing Finanziario", description: "Macchinari" },
        { title: "Fido Bancario", description: "S.r.l." },
        { title: "Fido Bancario", description: "S.p.A." },
        { title: "Anticipo Fatture", description: "Pro-soluto" },
        { title: "Anticipo Fatture", description: "Pro-solvendo" },
        { title: "Factoring", description: "Full Service" },
        { title: "Factoring", description: "No-recourse" },
        { title: "Linea di Credito", description: "Multicurrency" },
        { title: "Linea di Credito", description: "Overdraft" },
        { title: "Finanziamento R&D", description: "Start-up Innovativa" },
        { title: "Finanziamento R&D", description: "Impresa Consolidata" },
        { title: "Noleggio a Lungo Termine", description: "Fleet Aziendale" },
        { title: "Noleggio a Lungo Termine", description: "Veicoli Commerciali" },
        { title: "Mutuo per Stabilimenti", description: "Capannoni" },
        { title: "Mutuo per Stabilimenti", description: "Uffici" },
    ]

    // Stato per il filtro
    const [search, setSearch] = useState("")

    // Contesto di RHF e navigazione
    const { setValue, formState: { isSubmitting } } = useFormContext()
    const nav = useNavigate()

    // Filtra in base alla ricerca
    const filteredOptions = options.filter(opt =>
        opt.title.toLowerCase().includes(search.toLowerCase()) ||
        opt.description.toLowerCase().includes(search.toLowerCase())
    )

    // Componente Card che salva il prodotto e naviga
    function OptionCard({ title, description }) {
        // Genera un ID univoco da title+description
        const id = `${title}-${description}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")

        const handleClick = () => {
            // Imposta il prodotto nel form e vai a /client-data
            setValue("products", [id], {
                shouldValidate: true,
                shouldDirty: true
            })
            nav("/client-data")
        }

        return (
            <Card className="w-full sm:w-64">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        type="button"
                        onClick={handleClick}
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-black"
                    >
                        Avanti
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <LogoHeader />
            <div className="flex flex-col items-center py-12 px-2 sm:px-4 w-full">
                {/* Search bar */}
                <div className="w-full max-w-screen-lg mb-6 px-2">
                    <h1 className="flex justify-center mt-5 mb-5 font-semibold text-3xl">
                        Prodotti Aziende
                    </h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Cerca prodotti..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 rounded-xl w-full"
                        />
                    </div>
                </div>

                {/* Grid di card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-8 lg:gap-x-16 gap-y-6 justify-items-center w-full max-w-screen-lg px-2">
                    {filteredOptions.map((opt, idx) => (
                        <OptionCard
                            key={idx}
                            title={opt.title}
                            description={opt.description}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
