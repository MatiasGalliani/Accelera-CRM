import { Button } from "@/components/ui/button"
import { useAuth } from "@/auth/AuthContext";
import logo from "@/assets/Accelera_logo.svg"
import { LogOut, Search } from "lucide-react"
import ActionCard from "./ActionCard"
import { Input } from "@/components/ui/input"
import { useState } from "react";

export default function StartScreen() {
    const [searchQuery, setSearchQuery] = useState("");
    const { user, logout, isAdmin } = useAuth();
    
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
            to: "/admin-cases"
        }
    ];
    
    // Use different actions based on user role
    const actions = isAdmin 
        ? [...adminActions]
        : [...agentActions];
    
    console.log("StartScreen - Admin status:", isAdmin);

    // Filter actions based on search query
    const filteredActions = actions.filter(action => 
        action.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const name = user?.displayName?.split(' ')[0] || 'Agente';

    const hour = new Date().getHours()
    const { greeting, emoji } =
        greetings.find(s => 
            // Special handling for Buonasera which wraps around midnight
            (s.greeting === 'Buonasera' && (hour >= 17 || hour < 6)) || 
            // Normal time range handling for other greetings
            (s.greeting !== 'Buonasera' && hour >= s.fromHour && hour < s.toHour)
        ) || greetings[0]

    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
            <div className="absolute top-4 left-4">
                <img src={logo} alt="Logo" className="w-32" />
            </div>

            <div className="absolute top-4 right-4">
                <Button
                    onClick={logout}
                    variant="ghost"
                    className="text-red-500 rounded-3xl hover:bg-transparent"
                >
                    <span className="sm:inline mr-2">Logout</span>
                    <LogOut className="h-6 w-6 sm:h-10 sm:w-10" />
                </Button>
            </div>

            <div className="mt-24 md:mt-20 text-center space-y-4 mb-8">
                <h1 className="text-3xl md:text-4xl font-semibold text-gray-900">
                    {greeting}{emoji}, {name}
                </h1>
                <div className="relative w-full max-w-md mx-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                            type="text" 
                            placeholder="Cosa vuoi fare oggi?"
                            className="pl-10 pr-4 py-2 w-96 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {filteredActions.length <= 2 ? (
                <div className="flex flex-wrap justify-center gap-4 w-full max-w-7xl">
                    {filteredActions.map((action, index) => (
                        <div key={index} className="w-full sm:w-[45%] max-w-sm">
                            <ActionCard
                                title={action.title}
                                description={action.description}
                                to={action.to}
                                disabled={action.disabled}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-7xl px-4">
                    {filteredActions.map((action, index) => (
                        <div key={index}>
                        <ActionCard
                            title={action.title}
                            description={action.description}
                            to={action.to}
                            disabled={action.disabled}
                        />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
