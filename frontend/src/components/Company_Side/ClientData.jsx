// ClientData.jsx
import { useFormContext, useFieldArray, useWatch } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card"
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useEffect, useState } from "react"

export default function ClientData() {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isValid, isSubmitting },
    } = useFormContext()
    const { fields, append, remove } = useFieldArray({
        control,
        name: "clients",
    })
    const navigate = useNavigate()
    const [clientToRemove, setClientToRemove] = useState(null)

    const watchedClients = useWatch({
        control,
        name: "clients",
    })

    const onAddClient = () =>
        append({ firstName: "", lastName: "", email: "" })
    const onNext = () => navigate("/review")
    const onBack = () => navigate(-1)

    const handleRemoveClick = (index) => {
        setClientToRemove(index)
    }

    const confirmRemove = () => {
        if (clientToRemove !== null) {
            remove(clientToRemove)
            setClientToRemove(null)
        }
    }

    // Add a client automatically when component mounts
    useEffect(() => {
        if (fields.length === 0) {
            onAddClient()
        } else if (fields.length > 1) {
            // If there are more than one clients, remove all except the first one
            while (fields.length > 1) {
                remove(fields.length - 1)
            }
        }
    }, [])

    const getClientValidationStatus = (index) => {
        const client = watchedClients[index]
        const hasErrors = errors.clients?.[index]
        const isComplete = client?.firstName && client?.lastName && client?.email && !hasErrors

        if (hasErrors) return { icon: <AlertCircle className="h-4 w-4 text-red-500" />, text: "Incompleto" }
        if (isComplete) return { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, text: "Completo" }
        return { icon: null, text: "In corso" }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-2xl shadow-lg">
                <form onSubmit={handleSubmit(onNext)}>
                    <CardHeader>
                        <CardTitle className="text-center text-3xl">
                            Richiedenti
                        </CardTitle>
                        <CardDescription className="text-center">
                            Inserisci i dati dei Richiedenti o aggiungine altri
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <Accordion type="multiple" className="space-y-4">
                            {fields.map((field, index) => {
                                const client = Array.isArray(watchedClients)
                                    ? watchedClients[index]
                                    : {};

                                const hasName = client?.firstName || client?.lastName;
                                const fullName = hasName
                                    ? [client.firstName, client.lastName].filter(Boolean).join(" ")
                                    : `Cliente ${index + 1}`;

                                const validationStatus = getClientValidationStatus(index);

                                return (
                                    <AccordionItem key={field.id} value={`client-${field.id}`}>
                                        <div className="flex items-center justify-between px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <AccordionTrigger className="hover:no-underline">
                                                    <div className="flex items-center gap-2">
                                                        {validationStatus.icon}
                                                        <span>{fullName}</span>
                                                        <span className="text-sm text-gray-500">
                                                            ({validationStatus.text})
                                                        </span>
                                                    </div>
                                                </AccordionTrigger>
                                            </div>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveClick(index)}
                                                            aria-label={`Rimuovere Cliente ${index + 1}`}
                                                            className="rounded-xl"
                                                        >
                                                            <Trash2 className="h-5 w-5 text-red-500 rounded" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Rimuovi cliente</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <AccordionContent className="space-y-4 p-4">
                                            <div className="grid grid-cols-1 gap-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">
                                                            Nome <span className="text-red-500">*</span>
                                                        </label>
                                                        <Input
                                                            type="text"
                                                            placeholder="Nome"
                                                            className="rounded-lg"
                                                            {...register(`clients.${index}.firstName`, {
                                                                required: "Nome obbligatorio",
                                                            })}
                                                        />
                                                        {errors.clients?.[index]?.firstName && (
                                                            <p className="text-red-500 text-sm">
                                                                {errors.clients[index].firstName.message}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">
                                                            Cognome <span className="text-red-500">*</span>
                                                        </label>
                                                        <Input
                                                            type="text"
                                                            placeholder="Cognome"
                                                            className="rounded-lg"
                                                            {...register(`clients.${index}.lastName`, {
                                                                required: "Cognome obbligatorio",
                                                            })}
                                                        />
                                                        {errors.clients?.[index]?.lastName && (
                                                            <p className="text-red-500 text-sm">
                                                                {errors.clients[index].lastName.message}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">
                                                        Email <span className="text-red-500">*</span>
                                                    </label>
                                                    <Input
                                                        type="email"
                                                        placeholder="Email"
                                                        className="rounded-lg"
                                                        {...register(`clients.${index}.email`, {
                                                            required: "Email obbligatorio",
                                                            pattern: {
                                                                value: /^\S+@\S+\.\S+$/,
                                                                message: "Email non valida",
                                                            },
                                                        })}
                                                    />
                                                    {errors.clients?.[index]?.email && (
                                                        <p className="text-red-500 text-sm">
                                                            {errors.clients[index].email.message}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </CardContent>

                    <CardFooter className="flex justify-between p-6">
                        <Button
                            variant="secondary"
                            onClick={onBack}
                            className="rounded-xl"
                        >
                            Indietro
                        </Button>
                        <div className="flex space-x-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" onClick={onAddClient} className="rounded-xl">
                                            <Plus className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Aggiungi cliente</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <Button
                                type="submit"
                                disabled={!isValid || isSubmitting}
                                className="rounded-xl"
                            >
                                {isSubmitting ? "Caricamento..." : "Avanti"}
                            </Button>
                        </div>
                    </CardFooter>
                </form>
            </Card>

            <AlertDialog open={clientToRemove !== null} onOpenChange={() => setClientToRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rimuovere cliente?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Sei sicuro di voler rimuovere questo cliente? Questa azione non può essere annullata.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemove} className="bg-red-500 hover:bg-red-600">
                            Rimuovi
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}