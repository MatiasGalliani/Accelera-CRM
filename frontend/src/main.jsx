import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/auth/AuthContext"
import './index.css'
import App from './App.jsx'

// Import route components
import Login from "./auth/Login"
import Home from "./components/Company_Side/Home"
import ClientData from "./components/Company_Side/ClientData"
import ClientType from "./components/Company_Side/ClientType"
import DocumentsPrivateGrouped from "./components/Company_Side/DocumentsPrivateGrouped"
import DocumentsBusinessGrouped from "./components/Company_Side/DocumentsBusinessGrouped"
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
import CampaignManagerRoute from "./components/Company_Side/CampaignManagerRoute"
import CampaignManagerLeads from "./components/Company_Side/CampaignManagerLeads"
import EugenioChat from "./components/Company_Side/EugenioChat"

// Define routes using createBrowserRouter
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <div>404 - Page Not Found</div>,
    children: [
      { path: "login", element: <Login /> },
      { path: "/", element: <PrivateRoute><Home /></PrivateRoute> },
      { path: "client-data", element: <PrivateRoute><ClientData /></PrivateRoute> },
      { path: "client-type", element: <PrivateRoute><ClientType /></PrivateRoute> },
      { path: "documents-privates-grouped", element: <PrivateRoute><DocumentsPrivateGrouped /></PrivateRoute> },
      { path: "documents-business-grouped", element: <PrivateRoute><DocumentsBusinessGrouped /></PrivateRoute> },
      { path: "review", element: <PrivateRoute><Review /></PrivateRoute> },
      { path: "success", element: <PrivateRoute><Success /></PrivateRoute> },
      { path: "eugenio-chat", element: <PrivateRoute><EugenioChat /></PrivateRoute> },
      {
        path: "agent",
        element: <AgentOnlyRoute />,
        children: [
          { path: "my-leads", element: <LeadsAgenti /> },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          { path: "users", element: <Agents /> },
          { path: "admin-leads", element: <AdminLeads /> },
          { path: "admin-cases", element: <AdminCases /> },
        ],
      },
      {
        element: <CampaignManagerRoute />,
        children: [
          { path: "campaign-leads", element: <CampaignManagerLeads /> },
        ],
      },
      { path: "my-cases", element: <PrivateRoute><Cases /></PrivateRoute> },
    ],
  },
]);

// Create root and render
const root = ReactDOM.createRoot(document.getElementById('root'))

// Remove initial spinner after app mounts
const removeSpinner = () => {
  const spinner = document.getElementById('initial-spinner')
  if (spinner) {
    spinner.remove()
  }
}

root.render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} onNavigate={removeSpinner} />
      <Toaster />
    </AuthProvider>
  </React.StrictMode>
)