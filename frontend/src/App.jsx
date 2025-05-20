import { useForm, FormProvider } from "react-hook-form"
import { Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import PrivateRoute from "./auth/PrivateRoute"
import AdminRoute from "./components/Company_Side/AdminRoute"
import AgentOnlyRoute from "./components/Company_Side/AgentOnlyRoute"

import Login from "./auth/Login"
import StartScreen from "./components/Company_Side/StartScreen"
import ClientData from "./components/Company_Side/ClientData"
import ClientType from "./components/Company_Side/ClientType"
import ProductsPrivate from "./components/Company_Side/ProductsPrivate"
import ProductsBusiness from "./components/Company_Side/ProductsBusiness"
import Review from "./components/Company_Side/Review"
import Success from "./components/Company_Side/Success"
import Agents from "./components/Company_Side/Users"
import Cases from "./components/Company_Side/Cases"
import LeadsAgenti from "./components/Company_Side/AgentLeads"
import AdminLeads from "./components/Company_Side/AdminLeads"
import AdminCases from "./components/Company_Side/AdminCases"

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
})

export default function App() {
  const methods = useForm({
    defaultValues: {
      clients: [{ firstName: "", lastName: "", email: "" }],    // Start with exactly one empty client
      type: "",
      products: []
    },
    mode: "onChange"
  })

  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...methods}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><StartScreen /></PrivateRoute>} />
          <Route path="/client-data" element={<PrivateRoute><ClientData /></PrivateRoute>} />
          <Route path="/client-type" element={<PrivateRoute><ClientType /></PrivateRoute>} />
          <Route path="/products-private" element={<PrivateRoute><ProductsPrivate /></PrivateRoute>} />
          <Route path="/products-business" element={<PrivateRoute><ProductsBusiness /></PrivateRoute>} />
          <Route path="/review" element={<PrivateRoute><Review /></PrivateRoute>} />
          <Route path="/success" element={<PrivateRoute><Success /></PrivateRoute>} />
          
          {/* Agent-only route for Leads management */}
          <Route element={<AgentOnlyRoute />}>
            <Route path="/my-leads" element={<LeadsAgenti />} />
          </Route>
          
          {/* Admin routes */}
          <Route element={<AdminRoute />}>
            <Route path="/agents" element={<Agents />} />
            <Route path="/admin-leads" element={<AdminLeads />} />
            <Route path="/admin-cases" element={<AdminCases />} />
          </Route>
          
          <Route path="/my-cases" element={<PrivateRoute><Cases /></PrivateRoute>} />
        </Routes>
      </FormProvider>
    </QueryClientProvider>
  )
}