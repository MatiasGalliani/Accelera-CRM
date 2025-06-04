import React, { useState } from "react"
import { useFormContext } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, X, Check } from "lucide-react"

export default function DocumentsBusinessGrouped() {
  const documentGroups = [
    {
      title: "S.r.l. / S.p.A.",
      items: [
        { title: "Visura Camerale", description: "Camera di Commercio aggiornata" },
        { title: "Statuto e Atto Costitutivo", description: "Documenti societari" },
        { title: "Ultimi 2 Bilanci", description: "Firmati e depositati" },
        { title: "Ultime Dichiarazioni dei Redditi", description: "Modello Unico SC" },
        { title: "Ultimi F24", description: "Pagamenti fiscali recenti" },
        { title: "Estratti Conto Bancari", description: "Ultimi 6–12 mesi" },
        { title: "Documento Legale Rappresentante", description: "Carta d'identità e codice fiscale" },
        { title: "Elenco Soci", description: "Con percentuali di possesso" }
      ]
    },
    {
      title: "Ditta Individuale",
      items: [
        { title: "Certificato di Iscrizione alla CCIAA", description: "Attività regolarmente registrata" },
        { title: "Ultime Dichiarazioni dei Redditi", description: "Modello Unico PF con ricevute" },
        { title: "Ultimi F24", description: "Versamenti fiscali" },
        { title: "Estratti Conto Bancari", description: "Ultimi 6 mesi" },
        { title: "Documento Identità Titolare", description: "Carta d'identità e codice fiscale" }
      ]
    },
    {
      title: "Start-up Innovativa",
      items: [
        { title: "Iscrizione Registro Start-up", description: "Sezione speciale CCIAA" },
        { title: "Pitch o Business Plan", description: "Versione aggiornata" },
        { title: "Ultimo Bilancio (se disponibile)", description: "O stato patrimoniale provvisorio" },
        { title: "Dichiarazioni dei Soci", description: "Fonti di capitale e autorizzazioni" },
        { title: "Documento Legale Rappresentante", description: "Carta d'identità e codice fiscale" }
      ]
    }
  ]

  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState([])
  const { setValue, formState: { isSubmitting } } = useFormContext()
  const nav = useNavigate()

  const toggleSelection = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const selectAllInGroup = (group) => {
    const groupIds = group.items.map(doc => 
      `${group.title}-${doc.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    )
    setSelected(prev => {
      const newSelected = [...prev]
      groupIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id)
        }
      })
      return newSelected
    })
  }

  const deselectAllInGroup = (group) => {
    const groupIds = group.items.map(doc => 
      `${group.title}-${doc.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    )
    setSelected(prev => prev.filter(id => !groupIds.includes(id)))
  }

  const clearAllSelections = () => {
    setSelected([])
  }

  const handleSubmit = () => {
    setValue("documentiAzienda", selected, {
      shouldValidate: true,
      shouldDirty: true
    })
    nav("/client-data")
  }

  function DocumentCard({ title, description, groupTitle }) {
    const id = `${groupTitle}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const isChecked = selected.includes(id)

    return (
      <Card 
        className={`w-full sm:w-64 transition-all duration-200 cursor-pointer hover:shadow-lg ${
          isChecked ? 'border-2 border-black' : ''
        }`}
        onClick={() => toggleSelection(id)}
      >
        <CardHeader className="flex items-start gap-2">
          <div className={`p-1 rounded-full ${isChecked ? 'bg-black text-white' : 'bg-gray-100'}`}>
            {isChecked ? <Check className="h-4 w-4" /> : <div className="h-4 w-4" />}
          </div>
          <div className="grid gap-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm text-gray-600">{description}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    )
  }

  function DocumentGroup({ group }) {
    const filteredItems = group.items.filter(doc =>
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.description.toLowerCase().includes(search.toLowerCase())
    )

    if (filteredItems.length === 0) return null

    const groupIds = group.items.map(doc => 
      `${group.title}-${doc.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    )
    const selectedInGroup = selected.filter(id => groupIds.includes(id))

    return (
      <div className="w-full max-w-screen-lg mb-12 px-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{group.title}</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectAllInGroup(group)}
              className="text-sm"
            >
              Seleziona tutti
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deselectAllInGroup(group)}
              className="text-sm"
            >
              Deseleziona tutti
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
          {filteredItems.map((doc, idx) => (
            <DocumentCard
              key={`${group.title}-${idx}`}
              title={doc.title}
              description={doc.description}
              groupTitle={group.title}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center py-12 px-2 sm:px-4 w-full">
        <div className="w-full max-w-screen-lg mb-6 px-2">
          <div className="flex justify-between items-center mb-6">
            <h1 className="font-semibold text-3xl">
              Documenti Aziendali Richiesti
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {selected.length} documenti selezionati
              </span>
              {selected.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllSelections}
                  className="text-sm text-gray-600 hover:text-black"
                >
                  <X className="h-4 w-4 mr-1" />
                  Annulla selezione
                </Button>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cerca documenti..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl w-full h-12 text-lg"
            />
          </div>
        </div>

        {documentGroups.map((group, idx) => (
          <DocumentGroup key={idx} group={group} />
        ))}

        <div className="mt-10">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selected.length === 0}
            className="rounded-xl bg-black px-8 py-4 text-lg hover:bg-gray-800 transition-colors"
          >
            Avanti ({selected.length})
          </Button>
        </div>
      </div>
    </div>
  )
}