import { useState } from "react"
import { useAuth } from "@/auth/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, Trash2, PencilLine, Save, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import CommentPreviewCell from "./CommentPreviewCell"
import LeadSourceTabs from "@/components/LeadSourceTabs"
import { API_BASE_URL, API_ENDPOINTS, getApiUrl } from '@/config'
import { Icons } from "@/components/icons"

// Status options for leads
const STATUS_OPTIONS = [
  { value: "new", label: "Nuovo", color: "bg-blue-400" },
  { value: "contacted", label: "Contattato", color: "bg-yellow-400" },
  { value: "qualified", label: "Qualificato", color: "bg-green-500" },
  { value: "not_interested", label: "Non interessato", color: "bg-red-500" }
]

// Lead sources
const LEAD_SOURCES = [
  { id: "aimedici", name: "AIMedici.it" },
  { id: "aiquinto", name: "AIQuinto.it" },
  { id: "aifidi", name: "AIFidi.it" }
]

// AIQuinto specific tabs
const AIQUINTO_TABS = {
  DIPENDENTI: "dipendenti",
  PENSIONATI: "pensionati"
}

// API function to fetch leads
const fetchLeads = async (user, source) => {
  if (!user) throw new Error("Utente non autenticato");

  try {
    // Get Firebase token
    const { auth } = await import('@/auth/firebase');
    if (!auth.currentUser) {
      throw new Error("Sessione scaduta, effettua nuovamente l'accesso");
    }

    // Try to get token without force refresh first
    let token;
    try {
      token = await auth.currentUser.getIdToken(false);
    } catch (tokenError) {
      console.error('Error getting cached token:', tokenError);
      // Only try force refresh if not a quota error
      if (!tokenError.message?.includes('quota')) {
        token = await auth.currentUser.getIdToken(true);
      } else {
        throw new Error("Troppi tentativi. Attendi qualche minuto e riprova.");
      }
    }

    console.log("Token ottenuto con successo per il caricamento dei leads");

    const response = await fetch(getApiUrl(`${API_ENDPOINTS.LEADS}/my-leads?source=${source}`), {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Sessione scaduta o non autorizzata. Effettua nuovamente l'accesso.");
      } else if (response.status === 404) {
        return []; // No leads found
      } else {
        throw new Error(`Impossibile caricare i leads da ${source}`);
      }
    }

    return await response.json();
  } catch (error) {
    console.error("Errore nel caricamento dei leads:", error);
    throw error;
  }
}

// DELETE - eliminar lead
const deleteLead = async ({ id, token }) => {
  const response = await fetch(getApiUrl(`${API_ENDPOINTS.LEADS}/${id}`), {
    method: 'DELETE',
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Errore durante l\'eliminazione del lead');
  }

  return await response.json();
}

// PUT - actualizar estado del lead
const updateLeadStatus = async ({ id, status, token }) => {
  const response = await fetch(getApiUrl(`${API_ENDPOINTS.LEADS}/${id}/status`), {
    method: 'PUT',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    throw new Error('Errore durante l\'aggiornamento dello stato');
  }

  return await response.json();
}

// POST - agregar comentario al lead
const addLeadComment = async ({ id, comment, token }) => {
  const response = await fetch(getApiUrl(`${API_ENDPOINTS.LEADS}/${id}/comments`), {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ comment })
  });

  if (!response.ok) {
    throw new Error('Errore durante l\'aggiunta del commento');
  }

  return await response.json();
}

