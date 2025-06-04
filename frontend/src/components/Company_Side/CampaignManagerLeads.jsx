import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LeadSourceTabs from '@/components/LeadSourceTabs';
import { API_ENDPOINTS, getApiUrl } from '@/config';
import { Icons } from "@/components/icons";
// Constants reused from other components
const STATUS_OPTIONS = [
  { value: 'new', label: 'Nuovo', color: 'bg-blue-400' },
  { value: 'contacted', label: 'Contattato', color: 'bg-yellow-400' },
  { value: 'qualified', label: 'Qualificato', color: 'bg-green-500' },
  { value: 'not_interested', label: 'Non interessato', color: 'bg-red-500' },
];

const LEAD_SOURCES = [
  { id: 'aimedici', name: 'AIMedici.it' },
  { id: 'aiquinto', name: 'AIQuinto.it' },
  { id: 'aifidi', name: 'AIFidi.it' },
];

const AIQUINTO_TABS = { DIPENDENTI: 'dipendenti', PENSIONATI: 'pensionati' };

// Fetch function for campaign manager
const fetchCampaignLeads = async (user, source) => {
  if (!user) throw new Error('Utente non autenticato');
  const { auth } = await import('@/auth/firebase');
  if (!auth.currentUser) throw new Error('Sessione scaduta, effettua nuovamente l\'accesso');
  const token = await auth.currentUser.getIdToken(true);

  const res = await fetch(getApiUrl(`${API_ENDPOINTS.LEADS}/campaign-leads?source=${source}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error('Non hai il permesso per visualizzare questi leads');
    if (res.status === 404) return { leads: [], total: 0 };
    throw new Error('Errore nel caricamento dei leads');
  }
  return res.json();
};

export default function CampaignManagerLeads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [currentSource, setCurrentSource] = useState(LEAD_SOURCES[0].id);
  const [aiquintoTab, setAiquintoTab] = useState(AIQUINTO_TABS.DIPENDENTI);

  const { data = { leads: [] }, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['campaign-leads', currentSource],
    queryFn: () => fetchCampaignLeads(user, currentSource),
    enabled: !!user,
    onError: (err) => {
      toast({
        title: 'Errore',
        description: err.message,
        variant: 'destructive',
        className: 'rounded-xl',
      });
    },
  });

  const filteredLeads = data.leads.filter((lead) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (lead.firstName || '').toLowerCase().includes(term) ||
      (lead.lastName || '').toLowerCase().includes(term) ||
      (lead.email || '').toLowerCase().includes(term) ||
      (lead.phone || '').toLowerCase().includes(term) ||
      (lead.commenti || '').toLowerCase().includes(term)
    );
  });

  const getStatusInfo = (val) => STATUS_OPTIONS.find((o) => o.value === val) || STATUS_OPTIONS[0];

  const formatDate = (d) => {
    const date = new Date(d);
    return isNaN(date) ? '-' : date.toLocaleDateString('it-IT');
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-6xl shadow-lg mt-16">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-3xl">Leads Campagna <Icons.megaphone className="inline pb-1 h-8 w-8" /></CardTitle>
              <CardDescription>Visualizza tutti i leads della tua campagna</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="rounded-xl">
              {isFetching ? <div className="animate-spin h-4 w-4 border-b-2 border-primary rounded-full"></div> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
          <LeadSourceTabs value={currentSource} onValueChange={setCurrentSource} allSources={LEAD_SOURCES} />
          {currentSource === 'aiquinto' && (
            <div className="mt-4">
              <Tabs value={aiquintoTab} onValueChange={setAiquintoTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value={AIQUINTO_TABS.DIPENDENTI}>Dipendenti</TabsTrigger>
                  <TabsTrigger value={AIQUINTO_TABS.PENSIONATI}>Pensionati</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-4 pt-0">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca..." className="pl-10 rounded-xl" />
          </div>
          {isLoading ? (
            <div className="text-center py-8">Caricamento...</div>
          ) : isError ? (
            <div className="text-center py-8 text-red-600">{error.message}</div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8">Nessun lead trovato</div>
          ) : (
            <div className="relative border rounded-lg">
              <div className="overflow-auto max-h-[calc(100vh-400px)]">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-white z-20">
                    <tr className="border-b [&>th]:whitespace-nowrap [&>th]:px-4 [&>th]:py-3 [&>th]:font-medium [&>th]:text-sm [&>th]:text-gray-600">
                      <th>Data</th>
                      <th>Agente</th>
                      <th>Nome</th>
                      <th>Cognome</th>
                      <th>Mail</th>
                      <th>Telefono</th>
                      {/* additional columns could be added similarly to AdminLeads based on source */}
                      <th>Stato</th>
                      <th>Commenti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => {
                      const statusInfo = getStatusInfo(lead.status);
                      return (
                        <tr key={lead.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{formatDate(lead.createdAt || lead.created_at)}</td>
                          <td className="py-3 px-4">{lead.agentName || '-'}</td>
                          <td className="py-3 px-4">{lead.firstName || '-'}</td>
                          <td className="py-3 px-4">{lead.lastName || '-'}</td>
                          <td className="py-3 px-4">{lead.email || '-'}</td>
                          <td className="py-3 px-4">{lead.phone || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 text-sm`}>
                              <span className={`w-3 h-3 rounded-full ${statusInfo.color}`}></span>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 min-w-[200px] whitespace-pre-wrap">{lead.commenti || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 