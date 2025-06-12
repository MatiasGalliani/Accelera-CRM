import { Icons } from "@/components/icons";
import { useState, useContext, useRef, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import AuthContext from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { auth } from "./firebase";
import { sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { getApiUrl } from "@/config";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import logo from "@/assets/Accelera_logo.svg";

export default function Login() {
    const { login, user } = useContext(AuthContext);
    const { toast } = useToast();
    const nav = useNavigate();
    const [searchParams] = useSearchParams();
    const oobCode = searchParams.get('oobCode');

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showResetForm, setShowResetForm] = useState(false);
    const [showVerificationForm, setShowVerificationForm] = useState(false);
    const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [isResetting, setIsResetting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const inputRefs = useRef([]);

    useEffect(() => {
        // Check if we have a reset code in the URL
        if (oobCode) {
            verifyResetCode(oobCode);
        }
    }, [oobCode]);

    const verifyResetCode = async (code) => {
        try {
            // Verify the reset code
            await verifyPasswordResetCode(auth, code);
            // If verification successful, show the new password form
            setShowNewPasswordForm(true);
            setShowResetForm(false);
            setShowVerificationForm(false);
        } catch (error) {
            console.error("Error verifying reset code:", error);
            setError("Il link di reset password non è valido o è scaduto");
            toast({
                title: "Errore",
                description: "Il link di reset password non è valido o è scaduto",
                variant: "destructive",
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

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

        try {
            const user = await login(email, password);
            if (user) {
                nav("/");
            }
            setIsLoading(false);
        } catch (err) {
            const errorMessages = {
                "auth/invalid-email": "Per favore inserisci un indirizzo email valido.",
                "auth/user-not-found": "Nessun account corrispondente trovato.",
                "auth/wrong-password": "Password errata. Riprova.",
                "auth/too-many-requests": "Troppe richieste. Riprova più tardi.",
                "auth/internal-error": "Errore interno. Riprova più tardi.",
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

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!resetEmail) {
            setError("Per favore inserisci la tua email");
            return;
        }

        setIsResetting(true);
        try {
            // Request password reset code from our backend
            const response = await fetch(getApiUrl('/api/password-reset/request-reset'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: resetEmail })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Errore nella richiesta del codice di reset');
            }

            setShowResetForm(false);
            setShowVerificationForm(true);
            toast({
                title: "Email inviata",
                description: "Ti abbiamo inviato un codice di verifica via email.",
            });
        } catch (error) {
            console.error("Error sending reset email:", error);
            setError(error.message || "Errore nell'invio dell'email di reset");
        } finally {
            setIsResetting(false);
        }
    };

    const handleCodeChange = async (index, value) => {
        if (value.length > 1) {
            value = value.slice(0, 1);
        }
        
        const newCode = [...verificationCode];
        newCode[index] = value;
        setVerificationCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }

        // Auto-verify when all digits are filled
        if (newCode.every(digit => digit !== "") && index === 5) {
            setIsVerifying(true);
            
            try {
                const enteredCode = newCode.join('');
                
                // Verify the code with our backend
                const response = await fetch(getApiUrl('/api/password-reset/verify-reset-code'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: resetEmail,
                        code: enteredCode
                    })
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Codice non valido');
                }

                // Add a small delay to show the spinner
                setTimeout(() => {
                    setShowVerificationForm(false);
                    setShowNewPasswordForm(true);
                    setIsVerifying(false);
                }, 1000);
            } catch (error) {
                setError(error.message);
                setIsVerifying(false);
            }
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handleNewPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            setError("Le password non coincidono");
            return;
        }

        if (newPassword.length < 6) {
            setError("La password deve essere di almeno 6 caratteri");
            return;
        }

        setIsResetting(true);
        try {
            // Update password through our backend
            const response = await fetch(getApiUrl('/api/password-reset/reset-password'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: resetEmail,
                    newPassword: newPassword
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Errore nell\'aggiornamento della password');
            }
            
            // Reset all states
            setShowNewPasswordForm(false);
            setShowResetForm(false);
            setVerificationCode(["", "", "", "", "", ""]);
            setNewPassword("");
            setConfirmNewPassword("");
            
            toast({
                title: "Password aggiornata",
                description: "La tua password è stata aggiornata con successo.",
            });

            // Redirect to login
            nav('/login');
        } catch (error) {
            console.error("Error resetting password:", error);
            setError(error.message);
        } finally {
            setIsResetting(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const switchToResetForm = () => {
        setError("");
        setShowResetForm(true);
        setShowVerificationForm(false);
        setShowNewPasswordForm(false);
    };

    const switchToLoginForm = () => {
        setError("");
        setShowResetForm(false);
        setShowVerificationForm(false);
        setShowNewPasswordForm(false);
        setResetEmail("");
        setVerificationCode(["", "", "", "", "", ""]);
        setNewPassword("");
        setConfirmNewPassword("");
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
            <Card className={`w-full max-w-md shadow-lg transition-all duration-300 ${showResetForm || showVerificationForm || showNewPasswordForm ? 'max-w-sm' : ''}`}>
                {!showResetForm && !showVerificationForm && !showNewPasswordForm ? (
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
                            <Button 
                                type="button"
                                variant="link" 
                                className="text-sm text-gray-600 hover:text-gray-900"
                                onClick={switchToResetForm}
                            >
                                Hai dimenticato la password?
                            </Button>
                        </CardFooter>
                    </form>
                ) : showVerificationForm ? (
                    <form onSubmit={(e) => e.preventDefault()}>
                        <CardHeader>
                            <img src={logo} alt="Logo" className="w-24 mx-auto" />
                            <CardTitle className="text-center text-xl">Verifica Codice</CardTitle>
                            <CardDescription className="text-center">
                                Inserisci il codice di 6 cifre ricevuto via email
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="flex justify-center space-x-2">
                                {verificationCode.map((digit, index) => (
                                    <Input
                                        key={index}
                                        ref={el => inputRefs.current[index] = el}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleCodeChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        disabled={isVerifying}
                                        className="w-12 h-12 text-center text-xl rounded-xl"
                                    />
                                ))}
                            </div>
                            {isVerifying && (
                                <div className="flex justify-center">
                                    <Icons.spinner className="h-6 w-6 animate-spin text-gray-500" />
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-4">
                            <Button 
                                type="button"
                                variant="link" 
                                className="text-sm text-gray-600 hover:text-gray-900"
                                onClick={switchToLoginForm}
                            >
                                Torna al login
                            </Button>
                        </CardFooter>
                    </form>
                ) : showNewPasswordForm ? (
                    <form onSubmit={handleNewPassword}>
                        <CardHeader>
                            <img src={logo} alt="Logo" className="w-24 mx-auto" />
                            <CardTitle className="text-center text-xl">Nuova Password</CardTitle>
                            <CardDescription className="text-center">
                                Inserisci la tua nuova password
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="newPassword">Nuova Password</Label>
                                <div className="relative">
                                    <Input
                                        id="newPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="•••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        disabled={isChangingPassword}
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

                            <div className="space-y-1">
                                <Label htmlFor="confirmNewPassword">Conferma Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmNewPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="•••••••••"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        disabled={isChangingPassword}
                                        className="rounded-xl pr-10"
                                    />
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-4">
                            <Button type="submit" disabled={isChangingPassword} className="w-full rounded-xl">
                                {isChangingPassword ? "Reimpostazione in corso…" : "Reimposta Password"}
                            </Button>
                            <Button 
                                type="button"
                                variant="link" 
                                className="text-sm text-gray-600 hover:text-gray-900"
                                onClick={switchToLoginForm}
                            >
                                Torna al login
                            </Button>
                        </CardFooter>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <CardHeader>
                            <img src={logo} alt="Logo" className="w-24 mx-auto" />
                            <CardTitle className="text-center text-xl">Recupero Password</CardTitle>
                            <CardDescription className="text-center">
                                Inserisci la tua email per ricevere le istruzioni
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="resetEmail">Indirizzo email</Label>
                                <Input
                                    id="resetEmail"
                                    type="email"
                                    placeholder="utente@creditplan.it"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    disabled={isResetting}
                                    className="rounded-xl"
                                />
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-4">
                            <Button type="submit" disabled={isResetting} className="w-full rounded-xl">
                                {isResetting ? "Invio in corso…" : "Invia istruzioni"}
                            </Button>
                            <Button 
                                type="button"
                                variant="link" 
                                className="text-sm text-gray-600 hover:text-gray-900"
                                onClick={switchToLoginForm}
                            >
                                Torna al login
                            </Button>
                        </CardFooter>
                    </form>
                )}
            </Card>
        </div>
    );
}
