// ClientType.jsx
import { useEffect } from "react"
import { useFormContext } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

export default function ClientType() {
  const navigate = useNavigate()
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isValid }
  } = useFormContext()

  // Registra "type" con validación
  useEffect(() => {
    register("type", { required: "Seleziona un tipo di richiedente" })
  }, [register])

  const tipo = watch("type")

  const onNext = () => {
    const path = tipo === "privato"
      ? "/products-private"
      : "/products-business"
    navigate(path)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-xs shadow-lg">
        <form onSubmit={handleSubmit(onNext)}>
          <CardHeader>
            <CardTitle className="text-center text-3xl">
              Dettagli del richiedente
            </CardTitle>
            <CardDescription className="text-center">
              Seleziona il tipo di richiedente per procedere
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center space-y-4">
            <div className="w-72">
              <Label htmlFor="tipo">Tipo di richiedente</Label>
              <Select
                value={tipo}
                onValueChange={(val) =>
                  setValue("type", val, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger
                  id="tipo"
                  className="mt-2 rounded-xl bg-gray-200 dark:bg-gray-700"
                >
                  <SelectValue placeholder="Seleziona il tipo di richiedente" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-gray-200 dark:bg-gray-700">
                  <SelectItem value="privato" className="rounded-xl">
                    Privato
                  </SelectItem>
                  <SelectItem value="azienda" className="rounded-xl">
                    Azienda
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.type.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              className="rounded-xl"
            >
              Indietro
            </Button>
            <Button
              type="submit"
              disabled={!isValid}
              className="rounded-xl w-24"
            >
              Avanti
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
