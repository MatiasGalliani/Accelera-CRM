// src/components/Review.jsx
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { useFormContext } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/auth/AuthContext"
import LogoHeader from "./LogoHeader"

export default function Review() {
  const {
    getValues,
    handleSubmit,
    formState: { isSubmitting },
  } = useFormContext()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  // 1) Extraer los valores del formulario
  const { clients, type, products } = getValues()

  // 2) Listas originales de productos
  const privateOptions = [
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

  const businessOptions = [
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

  // 3) Función para generar ID idéntico al de las cards
  const makeId = (title, description) =>
    `${title}-${description}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

  // 4) Filtrar sólo los seleccionados
  const lookup = type === "privato" ? privateOptions : businessOptions
  const selected = lookup.filter(opt =>
    products.includes(makeId(opt.title, opt.description))
  )

  // Envío final
  const onSubmit = async data => {
    try {
      // Verifica che l'utente sia autenticato
      if (!user) {
        throw new Error("Utente non autenticato");
      }
      
      // Ottieni il token di Firebase dall'oggetto auth.currentUser
      let idToken;
      try {
        // Usa l'oggetto auth direttamente
        const { auth } = await import('@/auth/firebase');
        if (!auth.currentUser) {
          throw new Error("Sessione scaduta, effettua nuovamente l'accesso");
        }
        
        idToken = await auth.currentUser.getIdToken(true);
        console.log("Token ottenuto con successo");
      } catch (tokenError) {
        console.error("Errore nell'ottenere il token:", tokenError);
        throw new Error("Impossibile autorizzare la richiesta. Ricarica la pagina o effettua nuovamente l'accesso.");
      }
      
      // Log dei dati inviati
      console.log('Invio dati:', data);
      
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          clients,
          type,
          products: selected.map(opt => ({
            title: opt.title,
            description: opt.description
          })),
          agent: user?.displayName || 'Agente'
        }),
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || `Errore server: ${res.status}`);
      }
      
      navigate("/success")
    } catch (err) {
      console.error('Submission error:', err);
      toast({
        title: "Errore",
        description: err.message ?? "Qualcosa è andato storto",
        variant: "destructive",
        className: "rounded-xl",
        duration: 8000, // Mostra per più tempo
      })
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <LogoHeader />
      <Card className="w-full max-w-2xl shadow-lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="text-center text-3xl">Riepilogo</CardTitle>
            <CardDescription className="text-center">
              Controlla i dati prima di inviare
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Agent info */}
            <div>
              <p><strong>Agente:</strong> {user?.displayName || 'No disponible'}</p>
            </div>

            {/* Resumen de clientes */}
            <div>
              <p><strong>Clienti:</strong></p>
              {clients.map((c, idx) => (
                <div key={idx} className="mb-4">
                  <p><strong>Nome:</strong> {c.firstName}</p>
                  <p><strong>Cognome:</strong> {c.lastName}</p>
                  <p><strong>Email:</strong> {c.email}</p>
                </div>
              ))}
              <p>
                <strong>Tipo di cliente:</strong>{" "}
                {type === "privato" ? "Privato" : "Azienda"}
              </p>
            </div>

            {/* Resumen de productos */}
            <div>
              <p><strong>Prodotti scelti:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                {selected.map(opt => (
                  <li key={makeId(opt.title, opt.description)}>
                    {opt.title} – {opt.description}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button  className="rounded-xl" type="button" variant="secondary" onClick={() => navigate(-1)}>
              Indietro
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl w-24">
              {isSubmitting ? "Invio…" : "Invia"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
