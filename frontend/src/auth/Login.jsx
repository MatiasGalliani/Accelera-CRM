import { Icons } from "@/components/icons";
import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthContext from "./AuthContext";
import { useToast } from "@/hooks/use-toast";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import logo from "@/assets/Accelera_logo.svg";

export default function Login() {
    const { login, user } = useContext(AuthContext);
    const { toast } = useToast();
    const nav = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        // ─── VALIDAZIONI IN LOCALE ─────────────────────────────────────────────────
        if (!email) {
            setError("Per favore inserisci la tua email");
            setIsLoading(false);
            return;
        }
        if (!password) {
            setError("Per favore inserisci la password");
            setIsLoading(false);
            return;
        }
        // ─────────────────────────────────────────────────────────────────────────────
        try {
            const user = await login(email, password);
            if (user) {
                nav("/");
            }
            setIsLoading(false);
        } catch (err) {
            // Mappatura dei codici di errore di Firebase su stringhe in italiano
            const errorMessages = {
                "auth/invalid-email": "Per favore inserisci un indirizzo email valido.",
                "auth/user-not-found": "Nessun account corrispondente trovato.",
                "auth/wrong-password": "Password errata. Riprova.",
                "auth/too-many-requests": "Troppe richieste. Riprova più tardi.",
                "auth/internal-error": "Errore interno. Riprova più tardi.",
                // aggiungi altri codici se ti servono
            };
            const code = err.code || "";
            const message = errorMessages[code]
                || "Si è verificato un errore durante l'accesso. Riprova più tardi.";
            setError(message);
            toast({
                title: "Errore di accesso",
                description: message,
                variant: "destructive",
                className: "rounded-xl",
            });
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
            <Card className="w-full max-w-md shadow-lg">
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <img src={logo} alt="Logo" className="w-32 mx-auto" />
                        <CardTitle className="text-center text-2xl">Accedi</CardTitle>
                        <CardDescription className="text-center">
                            Inserisci le tue credenziali per continuare
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="space-y-1">
                            <Label htmlFor="email">Indirizzo email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="utente@creditplan.it"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                className="rounded-xl"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="•••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    className="rounded-xl pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    onClick={togglePasswordVisibility}
                                    tabIndex="-1"
                                >
                                    {showPassword ? (
                                        <Icons.eyeClosed size={20} />
                                    ) : (
                                        <Icons.eye size={20} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 text-center">
                                {error}
                            </p>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4">
                        <Button type="submit" disabled={isLoading} className="w-full rounded-xl">
                            {isLoading ? "Accesso in corso…" : "Accedi"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
