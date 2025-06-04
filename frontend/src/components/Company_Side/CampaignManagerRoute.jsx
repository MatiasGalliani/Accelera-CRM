import React from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function CampaignManagerRoute() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'campaign_manager') {
    toast({
      title: 'Accesso negato',
      description: 'Questa pagina è disponibile solo per i campaign manager.',
      variant: 'destructive',
    });
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
} 