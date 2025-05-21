import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/auth/AuthContext"
import './index.css'
import App from './App.jsx'

// Import route components
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
import PrivateRoute from "./auth/PrivateRoute"
import AdminRoute from "./components/Company_Side/AdminRoute"
import AgentOnlyRoute from "./components/Company_Side/AgentOnlyRoute"

// Define routes using createBrowserRouter
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "login", element: <Login /> },
      { path: "/", element: <PrivateRoute><StartScreen /></PrivateRoute> },
      { path: "client-data", element: <PrivateRoute><ClientData /></PrivateRoute> },
      { path: "client-type", element: <PrivateRoute><ClientType /></PrivateRoute> },
      { path: "products-private", element: <PrivateRoute><ProductsPrivate /></PrivateRoute> },
      { path: "products-business", element: <PrivateRoute><ProductsBusiness /></PrivateRoute> },
      { path: "review", element: <PrivateRoute><Review /></PrivateRoute> },
      { path: "success", element: <PrivateRoute><Success /></PrivateRoute> },
      {
        element: <AgentOnlyRoute />,
        children: [
          { path: "my-leads", element: <LeadsAgenti /> },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          { path: "agents", element: <Agents /> },
          { path: "admin-leads", element: <AdminLeads /> },
          { path: "admin-cases", element: <AdminCases /> },
        ],
      },
      { path: "my-cases", element: <PrivateRoute><Cases /></PrivateRoute> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  </React.StrictMode>
)