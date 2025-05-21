// AdminRoute.jsx
import React, { useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function AdminRoute() {
  const { user, loading, isAdminEmail } = useAuth();
  const { toast } = useToast();

  const isAdmin = user && (user.role === 'admin' || isAdminEmail(user.email));

  useEffect(() => {
    // console.log("AdminRoute - User:", user, "isAdmin:", isAdmin, "loading:", loading);
  }, [user, isAdmin, loading]);

  if (loading) {
    // console.log("AdminRoute: Auth state loading");
    return null;
  }

  if (user == null) {
    // console.log("AdminRoute: No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    // console.log("AdminRoute: Access denied, redirecting to home");
    toast({
      title: 'Accesso negato',
      description: 'Non hai i permessi necessari per accedere a questa pagina.',
      variant: 'destructive',
    });
    return <Navigate to="/" replace />;
  }
  
  // console.log("AdminRoute: User is admin, rendering admin routes");
  return <Outlet />;
}