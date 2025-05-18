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

export default function ProductsPrivate() {
  const options = [
    { title: "Prestito Personale", description: "Dipendente" },
    { title: "Prestito Personale", description: "Pensionato" },
    { title: "Cessione del Quinto", description: "Dipendente" },
    { title: "Cessione del Quinto", description: "Pensionato" },
    { title: "Prestito per Liquidità", description: "Dipendente" },
    { title: "Prestito per Liquidità", description: "Pensionato" },
    { title: "Consolidamento Debiti", description: "Dipendente" },
    { title: "Consolidamento Debiti", description: "Pensionato" },
    { title: "Mutuo", description: "Prima Casa" },
    { title: "Mutuo", description: "Seconda Casa" },
    { title: "Mutuo", description: "Ristrutturazione" },
    { title: "Mutuo", description: "Liquidità" },
    { title: "Prestito Auto", description: "Nuova" },
    { title: "Prestito Auto", description: "Usata" },
    { title: "Prestito Moto", description: "Nuova" },
    { title: "Prestito Moto", description: "Usata" },
    { title: "Prestito Bici Elettrica", description: "Dipendente" },
    { title: "Prestito Elettronica", description: "Dipendente" },
    { title: "Prestito Viaggi", description: "Dipendente" },
    { title: "Prestito Arredamento", description: "Dipendente" },
  ]

  const [search, setSearch] = useState("")
  const filteredOptions = options.filter(opt =>
    opt.title.toLowerCase().includes(search.toLowerCase()) ||
    opt.description.toLowerCase().includes(search.toLowerCase())
  )

  const { setValue, formState: { isSubmitting } } = useFormContext()
  const nav = useNavigate()

  function OptionCard({ title, description }) {
    const id = `${title}-${description}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    const handleClick = () => {
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
        <div className="w-full max-w-screen-lg mb-6 px-2">
          <h1 className="flex justify-center mt-5 mb-5 font-semibold text-3xl">
            Prodotti Privati
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
