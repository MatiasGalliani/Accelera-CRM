import React, { useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function AgentOnlyRoute() {
  const { user, loading, isAdminEmail } = useAuth();
  const { toast } = useToast();

  const isAdmin = user && (user.role === 'admin' || isAdminEmail(user.email));
  const isAgent = user && user.role === 'agent';

  useEffect(() => {
    // console.log("AgentOnlyRoute - User:", user, "isAdmin:", isAdmin, "loading:", loading);
  }, [user, isAdmin, loading]);

  if (loading) {
    // console.log("AgentOnlyRoute: Auth state loading");
    return null;
  }

  if (user == null) {
    // console.log("AgentOnlyRoute: No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  if (!isAgent) {
    // console.log("AgentOnlyRoute: Admin access denied, redirecting to home");
    toast({
      title: 'Accesso negato',
      description: 'Questa pagina è disponibile solo per gli agenti.',
      variant: 'destructive',
    });
    return <Navigate to="/" replace />;
  }
  
  // console.log("AgentOnlyRoute: User is agent, rendering agent-only routes");
  return <Outlet />;
} 