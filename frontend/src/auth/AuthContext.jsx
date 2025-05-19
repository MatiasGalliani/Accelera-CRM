// src/auth/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import { auth, db } from "./firebase"; 
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { API_BASE_URL, API_ENDPOINTS, ADMIN_EMAILS } from '@/config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to check user's role and update the current user
  const checkUserRole = async (uid) => {
    try {
      // Check if this is a hardcoded admin first
      const currentUser = auth.currentUser;
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email?.toLowerCase())) {
        console.log("Admin email detected in hardcoded list:", currentUser.email);
        // Ensure admin record exists in backend
        console.log("Ensuring admin record for:", currentUser.email);
        try {
          const idToken = await currentUser.getIdToken(true);
          const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CREATE_ADMIN}/${currentUser.email}`, {
            headers: {
              Authorization: `Bearer ${idToken}`
            }
          });
          
          if (!response.ok) {
            console.error("Error ensuring admin status:", response.status);
            // Try the fix-specific-account endpoint as a fallback
            const fixResponse = await fetch(`${API_BASE_URL}/api/fix-specific-account?email=${currentUser.email}`, {
              headers: {
                Authorization: `Bearer ${idToken}`
              }
            });
            
            if (!fixResponse.ok) {
              console.error("Error fixing admin account:", fixResponse.status);
            }
          }
        } catch (error) {
          console.error("Server error when ensuring admin:", error);
        }
        return 'admin';
      }

      // Use the server API to check role instead of accessing Firestore directly
      if (currentUser) {
        try {
          console.log("Checking admin status via server for:", currentUser.email);
          const idToken = await currentUser.getIdToken(true);
          
          const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CHECK_USER_ROLE}/${uid}`, {
            headers: {
              Authorization: `Bearer ${idToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("Server returned user role data:", data);
            return data.role || 'agent';
          } else {
            console.error("Error from server when checking role:", response.status);
            // If we get a 404, try to fix the account if it's a known admin
            if (response.status === 404 && currentUser.email && ADMIN_EMAILS.includes(currentUser.email?.toLowerCase())) {
              console.log("Attempting to fix admin account after 404");
              const fixResponse = await fetch(`${API_BASE_URL}/api/fix-specific-account?email=${currentUser.email}`, {
                headers: {
                  Authorization: `Bearer ${idToken}`
                }
              });
              
              if (fixResponse.ok) {
                return 'admin';
              }
            }
          }
        } catch (serverError) {
          console.error("Error calling server to check role:", serverError);
        }
      }

      console.log("No admin role found, defaulting to agent");
      return 'agent';
    } catch (error) {
      console.error("Error checking user role:", error);
      return 'agent';
    }
  };

  // Function to ensure a user has admin privileges via server API
  const ensureAdminRecord = async (currentUser) => {
    if (!currentUser) return;
    
    try {
      console.log("Ensuring admin record for:", currentUser.email);
      const idToken = await currentUser.getIdToken(true);
      
      // Use the create-admin endpoint to ensure admin status
      const response = await fetch(`/api/create-admin/${currentUser.email}`, {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Admin record ensured via server:", result);
        
        // Update the user state with admin role
        if (user && user.uid === currentUser.uid) {
          console.log("Updating local user state to admin");
          setUser({
            ...user,
            role: 'admin'
          });
        }
        return true;
      } else {
        console.error("Server error when ensuring admin:", response.status);
        return false;
      }
    } catch (error) {
      console.error("Error ensuring admin record:", error);
      return false;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          console.log("Auth state changed - user logged in:", currentUser.email);
          
          // Special case for hardcoded admin emails - case insensitive check
          if (ADMIN_EMAILS.includes(currentUser.email?.toLowerCase())) {
            console.log("Admin email detected in hardcoded list!");
            
            // Try to ensure admin record exists via server
            try {
              const idToken = await currentUser.getIdToken(true);
              
              // First try the fix-specific-account endpoint
              const fixResponse = await fetch(`${API_BASE_URL}/api/fix-specific-account?email=${currentUser.email}`, {
                headers: {
                  Authorization: `Bearer ${idToken}`
                }
              });
              
              if (!fixResponse.ok) {
                console.log("Fix account failed, trying create-admin endpoint");
                // If that fails, try the create-admin endpoint
                const createResponse = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CREATE_ADMIN}/${currentUser.email}`, {
                  headers: {
                    Authorization: `Bearer ${idToken}`
                  }
                });
                
                if (!createResponse.ok) {
                  console.error("Both fix and create admin attempts failed");
                }
              }
            } catch (error) {
              console.error("Error ensuring admin status:", error);
            }
            
            // Set as admin regardless of server response
            const enhancedUser = {
              ...currentUser,
              role: 'admin'
            };
            
            console.log("Setting hardcoded admin user:", enhancedUser);
            setUser(enhancedUser);
            setLoading(false);
            return;
          }
          
          // For all other emails, check role via server
          console.log("Checking role for user:", currentUser.uid);
          const role = await checkUserRole(currentUser.uid);
          
          console.log("Role determined from server:", role);
          const enhancedUser = {
            ...currentUser,
            role: role
          };
          
          console.log("Setting user with role:", role);
          setUser(enhancedUser);
        } catch (error) {
          console.error("Error in auth state change:", error);
          // If this is a hardcoded admin email, set as admin even if server check fails
          if (currentUser.email && ADMIN_EMAILS.includes(currentUser.email?.toLowerCase())) {
            console.log("Error occurred but email is hardcoded admin, setting admin role");
            setUser({
              ...currentUser,
              role: 'admin'
            });
          } else {
            setUser({
              ...currentUser,
              role: 'agent' // Default to agent role on error
            });
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  // Login
  async function login(email, password) {
    try {
      console.log("Logging in with email:", email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Immediately check role after successful login to ensure proper permissions
      if (result.user) {
        console.log("Login successful, checking role...");
        // The role will be checked and set by onAuthStateChanged
      }
      
      return result;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  // Logout
  async function logout() {
    try {
      console.log("Logging out user");
      await signOut(auth);
      // User state will be set to null by onAuthStateChanged
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  // Force set admin for current user
  const forceSetAdmin = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    
    try {
      console.log("Forcing admin role for:", currentUser.email);
      const success = await ensureAdminRecord(currentUser);
      
      if (success) {
        // Update local state
        setUser({
          ...user,
          role: 'admin'
        });
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error forcing admin role:", error);
      return false;
    }
  };

  // While verifying auth state, don't render anything
  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, checkUserRole, forceSetAdmin, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to easily consume the context
export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;