// src/auth/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyASHxitcYHIR9BMy2NDfOahJTdbxNrGHrE",
    authDomain: "app-documenti.firebaseapp.com",
    projectId: "app-documenti",
    storageBucket: "app-documenti.firebasestorage.app",
    messagingSenderId: "1044455706020",
    appId: "1:1044455706020:web:4adcc1095dc7ef3b548531",
    measurementId: "G-9SNHMGGJTT"
};

console.log("Initializing Firebase with config:", {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Debug function to test Firestore connection
export const testFirestoreConnection = async () => {
    console.log("Testing Firestore connection...");
    try {
        // Try to get all collections
        const collections = await getDocs(collection(db, "agents"));
        console.log("Firestore connection successful!");
        console.log("Agents collection exists, document count:", collections.size);
        return true;
    } catch (error) {
        if (error.code === 'permission-denied') {
            console.log("Firestore connection works, but permissions are restricted (expected in production)");
            return true; // Consider the connection successful, just with limited permissions
        } else {
            console.error("Firestore connection test failed:", error);
            return false;
        }
    }
};

// Run the test immediately
testFirestoreConnection().then(result => {
    console.log("Firestore connection test result:", result ? "Connected" : "Failed");
});