export default function LeadsAgenti() {
  const [search, setSearch] = useState("")
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState(null)
  const [selectedLeads, setSelectedLeads] = useState([])
  const [isMultiDeleteDialogOpen, setIsMultiDeleteDialogOpen] = useState(false)
  const [currentSource, setCurrentSource] = useState(LEAD_SOURCES[0].id)
  const [aiquintoTab, setAiquintoTab] = useState(AIQUINTO_TABS.DIPENDENTI)
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentingLead, setCommentingLead] = useState(null);
  const [commentText, setCommentText] = useState("");

  // Use React Query to manage the leads data
  const {
    data: leads = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['leads', currentSource],
    queryFn: () => fetchLeads(user, currentSource),
    enabled: !!user // Solo ejecutar si el usuario está autenticado
  });

  // Función para formatear fechas correctamente
  const formatDate = (dateString) => {
    if (!dateString) return "-";

    // Intentar crear un objeto Date
    const date = new Date(dateString);

    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return "-";
    }

    // Formatear como DD/MM/YYYY
    return date.toLocaleDateString('it-IT');
  };

  // Mutación para eliminar un lead
  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      toast({
        title: "Lead eliminato",
        description: "Il lead è stato eliminato con successo",
        className: "rounded-xl",
      });
      queryClient.invalidateQueries({ queryKey: ['leads', currentSource] });
    }
  });

  // Mutación para eliminar leads en masa
  const bulkDeleteMutation = useMutation({
    mutationFn: async (leadIds) => {
      const { auth } = await import('@/auth/firebase');
      const token = await auth.currentUser.getIdToken(true);

      return Promise.all(
        leadIds.map(id => deleteLead({ id, token }))
      );
    },
    onSuccess: () => {
      toast({
        title: "Leads eliminati",
        description: "I leads selezionati sono stati eliminati con successo",
        className: "rounded-xl",
      });
      setSelectedLeads([]);
      queryClient.invalidateQueries({ queryKey: ['leads', currentSource] });
    }
  });

  const handleDeleteClick = (leadId) => {
    setLeadToDelete(leadId);
    setIsDeleteDialogOpen(true);
  }

  const confirmDelete = () => {
    if (leadToDelete) {
      deleteMutation.mutate({ id: leadToDelete });
      setIsDeleteDialogOpen(false);
      setLeadToDelete(null);
    }
  }

  const handleSelectLead = (leadId, isChecked) => {
    if (isChecked) {
      setSelectedLeads([...selectedLeads, leadId]);
    } else {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    }
  }

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  }

  const confirmBulkDelete = () => {
    if (selectedLeads.length > 0) {
      bulkDeleteMutation.mutate(selectedLeads);
      setIsMultiDeleteDialogOpen(false);
    }
  }

  const handleSourceChange = (newSource) => {
    setCurrentSource(newSource);
    setSelectedLeads([]);
  }

  const handleStatusChange = (leadId, status) => {
    // Optimistic update for UI responsiveness
    const updatedLeads = leads.map(lead => {
      if (lead.id === leadId) {
        return { ...lead, status };
      }
      return lead;
    });

    // Update the cache optimistically
    queryClient.setQueryData(['leads', currentSource], updatedLeads);

    // Call the API
    (async () => {
      try {
        const { auth } = await import('@/auth/firebase');
        const token = await auth.currentUser.getIdToken(true);

        await updateLeadStatus({ id: leadId, status, token });

        toast({
          title: "Stato aggiornato",
          description: `Lo stato è stato aggiornato a "${STATUS_OPTIONS.find(option => option.value === status)?.label || status
            }"`,
          className: "rounded-xl",
        });
      } catch (error) {
        console.error('Error updating status:', error);

        // Revert the cache on error
        queryClient.invalidateQueries({ queryKey: ['leads', currentSource] });

        toast({
          title: "Errore",
          description: error.message || "Impossibile aggiornare lo stato",
          variant: "destructive",
          className: "rounded-xl",
        });
      }
    })();
  };

  const handleEditComment = (lead) => {
    setCommentingLead(lead);
    setCommentText(lead.commenti || "");
    setIsCommentModalOpen(true);
  };

  const handleSaveComment = async () => {
    if (!commentingLead) return;

    try {
      const { auth } = await import('@/auth/firebase');
      const token = await auth.currentUser.getIdToken(true);

      await addLeadComment({
        id: commentingLead.id,
        comment: commentText,
        token
      });

      // Refresh leads to get updated comments
      queryClient.invalidateQueries({ queryKey: ['leads', currentSource] });

      // Cerrar el modal
      setIsCommentModalOpen(false);
      setCommentingLead(null);

      toast({
        title: "Commento salvato",
        description: "Il commento è stato salvato con successo",
        className: "rounded-xl",
      });
    } catch (error) {
      console.error('Error saving comment:', error);

      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare il commento",
        variant: "destructive",
        className: "rounded-xl",
      });
    }
  };

  const filteredLeads = (leads || []).filter(lead => {
    const searchTerm = search.toLowerCase()

    // Campos comunes para todas las fuentes
    const commonFieldsMatch =
      ((lead.firstName || '').toLowerCase().includes(searchTerm)) ||
      ((lead.lastName || '').toLowerCase().includes(searchTerm)) ||
      ((lead.email || '').toLowerCase().includes(searchTerm)) ||
      ((lead.phone || '').toLowerCase().includes(searchTerm)) ||
      ((lead.message || '').toLowerCase().includes(searchTerm));

    // Si no es AIQuinto o ya hemos encontrado coincidencia en campos comunes
    if (currentSource !== 'aiquinto' && currentSource !== 'aifidi' || commonFieldsMatch) {
      return commonFieldsMatch;
    }

    if (currentSource === 'aiquinto') {
      // Campos específicos de AIQuinto
      return (
        ((lead.importoRichiesto || '').toString().toLowerCase().includes(searchTerm)) ||
        ((lead.stipendioNetto || '').toString().toLowerCase().includes(searchTerm)) ||
        ((lead.tipologiaDipendente || '').toLowerCase().includes(searchTerm)) ||
        ((lead.sottotipo || '').toLowerCase().includes(searchTerm)) ||
        ((lead.tipoContratto || '').toLowerCase().includes(searchTerm)) ||
        ((lead.provinciaResidenza || '').toLowerCase().includes(searchTerm)) ||
        ((lead.meseAnnoAssunzione || '').toLowerCase().includes(searchTerm)) ||
        ((lead.numeroDipendenti || '').toLowerCase().includes(searchTerm)) ||
        ((lead.commenti || '').toLowerCase().includes(searchTerm))
      );
    } else if (currentSource === 'aifidi') {
      // Campos específicos de AIFidi
      return (
        ((lead.scopoFinanziamento || '').toLowerCase().includes(searchTerm)) ||
        ((lead.nomeAzienda || '').toLowerCase().includes(searchTerm)) ||
        ((lead.cittaSedeLegale || '').toLowerCase().includes(searchTerm)) ||
        ((lead.cittaSedeOperativa || '').toLowerCase().includes(searchTerm)) ||
        ((lead.importoRichiesto || '').toString().toLowerCase().includes(searchTerm)) ||
        ((lead.commenti || '').toLowerCase().includes(searchTerm))
      );
    }
  })

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-6xl shadow-lg mt-16">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-3xl">My Leads <Icons.userList className="inline pb-1 h-8 w-8" /></CardTitle>
              <CardDescription className="mb-2">
                Visualizza e gestisci tutti i tuoi leads provenienti dai diversi siti
              </CardDescription>
            </div>
            <div className="flex gap-2 mb-8 md:mb-0">
              {selectedLeads.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsMultiDeleteDialogOpen(true)}
                  className="rounded-xl"
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina ({selectedLeads.length})
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                className="rounded-xl"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="-mb-4">
            <LeadSourceTabs
              value={currentSource}
              onValueChange={handleSourceChange}
              allSources={LEAD_SOURCES}
            />
          </div>

          {/* AIQuinto specific tabs */}
          {currentSource === "aiquinto" && (
            <div className="mt-4">
              <Tabs value={aiquintoTab} onValueChange={setAiquintoTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value={AIQUINTO_TABS.DIPENDENTI}>Dipendenti</TabsTrigger>
                  <TabsTrigger value={AIQUINTO_TABS.PENSIONATI}>Pensionati</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </CardHeader>

        <CardContent className="px-4 pt-0">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cerca per nome, cognome, email, telefono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {/* {isLoading ? (
            <div className="text-center py-4">Caricamento...</div>
          ) : */ isError ? (
            <div className="text-center py-8 flex flex-col items-center">
              <div className="bg-red-50 p-4 rounded-xl max-w-md mb-2">
                <p className="text-red-800 font-medium mb-1">Si è verificato un problema</p>
                <p className="text-red-600 text-sm">
                  {error?.message?.includes("getIdToken") ?
                    "Sessione scaduta. Per favore, effettua nuovamente l'accesso." :
                    error?.message || `Impossibile caricare i leads`}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="mt-2 rounded-xl"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Riprova
              </Button>
            </div>
          ) : (
            <div className="relative border rounded-lg">
              <div className="overflow-auto max-h-[calc(100vh-400px)]">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-white z-20">
                    <tr className="border-b [&>th]:whitespace-nowrap [&>th]:px-4 [&>th]:py-3 [&>th]:font-medium [&>th]:text-sm [&>th]:text-gray-600">
                      <th className="w-[40px] px-2">
                        <Checkbox
                          checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                          onCheckedChange={handleSelectAll}
                          aria-label="Seleziona tutto"
                          disabled={filteredLeads.length === 0}
                        />
                      </th>
                      <th>Data</th>
                      <th>Nome</th>
                      <th>Cognome</th>
                      <th>Mail</th>
                      <th>Telefono</th>

                      {/* Source-specific columns */}
                      {currentSource === "aiquinto" ? (
                        aiquintoTab === AIQUINTO_TABS.DIPENDENTI ? (
                          <>
                            <th>Importo Richiesto</th>
                            <th>Stipendio Netto</th>
                            <th>Tipologia</th>
                            <th>Sottotipo</th>
                            <th>Tipo Contratto</th>
                            <th>Provincia di Residenza</th>
                            <th>Mese ed anno di assunzione</th>
                            <th>Numero dipendenti</th>
                          </>
                        ) : (
                          <>
                            <th>Importo Richiesto</th>
                            <th>Pensione Netta Mensile</th>
                            <th>Ente Pensionistico</th>
                            <th>Tipologia di Pensione</th>
                            <th>Data di Nascita</th>
                            <th>Provincia di Residenza</th>
                          </>
                        )
                      ) : currentSource === "aimedici" ? (
                        <>
                          <th>Scopo della richiesta</th>
                          <th>Importo Richiesto</th>
                          <th>Città di Residenza</th>
                          <th>Provincia di Residenza</th>
                        </>
                      ) : (
                        <>
                          <th>Scopo del finanziamento</th>
                          <th>Nome Azienda</th>
                          <th>Città Sede Legale</th>
                          <th>Città Sede Operativa</th>
                          <th>Importo Richiesto</th>
                        </>
                      )}

                      {/* Final common columns */}
                      <th>Privacy</th>
                      <th>Stato</th>
                      <th>Commenti</th>
                      <th>
                        IA 🤖
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.length === 0 ? (
                      <tr className="hover:bg-transparent">
                        <td colSpan={currentSource === "aiquinto" ? (aiquintoTab === AIQUINTO_TABS.DIPENDENTI ? 15 : 13) : currentSource === "aimedici" ? 13 : 14} className="h-32 text-center">
                          <div className="py-6 px-4">
                            <p className="text-gray-600 font-medium text-lg mb-3">Nessun lead trovato</p>
                            <div className="max-w-md mx-auto bg-blue-50 rounded-lg p-4 border border-blue-100">
                              <p className="text-blue-800 mb-2">Non ci sono ancora leads assegnati a te da {LEAD_SOURCES.find(source => source.id === currentSource)?.name}
                                {currentSource === "aiquinto" ? ` - ${aiquintoTab === AIQUINTO_TABS.DIPENDENTI ? "Dipendenti" : "Pensionati"}` : ""}.
                              </p>
                              <p className="text-blue-700 text-sm">Torna presto, i nuovi leads verranno mostrati qui.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => {
                        const statusOption = STATUS_OPTIONS.find(opt => opt.value === lead.status) || STATUS_OPTIONS[0];

                        return (
                          <tr key={lead.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <Checkbox
                                checked={selectedLeads.includes(lead.id)}
                                onCheckedChange={(checked) => handleSelectLead(lead.id, checked)}
                                aria-label={`Seleziona lead ${lead.firstName} ${lead.lastName}`}
                              />
                            </td>
                            <td className="py-3 px-4">{formatDate(lead.created_at)}</td>
                            <td className="py-3 px-4">{lead.firstName || "-"}</td>
                            <td className="py-3 px-4">{lead.lastName || "-"}</td>
                            <td className="py-3 px-4">{lead.email || "-"}</td>
                            <td className="py-3 px-4">{lead.phone || "-"}</td>

                            {/* Source-specific data */}
                            {currentSource === "aiquinto" ? (
                              aiquintoTab === AIQUINTO_TABS.DIPENDENTI ? (
                                <>
                                  <td className="py-3 px-4">{lead.importoRichiesto || "-"}</td>
                                  <td className="py-3 px-4">{lead.stipendioNetto || "-"}</td>
                                  <td className="py-3 px-4">{lead.tipologiaDipendente || "-"}</td>
                                  <td className="py-3 px-4">{lead.sottotipo || "-"}</td>
                                  <td className="py-3 px-4">{lead.tipoContratto || "-"}</td>
                                  <td className="py-3 px-4">{lead.provinciaResidenza || "-"}</td>
                                  <td className="py-3 px-4">{lead.meseAnnoAssunzione || "-"}</td>
                                  <td className="py-3 px-4">{lead.numeroDipendenti || "-"}</td>
                                </>
                              ) : (
                                <>
                                  <td className="py-3 px-4">{lead.importoRichiesto || "-"}</td>
                                  <td className="py-3 px-4">{lead.pensioneNettaMensile || "-"}</td>
                                  <td className="py-3 px-4">{lead.entePensionistico || "-"}</td>
                                  <td className="py-3 px-4">{lead.tipologiaPensione || "-"}</td>
                                  <td className="py-3 px-4">{formatDate(lead.dataNascita) || "-"}</td>
                                  <td className="py-3 px-4">{lead.provinciaResidenza || "-"}</td>
                                </>
                              )
                            ) : currentSource === "aimedici" ? (
                              <>
                                <td className="py-3 px-4">{lead.scopoRichiesta || "-"}</td>
                                <td className="py-3 px-4">{lead.importoRichiesto || "-"}</td>
                                <td className="py-3 px-4">{lead.cittaResidenza || "-"}</td>
                                <td className="py-3 px-4">{lead.provinciaResidenza || "-"}</td>
                              </>
                            ) : (
                              <>
                                <td className="py-3 px-4">{lead.scopoFinanziamento || "-"}</td>
                                <td className="py-3 px-4">{lead.nomeAzienda || "-"}</td>
                                <td className="py-3 px-4">{lead.cittaSedeLegale || "-"}</td>
                                <td className="py-3 px-4">{lead.cittaSedeOperativa || "-"}</td>
                                <td className="py-3 px-4">{lead.importoRichiesto || "-"}</td>
                              </>
                            )}

                            {/* Final common data */}
                            <td className="py-3 px-4">{lead.privacyAccettata ? "Sì" : "No"}</td>
                            <td className="py-3 px-4">
                              <Select
                                value={lead.status || "new"}
                                onValueChange={(newStatus) => handleStatusChange(lead.id, newStatus)}
                              >
                                <SelectTrigger className="w-40 h-8">
                                  <SelectValue>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusOption.color}`}></div>
                                      <span>{statusOption.label}</span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${option.color}`}></div>
                                        <span>{option.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-3 px-4 min-w-[250px]">
                              <CommentPreviewCell
                                lead={lead}
                                onEdit={() => handleEditComment(lead)}
                              />
                            </td>
                            <td className="text-right">
                              <Button
                                disabled
                                variant="default"
                                size="sm"
                                onClick={() => handleDeleteClick(lead.id)}
                                className=" text-white hover:text-white rounded-xl mx-10"
                              >
                                Richiedere Documenti
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare questo lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il lead e tutti i dati associati saranno
              eliminati permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={isMultiDeleteDialogOpen} onOpenChange={setIsMultiDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare {selectedLeads.length} leads?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Tutti i leads selezionati e i relativi dati saranno
              eliminati permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700"
              onClick={confirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Eliminazione..." : `Elimina (${selectedLeads.length})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de comentarios */}
      <Dialog open={isCommentModalOpen} onOpenChange={setIsCommentModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {commentingLead?.commenti ? "Modifica commento" : "Aggiungi commento"}
            </DialogTitle>
            <DialogDescription>
              {commentingLead ? (
                <div className="mt-2 text-sm">
                  Lead: <span className="font-medium">{commentingLead.firstName} {commentingLead.lastName}</span>
                  {commentingLead.email && (
                    <> - <span className="text-gray-500">{commentingLead.email}</span></>
                  )}
                </div>
              ) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Inserisci i tuoi commenti qui..."
              className="min-h-[200px] text-base p-4"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCommentModalOpen(false)}
              className="rounded-xl"
            >
              Annulla
            </Button>
            <Button
              onClick={handleSaveComment}
              className="rounded-xl"
            >
              <Save className="h-4 w-4 mr-2" />
              Salva commento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
