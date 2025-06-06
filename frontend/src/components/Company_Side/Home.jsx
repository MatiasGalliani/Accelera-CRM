import React from "react";
import { useAuth } from "@/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiUsers, FiFileText, FiMessageSquare, FiClipboard, FiBriefcase, FiCheckCircle, FiSettings, FiUserPlus, FiBarChart2 } from "react-icons/fi";

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const greetings = [
    { greeting: "Buongiorno", emoji: "☀️", fromHour: 6, toHour: 12 },
    { greeting: "Buon pomeriggio", emoji: "🌤️", fromHour: 12, toHour: 17 },
    { greeting: "Buonasera", emoji: "🌙", fromHour: 17, toHour: 6 },
  ];

  if (loading) return null;

  const name = user?.displayName?.split(" ")[0] || "Agente";
  const hour = new Date().getHours();
  const { greeting, emoji } =
    greetings.find((g) =>
      g.greeting === "Buonasera"
        ? hour >= 17 || hour < 6
        : hour >= g.fromHour && hour < g.toHour
    ) || greetings[0];

  // Admin cards
  const adminCards = [
    {
      title: "Utenti",
      description: "Gestisci gli utenti del sistema",
      icon: <FiUserPlus className="w-5 h-5" />,
      path: "/users",
      size: "large",
      stats: "Gestisci permessi",
      disabled: false
    },
    {
      title: "Statistiche",
      description: "Visualizza le statistiche del sistema",
      icon: <FiBarChart2 className="w-5 h-5" />,
      path: "/stats",
      size: "large",
      stats: "Report completi",
      disabled: true
    },
    {
      title: "Impostazioni",
      description: "Configura il sistema",
      icon: <FiSettings className="w-5 h-5" />,
      path: "/settings",
      size: "medium",
      stats: "Configurazione",
      disabled: true
    },
    {
      title: "Leads",
      description: "Gestisci e monitora i leads degli agenti",
      icon: <FiUsers className="w-5 h-5" />,
      path: "/admin-leads",
      size: "large",
      stats: "12 nuovi",
      disabled: false
    },
    {
      title: "Documenti",
      description: "Accedi ai documenti privati e business",
      icon: <FiFileText className="w-5 h-5" />,
      path: "/documents",
      size: "small",
      stats: "5 da revisionare",
      disabled: true
    },
    {
      title: "Casi",
      description: "Visualizza e gestisci i casi",
      icon: <FiClipboard className="w-5 h-5" />,
      path: "/cases",
      size: "large",
      stats: "8 attivi",
      disabled: true
    },
  ];

  // Agent cards
  const agentCards = [
    {
      title: "Leads",
      description: "Gestisci e monitora i tuoi leads",
      icon: <FiUsers className="w-5 h-5" />,
      path: "/my-leads",
      size: "large",
      stats: "12 nuovi",
      disabled: false
    },
    {
      title: "Richiesta Documenti",
      description: "Richiedi documenti privati e business",
      icon: <FiFileText className="w-5 h-5" />,
      path: "/request-documents",
      size: "small",
      stats: "5 da revisionare",
      disabled: true
    },
    {
      title: "Casi",
      description: "Visualizza e gestisci i casi",
      icon: <FiClipboard className="w-5 h-5" />,
      path: "/cases",
      size: "large",
      stats: "8 attivi",
      disabled: true
    },
  ];

  // Select cards based on user role
  const cards = user?.role === 'admin' ? adminCards : agentCards;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-6 xl:mt-8 lg:mt-8 text-center lg:text-left">
        <h1 className="text-3xl font-semibold text-foreground">
          {greeting}
          {emoji}, {name}
        </h1>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-12 gap-4">
          {cards.map((card, index) => (
            <div
              key={index}
              onClick={() => !card.disabled && navigate(card.path)}
              className={`col-span-12 ${
                card.size === "large" 
                  ? "md:col-span-6" 
                  : card.size === "medium" 
                  ? "md:col-span-4" 
                  : "md:col-span-3"
              } rounded-lg border bg-white p-4 transition-all duration-200 ${
                card.disabled 
                  ? "opacity-50 cursor-not-allowed" 
                  : "hover:shadow-md cursor-pointer"
              }`}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${card.disabled ? "bg-gray-100" : "bg-muted"}`}>
                    {card.icon}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground">{card.stats}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 