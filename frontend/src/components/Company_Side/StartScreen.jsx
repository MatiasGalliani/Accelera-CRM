import { useAuth } from "@/auth/AuthContext";
// React import for potential hooks
import React from "react";

export default function StartScreen() {
    const { user, isAdminEmail, loading } = useAuth();
    
    // Calculate isAdmin. Handle user being null during initial load and ensure isAdminEmail is callable.
    const isAdmin = user && !loading && (user.role === 'admin' || (typeof isAdminEmail === 'function' && isAdminEmail(user.email)));
    const isCampaignManager = user && !loading && user.role === 'campaign_manager';
    
    const greetings = [
        {
            greeting: 'Buongiorno',
            emoji: '☀️',  // Sun emoji for morning
            equivalent: 'Good morning',
            time: '6:00 – 12:00',
            observations: 'It is used until noon; very common and formal.',
            fromHour: 6,
            toHour: 12,
        },
        {
            greeting: 'Buon pomeriggio',
            emoji: '🌤️',  // Sun behind cloud emoji for afternoon
            equivalent: 'Good afternoon',
            time: '12:00 – 17:00',
            observations: 'Less frequent than "buongiorno" or "buonasera".',
            fromHour: 12,
            toHour: 17,
        },
        {
            greeting: 'Buonasera',
            emoji: '🌙',  // Crescent moon emoji for evening
            equivalent: 'Good evening',
            time: '17:00 – 6:00',
            observations: 'From sunset through the night until early morning.',
            fromHour: 17,
            toHour: 6,
        },
    ]
    
    // Agent-only actions
    const agentActions = [
        {
            title: "My Leads 📝",
            description: "Visualizza i leads assegnati a te",
            to: "/my-leads",
        },
        {
            title: "Richieste Documentali📃",
            description: "Visualizza tutte le tue richieste documentali",
            to: "/my-cases",
            disabled: true
        },
        {
            title: "Pre Istruttoria Documenti IA 🤖",
            description: "Procedi con la richiesta iniziale dei documenti",
            to: "/client-type",
            disabled: true
        }
    ];

    
    // Admin-only actions
    const adminActions = [
        {
            title: "Gestione utenti 🧑‍💼👩‍💼",
            description: "Gestione degli utenti",
            to: "/agents"
        },
        {
            title: "Leads degli agenti 📝",
            description: "Visualizza i leads degli agenti",
            to: "/admin-leads"
        },
        {
            title: "Richieste Documentali📃",
            description: "Visualizza tutte le richieste documentali degli agenti",
            to: "/admin-cases",
            disabled: true
        }
    ];
    
    // Campaign manager actions
    const campaignManagerActions = [
        {
            title: "Leads Campagna 📝",
            description: "Visualizza tutti i leads della tua campagna",
            to: "/campaign-leads"
        }
    ];

    // Use different actions based on user role
    const actions = isAdmin 
        ? [...adminActions]
        : isCampaignManager
        ? [...campaignManagerActions]
        : [...agentActions];
    
    // console.log("StartScreen - User:", user);
    // console.log("StartScreen - Calculated isAdmin status:", isAdmin);
    // console.log("StartScreen - User role:", user?.role);
    // console.log("StartScreen - Is admin email fn output:", user && typeof isAdminEmail === 'function' ? isAdminEmail(user.email) : "N/A (user or isAdminEmail not available)");

    const name = user?.displayName?.split(' ')[0] || 'Agente';

    const hour = new Date().getHours()
    const { greeting, emoji } =
        greetings.find(s => 
            // Special handling for Buonasera which wraps around midnight
            (s.greeting === 'Buonasera' && (hour >= 17 || hour < 6)) || 
            // Normal time range handling for other greetings
            (s.greeting !== 'Buonasera' && hour >= s.fromHour && hour < s.toHour)
        ) || greetings[0]

    // Optional: Handle loading state for StartScreen to prevent rendering with incomplete data
    if (loading) {
        // You can return a loading spinner or null
        // For example: return <div className="flex justify-center items-center min-h-screen"><p>Loading...</p></div>;
        console.log("StartScreen: Auth state is loading...");
        return null; // Or a more sophisticated loading indicator
    }

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 text-center">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
                {greeting}{emoji}, {name}
            </h1>
            <p className="text-gray-600 max-w-md">
                Benvenuto! Usa il menu laterale per iniziare.
            </p>
        </div>
    )
}
