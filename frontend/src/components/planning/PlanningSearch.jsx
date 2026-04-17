import { useState } from 'react';
import api from '../../lib/api';
import { fmtDate } from '../../lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PlanningSearch({ onHighlightClient, highlightedClientId, onClearHighlight }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ clients: [], appointments: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults({ clients: [], appointments: [] });
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`${API}/clients/search/appointments?query=${encodeURIComponent(query)}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const highlightClient = (clientId) => {
    onHighlightClient(clientId);
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults({ clients: [], appointments: [] });
  };

  return (
    <>
      <div className="relative">
        <div className="flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#C8617A]" />
            <Input
              placeholder="Cerca cliente..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              className="pl-9 w-48 md:w-56 bg-white border-2 border-[#C8617A]/50 focus:border-[#C8617A] font-medium"
              data-testid="search-client-input"
            />
            {searchQuery && (
              <Button
                variant="ghost" size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults({ clients: [], appointments: [] });
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        {searchOpen && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#F0E6DC] rounded-xl shadow-lg z-50 max-h-80 overflow-auto">
            {searching ? (
              <div className="p-4 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#C8617A]" />
              </div>
            ) : searchResults.clients.length === 0 ? (
              <div className="p-4 text-center text-[#7C5C4A] text-sm">
                Nessun cliente trovato
              </div>
            ) : (
              <div className="py-2">
                {searchResults.clients.map((client) => {
                  const clientApts = searchResults.appointments.filter(a => a.client_id === client.id);
                  return (
                    <div key={client.id} className="border-b border-[#F0E6DC]/30 last:border-0">
                      <button
                        className="w-full px-4 py-2 text-left hover:bg-[#FAF7F2] flex items-center justify-between"
                        onClick={() => highlightClient(client.id)}
                        data-testid={`search-result-${client.id}`}
                      >
                        <div>
                          <p className="font-medium text-[#2D1B14]">{client.name}</p>
                          <p className="text-xs text-[#7C5C4A]">{client.phone}</p>
                        </div>
                        <span className="text-xs bg-[#C8617A]/10 text-[#C8617A] px-2 py-1 rounded">
                          {clientApts.length} app.
                        </span>
                      </button>
                      {clientApts.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          className="px-4 py-1 pl-8 text-xs text-[#7C5C4A] bg-[#FAF7F2]/50"
                        >
                          {fmtDate(apt.date)} {apt.time} - {apt.services?.map(s => s.name).join(', ')}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      {highlightedClientId && (
        <div className="flex items-center gap-2 bg-[#C8617A]/10 px-3 py-1.5 rounded-xl">
          <span className="text-sm text-[#C8617A] font-medium">Filtro attivo</span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClearHighlight}>
            <X className="w-3 h-3 text-[#C8617A]" />
          </Button>
        </div>
      )}
    </>
  );
}
