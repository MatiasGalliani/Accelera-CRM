import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function LeadSourceTabs({ value, onValueChange, allSources }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [availableSources, setAvailableSources] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchAllowedSources() {
      try {
        if (!user) return;
        
        // Obtener el token de autenticación
        const { auth } = await import('@/auth/firebase');
        if (!auth.currentUser) {
          throw new Error("Sessione scaduta, effettua nuovamente l'accesso");
        }
        
        const token = await auth.currentUser.getIdToken(true);
        
        const response = await fetch('/api/leads/allowed-sources', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Error al obtener fuentes permitidas');
        }
        
        const allowedSourceIds = await response.json();
        
        // Filtrar las fuentes según los permisos
        if (allowedSourceIds.length > 0) {
          const filteredSources = allSources.filter(source => 
            allowedSourceIds.includes(source.id)
          );
          setAvailableSources(filteredSources);
          
          // Si la fuente actual no está permitida, cambiar a la primera disponible
          if (!allowedSourceIds.includes(value)) {
            onValueChange(filteredSources[0].id);
          }
        } else {
          // Si no hay fuentes permitidas, mostrar mensaje
          toast({
            title: "Sin acceso",
            description: "No tienes acceso a ninguna fuente de leads",
            variant: "destructive"
          });
          setAvailableSources([]);
        }
      } catch (error) {
        console.error('Error fetching allowed sources:', error);
        toast({
          title: "Error",
          description: error.message || "Error al cargar las fuentes permitidas",
          variant: "destructive"
        });
        setAvailableSources([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAllowedSources();
  }, [user, allSources, value, onValueChange, toast]);
  
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  
  // Si no hay fuentes disponibles, no mostrar nada
  if (availableSources.length === 0) {
    return null;
  }
  
  // Si solo hay una fuente disponible, mostrar solo el nombre
  if (availableSources.length === 1) {
    return (
      <div className="bg-primary text-primary-foreground rounded-md py-2 px-4 text-center font-semibold">
        {availableSources[0].name}
      </div>
    );
  }
  
  // Si hay múltiples fuentes, mostrar las pestañas
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