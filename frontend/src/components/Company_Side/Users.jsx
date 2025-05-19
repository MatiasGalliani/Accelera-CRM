import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/auth/AuthContext";
import { getAuth } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Card, CardHeader, CardTitle, CardDescription,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import LogoHeader from "./LogoHeader";
import { Loader2, ShieldAlert, Check, Search, Share2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { API_BASE_URL, API_ENDPOINTS } from '@/config';

export default function Agents() {
  const { user, checkUserRole } = useAuth();
  const { toast } = useToast();
  const [agents, setAgents] = useState([]);
  const [firebaseUsers, setFirebaseUsers] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [newAgent, setNewAgent] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "agent",
    pages: ["aiquinto"],
    leadSources: ["aiquinto"]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState(true);
  const [deletingAgents, setDeletingAgents] = useState({});
  const [claimingAdmin, setClaimingAdmin] = useState(false);
  const [pageSelectOpen, setPageSelectOpen] = useState(false);
  const [selectedAgentForPages, setSelectedAgentForPages] = useState(null);
  const [editingPages, setEditingPages] = useState([]);
  const [showPagesDialog, setShowPagesDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Page options for multi-select
  const pageOptions = [
    { id: "aiquinto", label: "AIQuinto.it" },
    { id: "aimedici", label: "AIMedici.it" },
    { id: "aifidi", label: "AIFidi.it" },
  ];

  // Lead sources options for multi-select (using the same options as pages)
  const leadSourceOptions = pageOptions;

  // Input handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAgent((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (value) => {
    setNewAgent((prev) => {
      if (value === "admin") {
        // When switching to admin, set all available sources and pages for UI consistency
        return {
          ...prev,
          role: value,
          pages: pageOptions.map(page => page.id),
          leadSources: pageOptions.map(source => source.id)
        };
      } else {
        // When switching to agent, keep the current selections or default to aiquinto
        return {
          ...prev,
          role: value,
          pages: prev.pages.length > 0 ? prev.pages : ["aiquinto"],
          leadSources: prev.pages.length > 0 ? prev.pages : ["aiquinto"]
        };
      }
    });
  };

  const handlePageChange = (pageId, checked) => {
    setNewAgent((prev) => {
      const updatedPages = checked 
        ? [...prev.pages, pageId] 
        : prev.pages.filter(id => id !== pageId);
      
      // Keep leadSources in sync with pages for backend compatibility
      return { 
        ...prev, 
        pages: updatedPages,
        leadSources: updatedPages
      };
    });
  };

  // Claim admin role function
  const claimAdminRole = async () => {
    setClaimingAdmin(true);
    try {
      if (!user?.email) {
        throw new Error("User email not available");
      }
      
      console.log("Claiming admin role for:", user.email);
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CREATE_ADMIN}/${user.email}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to claim admin role");
      }
      
      const result = await response.json();
      console.log("Admin role claim successful:", result);
      
      // Manually check the role in the database
      if (user?.uid) {
        await checkUserRole(user.uid);
      }
      
      toast({ 
        title: "Admin role granted", 
        description: "Per garantire l'attivazione completa dei privilegi di amministratore, per favore esci e accedi nuovamente.",
        duration: 10000,
      });
      
      // Force refresh the agent list
      fetchAgents();
    } catch (error) {
      console.error("Error claiming admin role:", error);
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setClaimingAdmin(false);
    }
  };

  // Fetch agents when user is available
  useEffect(() => {
    if (user) {
      Promise.all([fetchAgents(), fetchFirebaseUsers()])
        .finally(() => setLoadingState(false));
    }
  }, [user]);

  // Combine agents and firebase users into a single list
  const combinedAgents = useMemo(() => {
    // Create a map of all Firebase UIDs to avoid duplicates
    const uidMap = new Map();
    firebaseUsers.forEach(user => {
      uidMap.set(user.uid, {
        id: user.uid,
        uid: user.uid,
        email: user.email,
        firstName: user.displayName ? user.displayName.split(' ')[0] : 'Firebase',
        lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : 'User',
        role: 'firebase_user',
        isFirebaseOnly: true
      });
    });

    // Add Firestore agents and mark the ones that have matching Firebase accounts
    agents.forEach(agent => {
      if (uidMap.has(agent.uid)) {
        // This agent exists in Firebase too, update with Firestore info
        const existingUser = uidMap.get(agent.uid);
        uidMap.set(agent.uid, {
          ...existingUser,
          ...agent,
          isFirebaseOnly: false
        });
      } else {
        // This agent only exists in Firestore
        uidMap.set(agent.uid || agent.id, {
          ...agent,
          isFirebaseOnly: false
        });
      }
    });

    return Array.from(uidMap.values());
  }, [agents, firebaseUsers]);

  // Filter agents based on search query
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return combinedAgents;
    
    return combinedAgents.filter(agent => {
      const fullName = `${agent.firstName} ${agent.lastName}`.toLowerCase();
      const email = agent.email.toLowerCase();
      const query = searchQuery.toLowerCase();
      
      return fullName.includes(query) || email.includes(query);
    });
  }, [combinedAgents, searchQuery]);

  async function fetchAgents() {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Utente non autenticato");
      const idToken = await currentUser.getIdToken(true);

      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AGENTS}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error("Errore recupero agenti");
      
      const agentsData = await res.json();
      console.log("Fetched agents data:", agentsData);
      
      // Ensure each agent has pages array
      const processedAgents = agentsData.map(agent => ({
        ...agent,
        pages: agent.pages || [],
        leadSources: agent.leadSources || []
      }));
      
      console.log("Processed agents data:", processedAgents);
      setAgents(processedAgents);
    } catch (err) {
      console.error("Error fetching agents:", err);
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  }

  async function fetchFirebaseUsers() {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Utente non autenticato");
      const idToken = await currentUser.getIdToken(true);

      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.FIREBASE_USERS}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error("Errore recupero utenti Firebase");
      setFirebaseUsers(await res.json());
    } catch (err) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Utente non autenticato");
      const idToken = await currentUser.getIdToken(true);

      console.log("Current newAgent state:", newAgent);

      // Create a submission copy that keeps compatibility with backend
      const submissionData = {
        ...newAgent,
        // Ensure pages and leadSources are properly included
        pages: newAgent.pages || ["aiquinto"],
        leadSources: newAgent.pages || ["aiquinto"],
        // Keep page field for backward compatibility
        page: newAgent.pages[0] || "aiquinto"
      };

      console.log("Submitting data:", submissionData);

      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AGENTS}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(submissionData),
      });
      
      if (!res.ok) throw new Error("Creazione fallita");
      
      const createdAgent = await res.json();
      console.log("Created agent response:", createdAgent);

      // Immediately set up the pages for the new agent
      await setupAgentPages(createdAgent.id || createdAgent.uid, newAgent.pages || ["aiquinto"], idToken);
      
      // Show different message based on role
      if (newAgent.role === 'admin') {
        toast({ 
          title: "Amministratore Creato", 
          description: "L'utente è stato creato con privilegi di amministratore. Potresti aver bisogno di verificare lo stato di amministratore.",
          duration: 7000,
        });
      } else {
        toast({ 
          title: "Agente Creato", 
          description: "L'agente è stato creato con successo.",
          duration: 4000,
        });
      }
      
      // Reset form with default values
      setNewAgent({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "agent",
        pages: ["aiquinto"],
        leadSources: ["aiquinto"]
      });
      
      // Refresh lists
      await Promise.all([fetchAgents(), fetchFirebaseUsers()]);
    } catch (err) {
      console.error("Error creating agent:", err);
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  // New function to set up initial pages for an agent
  const setupAgentPages = async (agentId, pages, idToken) => {
    try {
      console.log("Setting up initial pages for agent:", agentId, "pages:", pages);
      
      const res = await fetch(`${API_BASE_URL}/api/agents/${agentId}/pages`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ 
          pages: pages,
          leadSources: pages
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error setting up pages:", errorText);
        throw new Error("Impostazione pagine fallita");
      }
      
      const result = await res.json();
      console.log("Pages setup result:", result);
      
      return result;
    } catch (err) {
      console.error("Error in setupAgentPages:", err);
      throw err;
    }
  };

  async function deleteAgent(agent) {
    const agentId = agent.id || agent.uid;
    setDeletingAgents(prev => ({ ...prev, [agentId]: true }));
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Utente non autenticato");
      const idToken = await currentUser.getIdToken(true);

      console.log("Deleting agent:", agent);
      
      // Track deletion results
      let firebaseDeleted = false;
      let firestoreDeleted = false;
      
      // If agent is a Firebase user (has uid)
      if (agent.uid) {
        console.log("Attempting to delete Firebase user with UID:", agent.uid);
        try {
          // Use the uid as parameter for Firebase deletion
          const deleteUserRes = await fetch(`${API_BASE_URL}/api/agents/firebase-user/${agent.uid}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${idToken}` },
          });
          
          if (!deleteUserRes.ok) {
            const errorText = await deleteUserRes.text();
            console.error("Error deleting Firebase user:", errorText);
          } else {
            console.log("Firebase user deleted successfully");
            firebaseDeleted = true;
          }
        } catch (fbError) {
          console.error("Error during Firebase user deletion:", fbError);
        }
      }

      // If agent has a Firestore record (has id)
      if (agent.id && !agent.isFirebaseOnly) {
        console.log("Attempting to delete Firestore agent with ID:", agent.id);
        const res = await fetch(`${API_BASE_URL}/api/agents/${agent.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Error deleting Firestore agent:", errorText);
        } else {
          console.log("Firestore agent deleted successfully");
          firestoreDeleted = true;
        }
      }

      // Refresh both data sources
      await Promise.all([fetchAgents(), fetchFirebaseUsers()]);
      
      if (firebaseDeleted || firestoreDeleted) {
        toast({ 
          title: "Agente eliminato", 
          description: "Operazione completata con successo!"
        });
      } else {
        toast({ 
          title: "Attenzione", 
          description: "L'operazione potrebbe non essere stata completata. Verificare la lista aggiornata.", 
          variant: "destructive" 
        });
      }
      
    } catch (err) {
      console.error("Agent deletion error:", err);
      await Promise.all([fetchAgents(), fetchFirebaseUsers()]);
      toast({ 
        title: "Errore", 
        description: `Si è verificato un errore durante l'eliminazione. La lista è stata aggiornata.`, 
        variant: "destructive" 
      });
    } finally {
      setDeletingAgents(prev => {
        const newState = { ...prev };
        delete newState[agentId];
        return newState;
      });
    }
  }

  // New function to verify admin status
  const verifyAdminStatus = async (agent) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Utente non autenticato");
      const idToken = await currentUser.getIdToken(true);
      
      // Set a loading state for this specific agent
      setDeletingAgents(prev => ({ ...prev, [`verify_${agent.id || agent.uid}`]: true }));
      
      console.log(`Verifying admin status for: ${agent.email}`);
      const response = await fetch(`${API_BASE_URL}/api/verify-admin/${agent.email}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Verifica fallita");
      }
      
      const result = await response.json();
      console.log("Verify admin result:", result);
      
      toast({
        title: "Verifica admin completata",
        description: result.fixed ? "Account admin riparato con successo" : "L'account è già configurato correttamente",
        duration: 5000,
      });
      
      // Refresh the agent list
      await Promise.all([fetchAgents(), fetchFirebaseUsers()]);
    } catch (error) {
      console.error("Error verifying admin status:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      // Clear loading state
      setDeletingAgents(prev => {
        const newState = { ...prev };
        delete newState[`verify_${agent.id || agent.uid}`];
        return newState;
      });
    }
  };

  // Function to fix specific account issue
  const fixSpecificAccount = async () => {
    try {
      setClaimingAdmin(true);
      const email = 'it@creditplan.it';
      
      console.log(`Fixing specific account: ${email}`);
      const response = await fetch(`${API_BASE_URL}/api/fix-specific-account?email=${email}`);
      
      if (!response.ok) {
        throw new Error('Riparazione fallita');
      }
      
      const result = await response.json();
      console.log("Account fix result:", result);
      
      toast({
        title: "Account riparato",
        description: "L'account admin è stato riparato con successo. Per favore esci e accedi nuovamente.",
        duration: 10000,
      });
      
      await Promise.all([fetchAgents(), fetchFirebaseUsers()]);
    } catch (error) {
      console.error("Error fixing account:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setClaimingAdmin(false);
    }
  };

  // Open pages dialog for an agent
  const openPagesDialog = (agent) => {
    console.log("Opening dialog for agent:", agent);
    setSelectedAgentForPages(agent);
    // Initialize with agent's current pages or default to empty array
    const agentPages = agent.pages || [];
    console.log("Setting editing pages to:", agentPages);
    setEditingPages(agentPages);
    setShowPagesDialog(true);
  };

  // Handle page checkbox toggle in the dialog
  const handleEditPageToggle = (pageId, checked) => {
    console.log("Toggling page:", pageId, "checked:", checked);
    if (checked) {
      setEditingPages(prev => [...prev, pageId]);
    } else {
      setEditingPages(prev => prev.filter(id => id !== pageId));
    }
  };

  // Save the updated pages for the agent
  const saveAgentPages = async () => {
    if (!selectedAgentForPages) return;
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Utente non autenticato");
      const idToken = await currentUser.getIdToken(true);

      console.log("Saving pages for agent:", selectedAgentForPages);
      console.log("Pages to save:", editingPages);

      setDeletingAgents(prev => ({ 
        ...prev, 
        [`pages_${selectedAgentForPages.id || selectedAgentForPages.uid}`]: true 
      }));
      
      const res = await fetch(`${API_BASE_URL}/api/agents/${selectedAgentForPages.id || selectedAgentForPages.uid}/pages`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ 
          pages: editingPages,
          leadSources: editingPages
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        throw new Error("Aggiornamento pagine fallito");
      }
      
      const result = await res.json();
      console.log("Update result:", result);
      
      setAgents(prevAgents => 
        prevAgents.map(agent => 
          agent.id === selectedAgentForPages.id || agent.uid === selectedAgentForPages.uid
            ? { ...agent, pages: editingPages, leadSources: editingPages }
            : agent
        )
      );
      
      toast({ 
        title: "Pagine aggiornate", 
        description: "Le pagine dell'agente e le assegnazioni lead sono state aggiornate con successo."
      });
      
      setShowPagesDialog(false);
      await fetchAgents();
    } catch (err) {
      console.error("Error updating pages:", err);
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setDeletingAgents(prev => {
        const newState = { ...prev };
        delete newState[`pages_${selectedAgentForPages.id || selectedAgentForPages.uid}`];
        return newState;
      });
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <LogoHeader />
      <div className="w-full max-w-3xl space-y-4 mt-16">
        {/* Admin status card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-center">Stato Amministratore</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <p className="text-sm mb-1"><strong>Email utente:</strong> {user?.email}</p>
              <p className="text-sm mb-1"><strong>Ruolo attuale:</strong> {user?.role || "Sconosciuto"}</p>
              <p className="text-sm">
                <strong>Stato:</strong>{" "}
                <span className="text-green-600 font-medium">Privilegi di amministratore attivi</span>
              </p>
            </div>
            
            <div className="mt-4 p-2 bg-green-50 rounded-lg">
              <p className="text-xs text-green-700 text-center">
                Hai accesso completo come amministratore del sistema. Puoi gestire gli agenti e visualizzare tutte le risorse.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-center">Gestione Utenti</CardTitle>
            <CardDescription className="text-center text-sm">
              Aggiungi nuovi utenti al sistema
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={newAgent.firstName}
                    onChange={handleInputChange}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Cognome</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={newAgent.lastName}
                    onChange={handleInputChange}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={newAgent.email}
                    onChange={handleInputChange}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={newAgent.password}
                      onChange={handleInputChange}
                      required
                      className="rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                      tabIndex="-1"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Ruolo</Label>
                  <Select
                    value={newAgent.role}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seleziona un ruolo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agente</SelectItem>
                      <SelectItem value="admin">Amministratore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newAgent.role !== "admin" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="pages">Pagine</Label>
                      <Popover open={pageSelectOpen} onOpenChange={setPageSelectOpen}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            role="combobox"
                            className="w-full justify-between rounded-xl text-left"
                          >
                            {newAgent.pages.length === 0 
                              ? "Seleziona le pagine" 
                              : pageOptions
                                  .filter(page => newAgent.pages.includes(page.id))
                                  .map(page => page.label.replace('.it', ''))
                                  .join(', ')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-[var(--radix-popover-trigger-width)] p-2 bg-white" 
                          align="start"
                          style={{ opacity: 1 }}
                        >
                          <div className="space-y-2">
                            {pageOptions.map((page) => (
                              <div key={page.id} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`page-${page.id}`}
                                  checked={newAgent.pages.includes(page.id)}
                                  onCheckedChange={(checked) => handlePageChange(page.id, checked)}
                                />
                                <label 
                                  htmlFor={`page-${page.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {page.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                )}

                {newAgent.role === "admin" && (
                  <div className="col-span-2 p-3 bg-blue-50 rounded-lg text-blue-700 text-sm">
                    <p className="font-medium mb-1">Nota: Gli amministratori hanno accesso a tutte le risorse</p>
                    <p>Gli amministratori non sono inclusi nel sistema round-robin per l'assegnazione dei lead.</p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl text-sm py-1"
              >
                {isLoading ? "Creazione in corso..." : "Crea Agente"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Lista Utenti</CardTitle>
            <CardDescription className="text-sm">
              Visualizza e gestisci tutti gli utenti del sistema
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loadingState ? (
              <div className="flex justify-center py-4">
                <p>Caricamento in corso...</p>
              </div>
            ) : combinedAgents.length === 0 ? (
              <Alert className="py-2">
                <AlertTitle className="text-sm">Nessun agente trovato</AlertTitle>
                <AlertDescription className="text-sm">
                  Non ci sono agenti nel sistema. Aggiungine uno usando il form sopra.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Cerca per nome o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 rounded-xl"
                  />
                </div>
                
                {/* Admins Section */}
                {filteredAgents.filter(agent => agent.role === 'admin').length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm mb-2 border-b pb-1">Amministratori</h3>
                    <div className="space-y-2">
                      {filteredAgents
                        .filter(agent => agent.role === 'admin')
                        .map((agent) => {
                          const agentId = agent.id || agent.uid;
                          const isDeleting = deletingAgents[agentId];
                          const isVerifying = deletingAgents[`verify_${agentId}`];
                          
                          return (
                            <Card key={agentId} className="p-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="font-semibold text-sm">
                                    {agent.firstName} {agent.lastName}
                                  </h3>
                                  <p className="text-xs text-gray-500">{agent.email}</p>
                                  <p className="text-xs text-gray-500">
                                    {agent.isFirebaseOnly 
                                      ? "Utente Firebase" 
                                      : "Ruolo: Amministratore"}
                                  </p>
                                </div>
                                <div className="flex space-x-2">
                                  {/* Verify Admin button - only for admin accounts */}
                                  {!agent.isFirebaseOnly && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={`rounded-xl text-xs h-7 transition-colors ${isVerifying ? 'bg-blue-100 hover:bg-blue-100' : ''}`}
                                      onClick={() => verifyAdminStatus(agent)}
                                      disabled={isVerifying || isDeleting}
                                    >
                                      {isVerifying ? (
                                        <div className="flex items-center space-x-1">
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          <span>Verifica...</span>
                                        </div>
                                      ) : (
                                        <span>Verifica Admin</span>
                                      )}
                                    </Button>
                                  )}
                                  
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className={`rounded-xl text-xs h-7 transition-colors ${isDeleting ? 'bg-red-800 hover:bg-red-800' : ''}`}
                                    onClick={() => deleteAgent(agent)}
                                    disabled={isDeleting || isVerifying}
                                  >
                                    {isDeleting ? (
                                      <div className="flex items-center space-x-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Eliminando...</span>
                                      </div>
                                    ) : (
                                      "Elimina"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                )}
                
                {/* Agents Section */}
                {filteredAgents.filter(agent => agent.role !== 'admin').length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm mb-2 border-b pb-1">Agenti</h3>
                    <div className="space-y-2">
                      {filteredAgents
                        .filter(agent => agent.role !== 'admin')
                        .map((agent) => {
                          const agentId = agent.id || agent.uid;
                          const isDeleting = deletingAgents[agentId];
                          const isVerifying = deletingAgents[`verify_${agentId}`];
                          
                          return (
                            <Card key={agentId} className="p-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="font-semibold text-sm">
                                    {agent.firstName} {agent.lastName}
                                  </h3>
                                  <p className="text-xs text-gray-500">{agent.email}</p>
                                  <p className="text-xs text-gray-500">
                                    {agent.isFirebaseOnly 
                                      ? "Utente Firebase" 
                                      : "Ruolo: Agente"}
                                  </p>
                                </div>
                                <div className="flex space-x-2">                        
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl text-xs h-7 hover:bg-green-100 hover:text-green-600 flex items-center gap-1"
                                    onClick={() => openPagesDialog(agent)}
                                  >
                                    <Share2 className="h-3 w-3" /> 
                                    Pagine e Assegnazione Lead
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className={`rounded-xl text-xs h-7 transition-colors ${isDeleting ? 'bg-red-800 hover:bg-red-800' : ''}`}
                                    onClick={() => deleteAgent(agent)}
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? (
                                      <div className="flex items-center space-x-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Eliminando...</span>
                                      </div>
                                    ) : (
                                      "Elimina"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                )}
                
                {/* No results message when both lists are empty */}
                {filteredAgents.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Nessun risultato trovato</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pages Dialog */}
      <Dialog open={showPagesDialog} onOpenChange={setShowPagesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Impostazioni Pagine e Assegnazioni Lead</DialogTitle>
            <DialogDescription>
              Seleziona le pagine a cui questo agente può accedere. Queste impostazioni determinano anche quali lead vengono assegnati all'agente attraverso il sistema round-robin. Le fonti di leads vengono automaticamente sincronizzate con queste impostazioni.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {pageOptions.map((page) => (
              <div key={page.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`page-${page.id}`}
                  checked={editingPages.includes(page.id)}
                  onCheckedChange={(checked) => handleEditPageToggle(page.id, checked)}
                />
                <label htmlFor={`page-${page.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {page.label} <span className="text-xs text-muted-foreground">(Accesso e Round-Robin)</span>
                </label>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setShowPagesDialog(false)}
            >
              Annulla
            </Button>
            <Button 
              onClick={saveAgentPages}
              disabled={deletingAgents[`pages_${selectedAgentForPages?.id || selectedAgentForPages?.uid}`]}
            >
              {deletingAgents[`pages_${selectedAgentForPages?.id || selectedAgentForPages?.uid}`] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva Impostazioni'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}