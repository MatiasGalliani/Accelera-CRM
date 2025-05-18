// AdminRoute.jsx
import React, { useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function AdminRoute() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    console.log("AdminRoute - Component rendered");
    console.log("AdminRoute - User:", user);
    console.log("AdminRoute - isAdmin:", isAdmin);
  }, [user, isAdmin]);

  if (user == null) {
    console.log("AdminRoute: No user, redirecting to login");
    // not logged in → send to login
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    console.log("AdminRoute: Access denied, redirecting to home");
    toast({
      title: 'Accesso negato',
      description: 'Non hai i permessi necessari per accedere a questa pagina.',
      variant: 'destructive',
    });
    return <Navigate to="/" replace />;
  }
  
  console.log("AdminRoute: User is admin, rendering admin routes");
  // user is admin → render child routes
  return <Outlet />;
}