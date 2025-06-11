import React from 'react';
import { Button } from "@/components/ui/button";
import { Mail, TrendingUp, Users, Target } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Separator } from "@/components/ui/separator";

const EmailMarketing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Email Marketing</h1>
            <p className="text-lg text-muted-foreground">
              Crea campagne personalizzate, analizza i risultati e gestisci i tuoi contatti in modo efficiente.
            </p>
          </div>

          <Separator className="my-8" />

          {/* Main Action Button */}
          <div className="flex justify-center">
            <Button 
              size="lg" 
              className="h-14 px-8 text-lg rounded-full mr-3"
              onClick={() => navigate('/email-marketing/create')}
            >
              <Mail className="mr-2 h-5 w-5" />
              Crea una nuova campagna
            </Button>
            <Button 
              size="lg" 
              className="h-14 px-8 text-lg rounded-full ml-3"
              onClick={() => navigate('/email-marketing/automatic-mails')}
            >
              <Mail className="mr-2 h-5 w-5" />
              Mail automatiche ai lead
            </Button>
          </div>

          <Separator className="my-8" />

          {/* Benefits Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3">
              <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">ROI Elevato</h3>
              <p className="text-muted-foreground">
                Per ogni euro investito, l'email marketing genera in media €42 di ritorno
              </p>
            </div>
            <div className="space-y-3">
              <Users className="h-8 w-8 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">Raggiungi Tutti</h3>
              <p className="text-muted-foreground">
                Oltre 4 miliardi di utenti attivi controllano la loro email quotidianamente
              </p>
            </div>
            <div className="space-y-3">
              <Target className="h-8 w-8 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">Personalizzazione</h3>
              <p className="text-muted-foreground">
                Campagne mirate che aumentano il tasso di conversione fino al 50%
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Inizia oggi a creare campagne email efficaci. La nostra piattaforma ti offre tutti gli strumenti necessari per raggiungere i tuoi obiettivi di marketing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailMarketing; 