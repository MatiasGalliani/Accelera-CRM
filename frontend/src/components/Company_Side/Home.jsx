import React from "react";
import { useAuth } from "@/auth/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();

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

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 text-center">
      <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
        {greeting}
        {emoji}, {name}
      </h1>
      <p className="text-gray-600 max-w-md">
        Benvenuto nella home! Utilizza il menu laterale per navigare tra le
        funzionalità.
      </p>
    </div>
  );
} 