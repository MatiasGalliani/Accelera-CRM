import React from "react";
import { useAuth } from "@/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiUsers, FiFileText, FiMessageSquare, FiClipboard, FiBriefcase, FiCheckCircle } from "react-icons/fi";

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

  const cards = [
    {
      title: "Leads",
      description: "Gestisci e monitora i tuoi leads",
      icon: <FiUsers className="w-5 h-5" />,
      path: "/leads",
      size: "large",
      stats: "12 nuovi",
    },
    {
      title: "Documenti",
      description: "Accedi ai documenti privati e business",
      icon: <FiFileText className="w-5 h-5" />,
      path: "/documents",
      size: "small",
      stats: "5 da revisionare",
    },
    {
      title: "Chat",
      description: "Comunica con Eugenio AI",
      icon: <FiMessageSquare className="w-5 h-5" />,
      path: "/chat",
      size: "small",
      stats: "3 messaggi",
    },
    {
      title: "Casi",
      description: "Visualizza e gestisci i casi",
      icon: <FiClipboard className="w-5 h-5" />,
      path: "/cases",
      size: "medium",
      stats: "8 attivi",
    },
    {
      title: "Clienti",
      description: "Gestisci i dati dei clienti",
      icon: <FiBriefcase className="w-5 h-5" />,
      path: "/clients",
      size: "medium",
      stats: "24 totali",
    },
    {
      title: "Revisioni",
      description: "Controlla le revisioni in corso",
      icon: <FiCheckCircle className="w-5 h-5" />,
      path: "/review",
      size: "small",
      stats: "2 in attesa",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-6 text-center lg:text-left">
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
              onClick={() => navigate(card.path)}
              className={`col-span-12 ${
                card.size === "large" 
                  ? "md:col-span-8" 
                  : card.size === "medium" 
                  ? "md:col-span-6" 
                  : "md:col-span-4"
              } rounded-lg border bg-white p-4 hover:shadow-md transition-all duration-200 cursor-pointer`}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
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