import { useState, useEffect } from "react"
import { useAuth } from "@/auth/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, Eye, UserCog, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import LogoHeader from "./LogoHeader"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { API_BASE_URL, API_ENDPOINTS, getApiUrl } from '@/config';

// AIQuinto specific tabs
const AIQUINTO_TABS = {
  DIPENDENTI: "dipendenti",
  PENSIONATI: "pensionati"
}

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

// Comment preview component with dialog to view full comment
const CommentViewerCell = ({ lead }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasComment = lead.commenti && lead.commenti.trim() !== "";
  
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className={`max-w-[200px] truncate ${!hasComment ? "text-gray-400" : ""}`}>
          {hasComment ? lead.commenti : "-"}
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-6 w-6 rounded-full hover:bg-gray-100"
          onClick={() => setIsOpen(true)}
          disabled={!hasComment}
          title={hasComment ? "Visualizza commento completo" : "Nessun commento da visualizzare"}
        >
          <Eye className={`h-4 w-4 ${!hasComment ? "text-gray-300" : ""}`} />
        </Button>
      </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl mb-2">Commento</DialogTitle>
            <DialogDescription>
              <div className="mt-1 text-sm">
                <div><span className="font-semibold">Lead:</span> {lead.firstName} {lead.lastName}</div>
                {lead.email && <div><span className="font-semibold">Email:</span> {lead.email}</div>}
                {lead.agentName && <div><span className="font-semibold">Agente:</span> {lead.agentName}</div>}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-50 p-4 rounded-lg text-base mt-2 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
            {lead.commenti}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Async function to fetch admin leads
const fetchAllAgentLeads = async (user, source) => {
  if (!user) throw new Error("Utente non autenticato");
  
  try {
    // Get Firebase token
    const { auth } = await import('@/auth/firebase');
    if (!auth.currentUser) {
      throw new Error("Sessione scaduta, effettua nuovamente l'accesso");
    }
    
    const token = await auth.currentUser.getIdToken(true);
    
    // Fetch leads from API
    const response = await fetch(getApiUrl(`${API_ENDPOINTS.LEADS}/admin-leads?source=${source}`), {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      // Handle HTTP errors
      if (response.status === 403) {
        throw new Error("Non hai il permesso per visualizzare questi leads");
      } else if (response.status === 404) {
        return { leads: [], total: 0, page: 1, totalPages: 0 }; // No leads found
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

// Función para generar datos de prueba según la fuente
const getTestAgentLeads = (source) => {
  const agents = [
    { id: "agent1", name: "Mario Rossi" },
    { id: "agent2", name: "Giulia Bianchi" },
    { id: "agent3", name: "Paolo Verdi" },
  ];

  const generateLeadWithAgent = (lead, agentIndex) => {
    const agent = agents[agentIndex % agents.length];
    return {
      ...lead,
      agentId: agent.id,
      agentName: agent.name
    };
  };

  const commonFields = {
    id: "test-lead-" + Date.now(),
    createdAt: new Date().toISOString(),
    status: "new"
  };

  if (source === "aimedici") {
    return [
      generateLeadWithAgent({
        ...commonFields,
        id: "test-medici-1",
        firstName: "Mario",
        lastName: "Rossi",
        email: "mario.rossi@example.com",
        phone: "+39 333 1234567",
        message: "Sono interessato a una consulenza medica specialistica per un problema alla schiena che persiste da tempo",
        scopoRichiesta: "Consulenza specialistica ortopedica",
        importoRichiesto: "€150",
        cittaResidenza: "Milano",
        provinciaResidenza: "MI",
        privacyAccettata: true,
        commenti: "Paziente con dolore cronico alla schiena, necessita visita urgente.\nHa già effettuato radiografia con risultati non conclusivi.\nPrioritario fissare appuntamento entro 14 giorni.",
        status: "contacted"
      }, 0),
      generateLeadWithAgent({
        ...commonFields,
        id: "test-medici-2",
        firstName: "Laura",
        lastName: "Bianchi",
        email: "laura.bianchi@example.com",
        phone: "+39 333 7654321",
        message: "Vorrei informazioni sui servizi di cardiologia disponibili",
        scopoRichiesta: "Consulenza cardiologica",
        importoRichiesto: "€200",
        cittaResidenza: "Roma",
        provinciaResidenza: "RM",
        privacyAccettata: true,
        commenti: "",
        status: "new"
      }, 1)
    ];
  } else if (source === "aiquinto") {
    return [
      generateLeadWithAgent({
        ...commonFields,
        id: "test-quinto-1",
        firstName: "Giuseppe",
        lastName: "Verdi",
        email: "giuseppe.verdi@example.com",
        phone: "+39 333 2468135",
        importoRichiesto: "€25.000",
        stipendioNetto: "€1.800",
        tipologiaDipendente: "Privato",
        sottotipo: "Dipendente",
        tipoContratto: "Tempo indeterminato",
        dataNascita: "1980-05-15",
        provinciaResidenza: "Milano",
        privacyAccettata: true,
        commenti: "Richiesta prestito per acquisto auto nuova.\nCliente già fidelizzato, precedente finanziamento estinto regolarmente.\nVerificati i documenti, tutto in regola.\nProposta inviata via email, in attesa di risposta.",
        status: "qualified"
      }, 0),
      generateLeadWithAgent({
        ...commonFields,
        id: "test-quinto-2",
        firstName: "Francesca",
        lastName: "Neri",
        email: "francesca.neri@example.com",
        phone: "+39 333 9753124",
        importoRichiesto: "€15.000",
        stipendioNetto: "€1.500",
        tipologiaDipendente: "Pubblico",
        sottotipo: "Statale",
        tipoContratto: "Tempo indeterminato",
        dataNascita: "1975-11-23",
        provinciaResidenza: "Roma",
        privacyAccettata: true,
        commenti: "Richiesta finanziamento per ristrutturazione casa. Primo contatto telefonico positivo, cliente interessata ai nostri tassi.",
        status: "contacted"
      }, 1),
      generateLeadWithAgent({
        ...commonFields,
        id: "test-quinto-3",
        firstName: "Marco",
        lastName: "Gialli",
        email: "marco.gialli@example.com",
        phone: "+39 333 8642975",
        importoRichiesto: "€30.000",
        stipendioNetto: "€2.200",
        tipologiaDipendente: "Privato",
        sottotipo: "Dipendente",
        tipoContratto: "Tempo determinato",
        dataNascita: "1990-03-10",
        provinciaResidenza: "Napoli",
        privacyAccettata: true,
        commenti: "Richiesta prestito per matrimonio",
        status: "new"
      }, 2)
    ];
  } else if (source === "aifidi") {
    return [
      generateLeadWithAgent({
        ...commonFields,
        id: "test-fidi-1",
        firstName: "Andrea",
        lastName: "Bruno",
        email: "andrea.bruno@example.com",
        phone: "+39 333 5791246",
        message: "Sono titolare di una piccola impresa e avrei bisogno di informazioni sui finanziamenti disponibili",
        status: "new"
      }, 0),
      generateLeadWithAgent({
        ...commonFields,
        id: "test-fidi-2",
        firstName: "Sofia",
        lastName: "Marino",
        email: "sofia.marino@example.com",
        phone: "+39 333 4561237",
        message: "La mia azienda cerca un finanziamento per l'acquisto di nuovi macchinari",
        commenti: "Azienda con buon rating creditizio. Fatturato annuo €1.2M.\nRichiesta per acquisto macchinari produzione tessile.\nDocumentazione societaria già ricevuta e verificata.\nPiano di ammortamento in preparazione.",
        status: "qualified"
      }, 2)
    ];
  }
  
  // Default: return empty array
  return [];
}

// Component to assign lead to specific agent
const AssignLeadDialog = ({ isOpen, setIsOpen, lead, refetchLeads }) => {
  const [loading, setLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [agents, setAgents] = useState([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch agents with permission to handle this lead source
  const fetchAgentsForSource = async () => {
    try {
      setLoading(true);
      
      // Obtener el token de Firebase
      const { auth } = await import('@/auth/firebase');
      if (!auth.currentUser) {
        throw new Error("Sessione scaduta, effettua nuovamente l'accesso");
      }
      
      const token = await auth.currentUser.getIdToken(true);
      
      const response = await fetch(`/api/leads/admin/agents-by-source?source=${lead.source}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Impossibile caricare gli agenti disponibili");
      }
      
      const agentsData = await response.json();
      setAgents(agentsData);
      
      // Si hay agentes disponibles, seleccionar el primero por defecto
      if (agentsData.length > 0) {
        setSelectedAgentId(agentsData[0].id);
      }
    } catch (error) {
      console.error("Error loading agents:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare gli agenti",
        variant: "destructive",
        className: "rounded-xl",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Effect to load agents when dialog opens
  useEffect(() => {
    if (isOpen && lead) {
      fetchAgentsForSource();
    }
  }, [isOpen, lead]);
  
  // Handler to assign lead to selected agent
  const handleAssignLead = async () => {
    try {
      setLoading(true);
      
      // Obtener el token de Firebase
      const { auth } = await import('@/auth/firebase');
      if (!auth.currentUser) {
        throw new Error("Sessione scaduta, effettua nuovamente l'accesso");
      }
      
      const token = await auth.currentUser.getIdToken(true);
      
      const response = await fetch(`/api/leads/${lead.id}/assign`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ agentId: selectedAgentId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Impossibile assegnare il lead");
      }
      
      // Success
      toast({
        title: "Successo",
        description: "Lead assegnato correttamente all'agente",
        className: "rounded-xl",
      });
      
      // Close dialog and refresh leads
      setIsOpen(false);
      refetchLeads();
    } catch (error) {
      console.error("Error assigning lead:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile assegnare il lead all'agente",
        variant: "destructive",
        className: "rounded-xl",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl mb-2">Assegna Lead</DialogTitle>
          <DialogDescription>
            <div className="mt-1 text-sm">
              <div><span className="font-semibold">Lead:</span> {lead?.firstName} {lead?.lastName}</div>
              {lead?.email && <div><span className="font-semibold">Email:</span> {lead?.email}</div>}
              <div><span className="font-semibold">Fonte:</span> {lead?.source}</div>
              <div><span className="font-semibold">Agente attuale:</span> {lead?.agentName || "Non assegnato"}</div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-4">
            <label className="text-sm font-medium mb-1 block">Seleziona un agente</label>
            <Select 
              value={selectedAgentId} 
              onValueChange={setSelectedAgentId}
              disabled={loading || agents.length === 0}
            >
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Seleziona un agente" />
              </SelectTrigger>
              <SelectContent>
                {agents.length === 0 ? (
                  <SelectItem value="" disabled>Nessun agente disponibile</SelectItem>
                ) : (
                  agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name} ({agent.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {agents.length === 0 && !loading && (
            <div className="text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">
              Non ci sono agenti disponibili per questa fonte di leads.
              Assicurati di aver concesso le autorizzazioni corrette agli agenti.
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="rounded-xl"
            disabled={loading}
          >
            Annulla
          </Button>
          <Button 
            type="button" 
            onClick={handleAssignLead} 
            className="rounded-xl"
            disabled={loading || !selectedAgentId || agents.length === 0}
          >
            {loading ? "Assegnamento..." : "Assegna Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Fallback function to use when API fails completely
const createEmptyLeadStructure = (source) => {
  return {
    id: `empty-${Date.now()}`,
    source,
    firstName: "Dati",
    lastName: "Non Disponibili",
    email: "Riprova più tardi",
    phone: "-",
    status: "new",
    createdAt: new Date().toISOString(),
    commenti: "Impossibile caricare i dati dal server. Riprova più tardi.",
    agentName: null,
    details: {}
  };
}

export default function AdminLeads() {
  const [search, setSearch] = useState("")
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [currentSource, setCurrentSource] = useState(LEAD_SOURCES[0].id)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [selectedLeads, setSelectedLeads] = useState([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // AIQuinto specific tabs state
  const [aiquintoTab, setAiquintoTab] = useState(AIQUINTO_TABS.DIPENDENTI)

  // Query the leads data
  const { 
    data = { leads: [] }, // Initialize with expected structure
    isLoading, 
    isError, 
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['admin-leads', currentSource],
    queryFn: () => fetchAllAgentLeads(user, currentSource),
    enabled: !!user, // Only execute if the user is authenticated
    onError: (error) => {
      toast({
        title: "Errore di caricamento",
        description: error.message || `Impossibile caricare i leads da ${currentSource}`,
        variant: "destructive",
        className: "rounded-xl",
      });
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    retry: 2, // Retry twice before showing error
  });

  // Filter leads based on search term
  const filteredLeads = data.leads.filter(lead => {
    if (!search) return true;
    
    const searchTerm = search.toLowerCase();
    const fieldsToSearch = [
      lead.firstName || '',
      lead.lastName || '',
      lead.email || '',
      lead.phone || '',
      lead.status || '',
      lead.agentName || '',
      lead.commenti || ''
    ];
    
    return fieldsToSearch.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  });

  const handleSourceChange = (newSource) => {
    setCurrentSource(newSource);
  }

  // Process leads to include agent name and comments
  const processedLeads = data.leads.map(lead => {
    try {
      const plainLead = lead.get ? lead.get({ plain: true }) : lead;
      
      // Map created_at to createdAt if needed
      if (plainLead.created_at && !plainLead.createdAt) {
        plainLead.createdAt = plainLead.created_at;
      }
      
      // Add agent name for display
      if (plainLead.assignedAgent) {
        plainLead.agentName = `${plainLead.assignedAgent.firstName || ''} ${plainLead.assignedAgent.lastName || ''}`.trim();
      }
      
      // Merge the latest note/comment into the lead object for display
      if (plainLead.notes && plainLead.notes.length > 0) {
        plainLead.commenti = plainLead.notes[0].content;
      } else {
        plainLead.commenti = '';
      }
      
      return plainLead;
    } catch (err) {
      console.error('Error processing lead:', err);
      // Return a minimal lead object if processing fails
      return {
        id: lead.id,
        source: lead.source,
        firstName: lead.firstName || 'Error',
        lastName: lead.lastName || 'Processing',
        email: lead.email || '-',
        status: lead.status || 'unknown',
        createdAt: lead.created_at || lead.createdAt || new Date().toISOString(),
        commenti: 'Error processing lead data'
      };
    }
  });

  // Get status label and color by value
  const getStatusInfo = (statusValue) => {
    return STATUS_OPTIONS.find(option => option.value === statusValue) || STATUS_OPTIONS[0];
  }

  const handleAssignLead = (lead) => {
    setSelectedLead(lead);
    setAssignDialogOpen(true);
  };

  // Function to delete leads
  const deleteLeads = async (leadIds) => {
    const { auth } = await import('@/auth/firebase');
    const token = await auth.currentUser.getIdToken(true);
    
    return Promise.all(
      leadIds.map(id => 
        fetch(`${API_BASE_URL}${API_ENDPOINTS.LEADS}/${id}`, {
          method: 'DELETE',
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Failed to delete lead ${id}`);
          }
          return response.json();
        })
      )
    );
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteLeads,
    onSuccess: () => {
      toast({
        title: "Leads eliminati",
        description: `${selectedLeads.length} lead eliminati con successo`,
        className: "rounded-xl",
      });
      setSelectedLeads([]);
      queryClient.invalidateQueries({ queryKey: ['admin-leads', currentSource] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare i leads",
        variant: "destructive",
        className: "rounded-xl",
      });
    }
  });

  // Toggle select all leads
  const toggleSelectAll = (checked) => {
    if (checked) {
      const ids = filteredLeads.map(lead => lead.id);
      setSelectedLeads(ids);
    } else {
      setSelectedLeads([]);
    }
  };

  // Toggle lead selection
  const toggleSelect = (id) => {
    setSelectedLeads(prev => {
      if (prev.includes(id)) {
        return prev.filter(leadId => leadId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Check if all visible leads are selected
  const allSelected = filteredLeads?.length > 0 && 
    filteredLeads.every(lead => selectedLeads.includes(lead.id));

  // Handle delete confirmation
  const handleDelete = () => {
    if (selectedLeads.length === 0) return;
    
    deleteMutation.mutate(selectedLeads);
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50 p-4">
      <LogoHeader />
      <Card className="w-full max-w-6xl shadow-lg mt-16">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-3xl">Leads degli agenti 📝</CardTitle>
              <CardDescription className="mb-2">
                Monitora tutti i leads assegnati agli agenti
              </CardDescription>
            </div>
            <div className="flex gap-2 mb-8 md:mb-0 items-center">
              {selectedLeads.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina ({selectedLeads.length})
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetch()}
                className="rounded-xl"
                disabled={isFetching}
              >
                {isFetching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              
              {isError && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs"
                  onClick={async () => {
                    try {
                      const { auth } = await import('@/auth/firebase');
                      if (!auth.currentUser) {
                        throw new Error("Not authenticated");
                      }
                      
                      const token = await auth.currentUser.getIdToken(true);
                      const response = await fetch('/api/leads/debug-leads', {
                        headers: { "Authorization": `Bearer ${token}` }
                      });
                      
                      if (!response.ok) {
                        throw new Error(`Server error: ${response.status}`);
                      }
                      
                      const data = await response.json();
                      console.log('Debug data:', data);
                      
                      toast({
                        title: "Debug info",
                        description: `Found ${data.leads.length} leads. Check console for details.`,
                        duration: 5000,
                      });
                    } catch (err) {
                      console.error("Debug error:", err);
                      toast({
                        title: "Debug error",
                        description: err.message,
                        variant: "destructive",
                        duration: 5000,
                      });
                    }
                  }}
                >
                  Diagnostica
                </Button>
              )}
            </div>
          </div>
          
          <Tabs 
            defaultValue={LEAD_SOURCES[0].id} 
            className="mt-4" 
            value={currentSource} 
            onValueChange={handleSourceChange}
          >
            <TabsList className="grid grid-cols-3 mb-4">
              {LEAD_SOURCES.map(source => (
                <TabsTrigger key={source.id} value={source.id}>
                  {source.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* AIQuinto specific tabs */}
            {currentSource === "aiquinto" && (
              <div className="mt-4 mb-4">
                <Tabs value={aiquintoTab} onValueChange={setAiquintoTab} defaultValue={AIQUINTO_TABS.DIPENDENTI}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value={AIQUINTO_TABS.DIPENDENTI}>Dipendenti</TabsTrigger>
                    <TabsTrigger value={AIQUINTO_TABS.PENSIONATI}>Pensionati</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
            
            {LEAD_SOURCES.map(source => (
              <TabsContent key={source.id} value={source.id}>
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

                  {isLoading ? (
                    <div className="text-center py-10 flex flex-col items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                      <p className="text-gray-500">Caricamento dei lead in corso...</p>
                    </div>
                  ) : isError && error && !error.message?.includes("No leads found") && !error.message?.includes("Nessun lead trovato") ? (
                    <div className="text-center py-8 flex flex-col items-center">
                      <div className="bg-red-50 p-4 rounded-xl max-w-md mb-2">
                        <p className="text-red-800 font-medium mb-1">Si è verificato un problema</p>
                        <p className="text-red-600 text-sm">
                          {error.message?.includes("getIdToken") ? 
                            "Sessione scaduta. Per favore, effettua nuovamente l'accesso." : 
                            error.message || `Impossibile caricare i leads da ${source.name}`}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => refetch()} 
                        className="mt-2 rounded-xl"
                      >
                        Riprova
                      </Button>
                    </div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-2">Nessun lead trovato</p>
                      <p className="text-gray-400 text-sm mb-4">
                        Non ci sono ancora leads provenienti da {source.name}
                        {source.id === "aiquinto" ? ` - ${aiquintoTab === AIQUINTO_TABS.DIPENDENTI ? "Dipendenti" : "Pensionati"}` : ""}.
                      </p>
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
                                  onCheckedChange={toggleSelectAll}
                                  aria-label="Seleziona tutto"
                                  disabled={filteredLeads.length === 0}
                                />
                              </th>
                              <th>Data</th>
                              <th className="bg-blue-50">Agente</th>
                              <th>Nome</th>
                              <th>Cognome</th>
                              <th>Mail</th>
                              <th>Telefono</th>

                              {/* Source-specific columns */}
                              {source.id === "aiquinto" && (
                                aiquintoTab === AIQUINTO_TABS.DIPENDENTI ? (
                                <>
                                  <th>Importo Richiesto</th>
                                  <th>Stipendio Netto</th>
                                  <th>Tipologia</th>
                                  <th>Sottotipo</th>
                                  <th>Tipo Contratto</th>
                                  <th>Provincia</th>
                                  <th>Mese ed anno di assunzione</th>
                                  <th>Numero dipendenti</th>
                                </>
                                ) : ( /* Pensionati */
                                <>
                                  <th>Importo Richiesto</th>
                                  <th>Pensione Netta Mensile</th>
                                  <th>Ente Pensionistico</th>
                                  <th>Tipologia di Pensione</th>
                                  <th>Data di Nascita</th>
                                  <th>Provincia di Residenza</th>
                                </>
                                )
                              )}
                              
                              {source.id === "aimedici" && (
                                <>
                                  <th>Scopo della richiesta</th>
                                  <th>Importo Richiesto</th>
                                  <th>Città di Residenza</th>
                                  <th>Provincia di Residenza</th>
                                </>
                              )}
                              
                              {source.id === "aifidi" && (
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
                              <th className="bg-green-50">Stato</th>
                              <th className="bg-yellow-50 min-w-[250px]">Commenti</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredLeads.length === 0 ? (
                               <tr>
                                 <td colSpan={15} className="h-32 text-center">
                                   <div className="py-6 px-4">
                                     <p className="text-gray-600 font-medium text-lg mb-3">Nessun lead trovato</p>
                                     <div className="max-w-md mx-auto bg-blue-50 rounded-lg p-4 border border-blue-100">
                                       <p className="text-blue-800 mb-2">
                                         Non ci sono ancora leads provenienti da {source.name}
                                         {source.id === "aiquinto" ? ` - ${aiquintoTab === AIQUINTO_TABS.DIPENDENTI ? "Dipendenti" : "Pensionati"}` : ""}.
                                       </p>
                                       <p className="text-blue-700 text-sm">Torna presto, i nuovi leads verranno mostrati qui.</p>
                                     </div>
                                   </div>
                                 </td>
                               </tr>
                            ) : (
                              filteredLeads.map((lead, index) => {
                                const statusOption = getStatusInfo(lead.status);
                                const colSpanValue = source.id === "aiquinto" 
                                  ? (aiquintoTab === AIQUINTO_TABS.DIPENDENTI ? 15 : 13) 
                                  : source.id === "aimedici" ? 13 : 14;
                                
                                return (
                                  <tr key={lead.id || index} className="border-b hover:bg-gray-50">
                                    <td className="p-4">
                                      <Checkbox 
                                        checked={selectedLeads.includes(lead.id)} 
                                        onCheckedChange={() => toggleSelect(lead.id)}
                                        aria-label={`Select lead ${lead.firstName} ${lead.lastName}`} 
                                      />
                                    </td>
                                    <td className="py-3 px-4">{new Date(lead.createdAt).toLocaleDateString('it-IT')}</td>
                                    <td className="py-3 px-4 font-medium">
                                      {lead.agentName ? (
                                        <div className="bg-blue-50 px-2 py-1 rounded text-blue-700 inline-block">
                                          {lead.agentName}
                                        </div>
                                      ) : (
                                        <div className="bg-red-50 px-2 py-1 rounded text-red-700 inline-block">
                                          Non assegnato
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3 px-4">{lead.firstName || "-"}</td>
                                    <td className="py-3 px-4">{lead.lastName || "-"}</td>
                                    <td className="py-3 px-4">{lead.email || "-"}</td>
                                    <td className="py-3 px-4">{lead.phone || "-"}</td>
                                    
                                    {/* Source-specific data */}
                                    {source.id === "aiquinto" && (
                                      aiquintoTab === AIQUINTO_TABS.DIPENDENTI ? (
                                        <>
                                          <td className="py-3 px-4">{lead.details?.requestedAmount || "-"}</td>
                                          <td className="py-3 px-4">{lead.details?.netSalary || "-"}</td>
                                          <td className="py-3 px-4">{lead.details?.employeeType || "-"}</td>
                                          <td className="py-3 px-4">{lead.details?.employmentSubtype || "-"}</td>
                                          <td className="py-3 px-4">{lead.details?.contractType || "-"}</td>
                                          <td className="py-3 px-4">{lead.details?.residenceProvince || "-"}</td>
                                          <td className="py-3 px-4">{lead.details?.employmentDate || "-"}</td>
                                          <td className="py-3 px-4">{lead.details?.employeeCount || "-"}</td>
                                        </>
                                      ) : ( /* Pensionati */
                                        <>
                                          <td className="py-3 px-4">{lead.details?.requestedAmount || "-"}</td>
                                          <td className="py-3 px-4">{lead.details?.netPensionAmount || "-"}</td>
                                          <td className="py-3 px-4">{lead.details?.pensionProvider || "-"}</td>
                                          <td className="py-3 px-4">{lead.details?.pensionType || "-"}</td>
                                          <td className="py-3 px-4">{lead.details?.birthDate ? new Date(lead.details.birthDate).toLocaleDateString('it-IT') : "-"}</td>
                                          <td className="py-3 px-4">{lead.details?.residenceProvince || "-"}</td>
                                        </>
                                      )
                                    )}
                                    
                                    {source.id === "aimedici" && (
                                      <>
                                        <td className="py-3 px-4">{lead.details?.financingPurpose || "-"}</td>
                                        <td className="py-3 px-4">{lead.details?.requestedAmount || "-"}</td>
                                        <td className="py-3 px-4">{lead.details?.residenceCity || "-"}</td>
                                        <td className="py-3 px-4">{lead.details?.residenceProvince || "-"}</td>
                                      </>
                                    )}
                                    
                                    {source.id === "aifidi" && (
                                      <>
                                        <td className="py-3 px-4">{lead.details?.financingPurpose || "-"}</td>
                                        <td className="py-3 px-4">{lead.details?.companyName || "-"}</td>
                                        <td className="py-3 px-4">{lead.details?.legalCity || "-"}</td>
                                        <td className="py-3 px-4">{lead.details?.operationalCity || "-"}</td>
                                        <td className="py-3 px-4">{lead.details?.requestedAmount || "-"}</td>
                                      </>
                                    )}
                                    
                                    {/* Final common data */}
                                    <td className="py-3 px-4">{lead.privacyAccettata ? "Sì" : "No"}</td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusOption.color}`}></div>
                                        <span>{statusOption.label}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 min-w-[250px]">
                                      <CommentViewerCell lead={lead} />
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
              </TabsContent>
            ))}
          </Tabs>
        </CardHeader>
      </Card>
      {selectedLead && (
        <AssignLeadDialog
          isOpen={assignDialogOpen}
          setIsOpen={setAssignDialogOpen}
          lead={selectedLead}
          refetchLeads={refetch}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare {selectedLeads.length} {selectedLeads.length === 1 ? 'lead' : 'leads'}? 
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex space-x-2 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl"
            >
              Annulla
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="rounded-xl"
            >
              {deleteMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                'Elimina'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
