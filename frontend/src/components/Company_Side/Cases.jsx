import { useState } from "react"
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
import { Search, RefreshCw, Trash2, CheckSquare } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { API_BASE_URL, API_ENDPOINTS, getApiUrl } from '@/config'

// Status options for cases
const STATUS_OPTIONS = [
  { value: "pending", label: "In attesa", color: "bg-yellow-400" },
  { value: "in_progress", label: "In corso", color: "bg-blue-500" },
  { value: "completed", label: "Completato", color: "bg-green-500" },
  { value: "rejected", label: "Rifiutato", color: "bg-red-500" }
]

// API function to fetch cases
const fetchCases = async (user) => {
  if (!user) throw new Error("Utente non autenticato");
  
  try {
    // Ottieni il token di Firebase dall'oggetto auth.currentUser
    const { auth } = await import('@/auth/firebase');
    if (!auth.currentUser) {
      throw new Error("Sessione scaduta, effettua nuovamente l'accesso");
    }
    
    const token = await auth.currentUser.getIdToken(true);
    console.log("Token ottenuto con successo per il caricamento delle richieste");
    
    const response = await fetch(`${API_BASE_URL}/api/cases`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error("Impossibile caricare le richieste documentali");
    }

    const cases = await response.json();
    
    // Add status field if not present
    return cases.map(caseItem => ({
      ...caseItem,
      status: caseItem.status || "pending" // Default status
    }));
  } catch (error) {
    console.error("Errore nel caricamento delle richieste:", error);
    // Gestisci in modo specifico l'errore getIdToken
    if (error.message.includes("getIdToken is not a function") || error.message.includes("auth.currentUser")) {
      throw new Error("Sessione scaduta. Per favore, aggiorna la pagina o effettua nuovamente l'accesso.");
    }
    throw error;
  }
}

