import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { API_BASE_URL, API_ENDPOINTS } from '@/config';

export default function LeadSourceTabs({ value, onValueChange, allSources }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [availableSources, setAvailableSources] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    
    async function fetchAllowedSources() {
      try {
        if (!user) return;
        
        // Get authentication token
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
        
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.LEADS}/allowed-sources`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error("Sessione scaduta o non autorizzata. Effettua nuovamente l'accesso.");
          }
          throw new Error('Errore nel caricamento delle fonti consentite');
        }
        
        const allowedSourceIds = await response.json();
        
        if (!isMounted) return;
        
        // Filter sources based on permissions
        if (allowedSourceIds.length > 0) {
          const filteredSources = allSources.filter(source => 
            allowedSourceIds.includes(source.id)
          );
          setAvailableSources(filteredSources);
          
          // If current source is not allowed, switch to first available
          if (!allowedSourceIds.includes(value)) {
            onValueChange(filteredSources[0].id);
          }
        } else {
          toast({
            title: "Nessun accesso",
            description: "Non hai accesso a nessuna fonte di leads",
            variant: "destructive"
          });
          setAvailableSources([]);
        }
      } catch (error) {
        console.error('Error fetching allowed sources:', error);
        if (isMounted) {
          toast({
            title: "Errore",
            description: error.message || "Errore nel caricamento delle fonti consentite",
            variant: "destructive"
          });
          setAvailableSources([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    fetchAllowedSources();
    
    return () => {
      isMounted = false;
    };
  }, [user, allSources, value, onValueChange, toast]);
  
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  
  // If no sources available, show nothing
  if (availableSources.length === 0) {
    return null;
  }
  
  // If only one source available, just show the name
  if (availableSources.length === 1) {
    return (
      <div className="bg-primary text-primary-foreground rounded-md py-2 px-4 text-center font-semibold">
        {availableSources[0].name}
      </div>
    );
  }
  
  // If multiple sources, show tabs
  return (
    <Tabs 
      value={value} 
      onValueChange={onValueChange}
      className="w-full"
    >
      <TabsList className={`grid grid-cols-${availableSources.length > 3 ? 3 : availableSources.length} w-full`}>
        {availableSources.map(source => (
          <TabsTrigger key={source.id} value={source.id}>
            {source.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
} 