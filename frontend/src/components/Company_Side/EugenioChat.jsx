import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send } from "lucide-react"
import eugenioAvatar from "@/assets/eugenio_avatar.png"

export default function EugenioChat() {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: "Ciao! Sono Eugenio, il tuo assistente AI. Come posso aiutarti oggi?",
        },
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!input.trim()) return

        // Add user message
        const userMessage = { role: "user", content: input }
        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            // First request to send the message
            const response = await fetch("https://apppy-production-bb6d.up.railway.app/webhook", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: input
                }),
            })

            if (!response.ok) {
                throw new Error("Network response was not ok")
            }

            // Wait for 2 seconds to allow the AI to generate a response
            await new Promise(resolve => setTimeout(resolve, 2000))

            // Second request to get the AI response
            const aiResponse = await fetch("https://apppy-production-bb6d.up.railway.app/get_response", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            if (!aiResponse.ok) {
                throw new Error("Failed to get AI response")
            }

            const data = await aiResponse.json()
            
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: data.response || "Mi dispiace, non ho ricevuto una risposta valida.",
                },
            ])
        } catch (error) {
            console.error("Error:", error)
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Mi dispiace, si è verificato un errore nella comunicazione. Riprova più tardi.",
                },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full h-[calc(100vh-2rem)] flex flex-col bg-background">
            {/* Header */}
            <div className="px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                    <img src={eugenioAvatar} alt="Eugenio" className="h-10 ml-10 md:ml-10 lg:ml-0 xl:ml-0" />
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-4">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${
                                message.role === "user" ? "justify-end" : "justify-start"
                            }`}
                        >
                            <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                    message.role === "user"
                                        ? "bg-white text-primary-foreground border-gray-200 border rounded-xl"
                                        : "bg-muted"
                                }`}
                            >
                                {message.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-muted rounded-lg p-3">
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSubmit} className="px-6 py-4 border-t">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Scrivi qui..."
                        className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={isLoading}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </form>
        </div>
    )
}