// API function to delete a case
const deleteCase = async ({ id, token }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cases/${id}`, {
      method: 'DELETE',
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error("Impossibile eliminare la richiesta documentale");
    }

    return response.json();
  } catch (error) {
    console.error("Errore nell'eliminazione:", error);
    throw error;
  }
}

// API function to update case status
const updateCaseStatus = async ({ id, status, token }) => {
  try {
    // Note: This is a placeholder. You'll need to implement this endpoint on your backend
    const response = await fetch(`${API_BASE_URL}/api/cases/${id}/status`, {
      method: 'PATCH',
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      throw new Error("Impossibile aggiornare lo stato della richiesta");
    }

    return response.json();
  } catch (error) {
    console.error("Errore nell'aggiornamento dello stato:", error);
    throw error;
  }
}

export default function Cases() {
  const [search, setSearch] = useState("")
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [caseToDelete, setCaseToDelete] = useState(null)
  const [selectedCases, setSelectedCases] = useState([])
  const [isMultiDeleteDialogOpen, setIsMultiDeleteDialogOpen] = useState(false)

  // Use React Query to manage the cases data
  const { 
    data: cases = [], 
    isLoading, 
    isError, 
    error,
    refetch
  } = useQuery({
    queryKey: ['cases'],
    queryFn: () => fetchCases(user),
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    retry: 2,
    enabled: !!user, // Only run query if user is authenticated
    onError: (error) => {
      console.error("Error fetching cases:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare le richieste documentali",
        variant: "destructive",
        className: "rounded-xl",
      });
    }
  });

  // Delete case mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      try {
        // Ottieni il token direttamente da Firebase auth
        const { auth } = await import('@/auth/firebase');
        if (!auth.currentUser) {
          throw new Error("Sessione scaduta");
        }
        
        const token = await auth.currentUser.getIdToken(true);
        return deleteCase({ id, token });
      } catch (error) {
        console.error("Errore nell'ottenere il token per l'eliminazione:", error);
        throw new Error("Impossibile autorizzare l'eliminazione. Ricarica la pagina.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast({
        title: "Successo",
        description: "Richiesta documentale eliminata con successo",
        className: "rounded-xl",
      });
    },
    onError: (error) => {
      console.error("Error deleting case:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare la richiesta documentale",
        variant: "destructive",
        className: "rounded-xl",
        duration: 5000,
      });
    }
  });

  // Update case status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      try {
        const { auth } = await import('@/auth/firebase');
        if (!auth.currentUser) {
          throw new Error("Sessione scaduta");
        }
        
        const token = await auth.currentUser.getIdToken(true);
        
        // For demo purposes, we'll just show a success toast without making the API call
        // since the endpoint doesn't exist yet
        toast({
          title: "Stato aggiornato",
          description: `Lo stato è stato aggiornato a "${
            STATUS_OPTIONS.find(option => option.value === status)?.label || status
          }"`,
          className: "rounded-xl",
        });
        
        // In a real implementation, you would call updateCaseStatus here:
        // return updateCaseStatus({ id, status, token });
        
        // Instead, we'll just update the local cache
        queryClient.setQueryData(['cases'], oldData => {
          return oldData.map(item => {
            if (item.id === id) {
              return { ...item, status };
            }
            return item;
          });
        });
        
        return { success: true };
      } catch (error) {
        console.error("Errore nell'aggiornamento dello stato:", error);
        throw new Error("Impossibile autorizzare l'aggiornamento. Ricarica la pagina.");
      }
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare lo stato della richiesta",
        variant: "destructive",
        className: "rounded-xl",
        duration: 5000,
      });
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      try {
        const { auth } = await import('@/auth/firebase');
        if (!auth.currentUser) {
          throw new Error("Sessione scaduta");
        }
        
        const token = await auth.currentUser.getIdToken(true);
        
        // Process each deletion sequentially
        for (const id of ids) {
          await deleteCase({ id, token });
        }
        
        return { success: true, count: ids.length };
      } catch (error) {
        console.error("Errore nell'eliminazione multipla:", error);
        throw new Error("Impossibile completare tutte le eliminazioni. Ricarica la pagina.");
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast({
        title: "Successo",
        description: `${data.count} richieste documentali eliminate con successo`,
        className: "rounded-xl",
      });
      setSelectedCases([]);
    },
    onError: (error) => {
      console.error("Error bulk deleting:", error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'eliminazione multipla",
        variant: "destructive",
        className: "rounded-xl",
        duration: 5000,
      });
    }
  });

  const handleDeleteClick = (caseId) => {
    setCaseToDelete(caseId);
    setIsDeleteDialogOpen(true);
  }

  const confirmDelete = () => {
    if (caseToDelete) {
      deleteMutation.mutate(caseToDelete);
      setIsDeleteDialogOpen(false);
      setCaseToDelete(null);
    }
  }

  const handleStatusChange = (caseId, status) => {
    updateStatusMutation.mutate({ id: caseId, status });
  }

  const handleSelectCase = (caseId, isChecked) => {
    if (isChecked) {
      setSelectedCases([...selectedCases, caseId]);
    } else {
      setSelectedCases(selectedCases.filter(id => id !== caseId));
    }
  }

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      setSelectedCases(filteredCases.map(c => c.id));
    } else {
      setSelectedCases([]);
    }
  }

  const confirmBulkDelete = () => {
    if (selectedCases.length > 0) {
      bulkDeleteMutation.mutate(selectedCases);
      setIsMultiDeleteDialogOpen(false);
    }
  }

  const filteredCases = cases.filter(caseItem => {
    const searchTerm = search.toLowerCase()
    return (
      caseItem.clients.some(client => 
        client.firstName.toLowerCase().includes(searchTerm) ||
        client.lastName.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm)
      ) ||
      caseItem.type.toLowerCase().includes(searchTerm) ||
      caseItem.products.some(product => 
        product.title.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
      ) ||
      caseItem.agent.toLowerCase().includes(searchTerm)
    )
  })

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-6xl shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-3xl">Richieste Documentali 📃</CardTitle>
              <CardDescription className="mb-2">
                Visualizza e gestisci tutte le richieste di documenti
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedCases.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setIsMultiDeleteDialogOpen(true)}
                  className="rounded-xl"
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina ({selectedCases.length})
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
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cerca per nome, email, tipo o prodotto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Caricamento...</div>
          ) : isError ? (
            <div className="text-center py-8 flex flex-col items-center">
              <div className="bg-red-50 p-4 rounded-xl max-w-md mb-2">
                <p className="text-red-800 font-medium mb-1">Si è verificato un problema</p>
                <p className="text-red-600 text-sm">
                  {error.message.includes("getIdToken") ? 
                    "Sessione scaduta. Per favore, effettua nuovamente l'accesso." : 
                    error.message || "Impossibile caricare le richieste documentali"}
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
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">Nessuna richiesta documentale trovata</p>
              <p className="text-gray-400 text-sm mb-4">Non ci sono ancora richieste documentali associate al tuo account.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={selectedCases.length === filteredCases.length && filteredCases.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prodotti</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((caseItem, index) => {
                  const statusOption = STATUS_OPTIONS.find(option => option.value === caseItem.status) || STATUS_OPTIONS[0];
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCases.includes(caseItem.id)}
                          onCheckedChange={(checked) => handleSelectCase(caseItem.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        {caseItem.clients.map((client, idx) => (
                          <div key={idx}>
                            {client.firstName} {client.lastName}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>
                        {caseItem.clients.map((client, idx) => (
                          <div key={idx}>{client.email}</div>
                        ))}
                      </TableCell>
                      <TableCell>
                        {caseItem.type === "privato" ? "Privato" : "Azienda"}
                      </TableCell>
                      <TableCell>
                        {caseItem.products.map((product, idx) => (
                          <div key={idx} className="text-sm">
                            {product.title} - {product.description}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={caseItem.status}
                          onValueChange={(value) => handleStatusChange(caseItem.id, value)}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${statusOption.color}`}></div>
                              <span>{statusOption.label}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{caseItem.agent}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(caseItem.id)}
                          className="hover:bg-red-100 hover:text-red-600"
                          aria-label="Elimina caso"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Single delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare questa richiesta documentale?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. La richiesta documentale e tutti i dati associati saranno
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
            <AlertDialogTitle>Sei sicuro di voler eliminare {selectedCases.length} richieste documentali?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Tutte le richieste selezionate e i relativi dati saranno
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
              {bulkDeleteMutation.isPending ? "Eliminazione..." : `Elimina (${selectedCases.length})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
