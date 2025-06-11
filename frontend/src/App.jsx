import React, { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form"
import { Outlet, useNavigation, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider, useIsFetching } from "@tanstack/react-query"
import SidePanel from "./components/SidePanel"
import MobileHeader from "./components/MobileHeader"
import { useAuth } from "@/auth/AuthContext"
import EmailCreation from './components/Company_Side/EmailCreation';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
})

// New inner component to access QueryClient context for useIsFetching
function AppContent() {
  const methods = useForm({
    defaultValues: {
      clients: [{ firstName: "", lastName: "", email: "" }],
      type: "",
      products: []
    },
    mode: "onChange"
  })
  const navigation = useNavigation();
  const isFetching = useIsFetching(); // Get TanStack Query's fetching state
  const { user } = useAuth();

  useEffect(() => {
    const initialSpinner = document.getElementById('initial-spinner');
    if (initialSpinner) {
      initialSpinner.remove();
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  console.log("Navigation state:", navigation.state); // Log navigation state
  console.log("TanStack Query isFetching:", isFetching); // Log isFetching state

  return (
    <FormProvider {...methods}>
      {(isFetching > 0 || navigation.state === "loading")}
      <div className="relative min-h-screen">
        {user && <MobileHeader />}

        {user ? (
          <div className="flex min-h-screen">
            <SidePanel />
            <div className="flex-1 bg-gray-50 lg:ml-64 lg:mt-0 mt-16">
              <Outlet />
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </FormProvider>
  );
}

export default function App() {
  // Shell component that provides QueryClient context
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}