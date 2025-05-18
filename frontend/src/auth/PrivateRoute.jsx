// src/auth/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "./AuthContext";

export default function PrivateRoute({ children }) {
  const { user } = useContext(AuthContext);
  // Si no hay usuario logueado, redirige a /login
  return user ? children : <Navigate to="/login" replace />;
}
