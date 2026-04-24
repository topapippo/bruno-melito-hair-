import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ClockArrowUp, Plus, Trash2, MessageCircle, Calendar, Loader2, X, Phone } from 'lucide-react';
import { fmtDate } from '../lib/dateUtils';

export default function WaitlistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ client_name: '', client_phone: '', preferred_date: '', preferred_time: '', service_names: '', notes: '' });
  const navigate = useNavigate();

  useEffect(() => { fetchWaitlist(); }, []);

  const fetchWaitlist = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/waitlist`);
      setItems(res.data || []);
    } catch { toast.error('Errore nel caricamento'); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim()) { toast.error('Nome obbligatorio'); return; }
    setSaving(true);
    try {
      const res = await api.post(`${API}/waitlist`, form);
      setItems(prev => [...prev, res.data]);
      setForm({ client_name: '', client_phone: '', preferred_date: '', preferred_time: '', service_names: '', notes: '' });
      setShowForm(false);
      toast.success('Aggiunto alla lista d\'attesa!');
    } catch { toast.error('Errore nel salvataggio'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`${API}/waitlist/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Rimosso dalla lista');
    } catch { toast.error('Errore nella rimozione'); }
  };

  const handleBook = async (item) => {
    // Segna come prenotato e vai al planning
    await api.put(`${API}/waitlist/${item.id}`, { status: 'booked' });
    setItems(prev => prev.filter(i => i.id !== item.id));
    toast.success('Contrassegnato come prenotato!');
    navigate('/appointments');
  };

  const handleWhatsApp = async (item) => {
    if (!item.client_phone) { toast.error('Numero non disponibile'); return; }
    const services = item.service_names ? ` per ${item.service_names}` : '';
    const date = item.preferred_date ? ` il ${fmtDate(item.preferred_date)}` : '';
    const msg = `Ciao ${item.client_name}! 👋 Siamo lieti di informarti che si è liberato un posto${date}${services}. Vuoi fissare l'appuntamento? ✂️`;
    try {
      const res = await api.post(`${API}/whatsapp/send-direct`, { phone: item.client_phone, message: msg });
      if (res.data.sent) {
        toast.success('Messaggio inviato!');
      } else {
        window.open(res.data.url, '_blank');
        toast.success('WhatsApp aperto!');
      }
    } catch {
      let p = item.client_phone.replace(/[\s\-\+]/g, '');
      if (!p.startsWith('39')) p = '39' + p;
      window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <ClockArrowUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lista d'Attesa</h1>
              <p className="text-sm text-gray-500">{items.length} {items.length === 1 ? 'persona in attesa' : 'persone in attesa'}</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Aggiungi
          </Button>
        </div>

        {/* Form aggiungi */}
        {showForm && (
          <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Nuovo in lista d'attesa</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-gray-600">Nome Cliente *</Label>
                <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                  placeholder="es. Maria Rossi" className="mt-1 border-2" required />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-600">Telefono</Label>
                <Input value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))}
                  placeholder="es. 3401234567" type="tel" className="mt-1 border-2" />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-600">Data preferita</Label>
                <Input type="date" value={form.preferred_date} onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))}
                  className="mt-1 border-2" />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-600">Orario preferito</Label>
                <Input type="time" value={form.preferred_time} onChange={e => setForm(f => ({ ...f, preferred_time: e.target.value }))}
                  className="mt-1 border-2" step="900" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold text-gray-600">Servizi richiesti</Label>
                <Input value={form.service_names} onChange={e => setForm(f => ({ ...f, service_names: e.target.value }))}
                  placeholder="es. Taglio + Piega" className="mt-1 border-2" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold text-gray-600">Note</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Note aggiuntive..." className="mt-1 border-2" />
              </div>
              <div className="sm:col-span-2 flex gap-2 pt-1">
                <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Aggiungi</>}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
              </div>
            </form>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="text-center py-16 text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-white border-2 border-dashed border-gray-200">
            <ClockArrowUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nessuno in lista d'attesa</p>
            <p className="text-sm text-gray-300 mt-1">Aggiungi clienti che vogliono essere contattati appena si libera un posto</p>
            <Button onClick={() => setShowForm(true)} className="mt-4 bg-amber-500 hover:bg-amber-600 text-white">
              <Plus className="w-4 h-4 mr-2" /> Aggiungi il primo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4 hover:shadow-md transition-shadow">
                {/* Posizione */}
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-600 font-bold text-sm">{idx + 1}</span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-base">{item.client_name}</p>
                  {item.client_phone && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />{item.client_phone}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.preferred_date && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{fmtDate(item.preferred_date)}{item.preferred_time ? ` ${item.preferred_time}` : ''}
                      </span>
                    )}
                    {item.service_names && (
                      <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{item.service_names}</span>
                    )}
                    {item.notes && (
                      <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{item.notes}</span>
                    )}
                  </div>
                </div>
                {/* Azioni */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.client_phone && (
                    <button
                      onClick={() => handleWhatsApp(item)}
                      className="w-8 h-8 rounded-xl bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors shadow"
                      title="Invia WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4 text-white" />
                    </button>
                  )}
                  <button
                    onClick={() => handleBook(item)}
                    className="w-8 h-8 rounded-xl bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors shadow"
                    title="Prenota appuntamento"
                  >
                    <Calendar className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="w-8 h-8 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                    title="Rimuovi dalla lista"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
