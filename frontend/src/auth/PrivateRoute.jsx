// src/auth/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "./AuthContext";

export default function PrivateRoute({ children }) {
  const { user, loading } = useContext(AuthContext); // Get loading state

  if (loading) {
    // If still loading auth state, don't render anything yet
    // or render a loading spinner
    return null; // Or <LoadingSpinner />;
  }

  // If not loading and no user, redirect to /login
  return user ? children : <Navigate to="/login" replace />;
}
