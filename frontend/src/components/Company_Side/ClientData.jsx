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
import { Plus, Trash2 } from "lucide-react"
import { useEffect } from "react"

export default function ClientData() {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isValid },
    } = useFormContext()
    const { fields, append, remove } = useFieldArray({
        control,
        name: "clients",
    })
    const navigate = useNavigate()

    const watchedClients = useWatch({
        control,
        name: "clients",
    })

    const onAddClient = () =>
        append({ firstName: "", lastName: "", email: "" })
    const onNext = () => navigate("/review")
    const onBack = () => navigate(-1)

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

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-lg shadow-lg">
                <form onSubmit={handleSubmit(onNext)}>
                    <CardHeader>
                        <CardTitle className="text-center text-3xl">
                            Richiedenti
                        </CardTitle>
                        <CardDescription className="text-center">
                            Inserisci i dati dei Richiedenti o aggiungine altri
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <Accordion type="multiple" className="space-y-2">
                            {fields.map((field, index) => {
                                const client = Array.isArray(watchedClients)
                                    ? watchedClients[index]
                                    : {};

                                const hasName = client?.firstName || client?.lastName;
                                const fullName = hasName
                                    ? [client.firstName, client.lastName].filter(Boolean).join(" ")
                                    : `Cliente ${index + 1}`;

                                return (
                                    <AccordionItem key={field.id} value={`client-${field.id}`}>
                                        <div className="flex items-center justify-between px-4 py-2">
                                            <AccordionTrigger>
                                                {fullName}
                                            </AccordionTrigger>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                aria-label={`Rimuovere Cliente ${index + 1}`}
                                                className="rounded-xl"
                                            >
                                                <Trash2 className="h-5 w-5 text-red-500 rounded" />
                                            </Button>
                                        </div>
                                        <AccordionContent className="space-y-4 p-2">
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input
                                                        type="text"
                                                        placeholder="Nome"
                                                        className="rounded-lg"
                                                        {...register(`clients.${index}.firstName`, {
                                                            required: "Nome obbligatorio",
                                                        })}
                                                    />
                                                    <Input
                                                        type="text"
                                                        placeholder="Cognome"
                                                        className="rounded-lg"
                                                        {...register(`clients.${index}.lastName`, {
                                                            required: "Cognome obbligatorio",
                                                        })}
                                                    />
                                                </div>
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
                                            </div>
                                            {errors.clients?.[index]?.firstName && (
                                                <p className="text-red-500 text-sm">
                                                    {errors.clients[index].firstName.message}
                                                </p>
                                            )}
                                            {errors.clients?.[index]?.lastName && (
                                                <p className="text-red-500 text-sm">
                                                    {errors.clients[index].lastName.message}
                                                </p>
                                            )}
                                            {errors.clients?.[index]?.email && (
                                                <p className="text-red-500 text-sm">
                                                    {errors.clients[index].email.message}
                                                </p>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </CardContent>

                    <CardFooter className="flex justify-between">
                        <Button
                            variant="secondary"
                            onClick={onBack}
                            className="rounded-xl"
                        >
                            Indietro
                        </Button>
                        <div className="flex space-x-2">
                            <Button variant="outline" onClick={onAddClient} className="rounded-xl">
                                <Plus className="h-5 w-5" />
                            </Button>
                            <Button
                                type="submit"
                                disabled={!isValid}
                                className="rounded-xl"
                            >
                                Avanti
                            </Button>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}