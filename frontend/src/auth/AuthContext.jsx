// src/auth/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import { auth, db } from "./firebase"; 
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { API_BASE_URL, API_ENDPOINTS, ADMIN_EMAILS, getApiUrl } from '@/config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to check if email is admin
  const isAdminEmail = (email) => {
    console.log("Checking if email is admin:", email);
    console.log("Admin emails list:", ADMIN_EMAILS);
    // Make it robust: check if ADMIN_EMAILS is an array
    const isAdmin = email && Array.isArray(ADMIN_EMAILS) && ADMIN_EMAILS.includes(email.toLowerCase());
    if (!Array.isArray(ADMIN_EMAILS)) {
      console.warn("ADMIN_EMAILS is not an array. Check configuration in @/config.js. Emails:", ADMIN_EMAILS);
    }
    console.log("Is admin email?", isAdmin);
    return isAdmin;
  };

  // Function to check user's role and update the current user
  const checkUserRole = async (uid) => {
    try {
      // Check if this is a hardcoded admin first
      const currentUser = auth.currentUser;
      console.log("Current user in checkUserRole:", currentUser?.email);
      
      if (currentUser && isAdminEmail(currentUser.email)) {
        console.log("Admin email detected in hardcoded list:", currentUser.email);
        return 'admin';
      }

      // Use the server API to check role
      if (currentUser) {
        try {
          console.log("Getting ID token for role check");
          const idToken = await currentUser.getIdToken(true);
          console.log("ID token obtained, checking role with server");
          
          const response = await fetch(getApiUrl(`${API_ENDPOINTS.CHECK_USER_ROLE}/${uid}`), {
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
            // If we get a 404 and it's an admin email, return admin
            if (response.status === 404 && isAdminEmail(currentUser.email)) {
              console.log("404 received but email is admin, returning admin role");
              return 'admin';
            }
          }
        } catch (serverError) {
          console.error("Error calling server to check role:", serverError);
          // If server error and admin email, return admin
          if (isAdminEmail(currentUser.email)) {
            console.log("Server error but email is admin, returning admin role");
            return 'admin';
          }
        }
      }

      console.log("No admin role found, defaulting to agent");
      return 'agent';
    } catch (error) {
      console.error("Error checking user role:", error);
      // If error and admin email, return admin
      if (currentUser && isAdminEmail(currentUser.email)) {
        console.log("Error occurred but email is admin, returning admin role");
        return 'admin';
      }
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
      const response = await fetch(getApiUrl(`${API_ENDPOINTS.CREATE_ADMIN}/${currentUser.email}`), {
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
          
          if (isAdminEmail(currentUser.email)) {
            console.log("Admin email detected, setting up admin user");
            
            try {
              // Get fresh ID token
              const idToken = await currentUser.getIdToken(true);
              
              // Try to ensure admin record exists
              console.log("Attempting to fix admin account");
              const fixResponse = await fetch(getApiUrl(`/api/fix-specific-account?email=${currentUser.email}`), {
                headers: {
                  Authorization: `Bearer ${idToken}`
                }
              });
              
              if (!fixResponse.ok) {
                console.log("Fix account failed, trying create-admin");
                const createResponse = await fetch(getApiUrl(`${API_ENDPOINTS.CREATE_ADMIN}/${currentUser.email}`), {
                  headers: {
                    Authorization: `Bearer ${idToken}`
                  }
                });
                
                if (!createResponse.ok) {
                  console.error("Both admin setup attempts failed");
                }
              }
            } catch (error) {
              console.error("Error setting up admin:", error);
            }
            
            // Set as admin regardless of server response
            const adminUser = {
              ...currentUser,
              role: 'admin'
            };
            console.log("Setting up admin user:", adminUser);
            setUser(adminUser);
            setLoading(false);
            return;
          }
          
          console.log("Non-admin email, checking role via server");
          const role = await checkUserRole(currentUser.uid);
          console.log("Role determined:", role);
          
          const enhancedUser = {
            ...currentUser,
            role: role
          };
          
          console.log("Setting up user:", enhancedUser);
          setUser(enhancedUser);
          
        } catch (error) {
          console.error("Error in auth state change:", error);
          // Safer fallback: if any error occurs during role determination,
          // set role to 'agent' to prevent locking out completely or an inconsistent state.
          // Avoid calling isAdminEmail again here if it could be the source of the error.
          console.warn("Fallback due to error during auth state change: setting user role to 'agent'. Review logs and ADMIN_EMAILS config.");
          setUser({
            ...currentUser, // currentUser should still be valid from onAuthStateChanged
            role: 'agent' 
          });
        }
      } else {
        console.log("User logged out, clearing state");
        setUser(null);
      }
      setLoading(false); // Ensure loading is set to false in all paths
    });
    
    return unsubscribe;
  }, []);

  // Login function
  async function login(email, password) {
    try {
      console.log("Attempting login for:", email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful for:", email);
      
      // Return a promise that resolves when the user state is set
      return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            try {
              console.log("Auth state changed - user logged in:", currentUser.email);
              
              if (isAdminEmail(currentUser.email)) {
                console.log("Admin email detected, setting up admin user");
                const adminUser = {
                  ...currentUser,
                  role: 'admin'
                };
                console.log("Setting up admin user:", adminUser);
                setUser(adminUser);
                setLoading(false);
                unsubscribe();
                resolve(adminUser);
                return;
              }
              
              console.log("Non-admin email, checking role via server");
              const role = await checkUserRole(currentUser.uid);
              console.log("Role determined:", role);
              
              const enhancedUser = {
                ...currentUser,
                role: role
              };
              
              console.log("Setting up user:", enhancedUser);
              setUser(enhancedUser);
              setLoading(false);
              unsubscribe();
              resolve(enhancedUser);
            } catch (error) {
              console.error("Error in auth state change:", error);
              setUser({
                ...currentUser,
                role: 'agent'
              });
              setLoading(false);
              unsubscribe();
              resolve({
                ...currentUser,
                role: 'agent'
              });
            }
          }
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  // Logout function
  async function logout() {
    try {
      console.log("Logging out user");
      await signOut(auth);
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

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        checkUserRole,
        forceSetAdmin,
        isAdminEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;