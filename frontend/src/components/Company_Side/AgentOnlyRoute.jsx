import React, { useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function AgentOnlyRoute() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    console.log("AgentOnlyRoute - Component rendered");
    console.log("AgentOnlyRoute - User:", user);
    console.log("AgentOnlyRoute - isAdmin:", isAdmin);
  }, [user, isAdmin]);

  if (user == null) {
    console.log("AgentOnlyRoute: No user, redirecting to login");
    // not logged in → send to login
    return <Navigate to="/login" replace />;
  }
  
  if (isAdmin) {
    console.log("AgentOnlyRoute: Admin access denied, redirecting to home");
    toast({
      title: 'Accesso negato',
      description: 'Questa pagina è disponibile solo per gli agenti.',
      variant: 'destructive',
    });
    return <Navigate to="/" replace />;
  }
  
  console.log("AgentOnlyRoute: User is agent, rendering agent-only routes");
  // user is agent (non-admin) → render child routes
  return <Outlet />;
} 