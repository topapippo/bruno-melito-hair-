import { useState, useEffect } from 'react';
import api from '../lib/api';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, Save, Loader2, Clock, Building2, User, Lock, Palette, Type, RotateCcw, Plus, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ADMIN_FONTS = [
  'Cormorant Garamond', 'Playfair Display', 'Montserrat', 'Poppins', 'Inter',
  'Lora', 'Raleway', 'Roboto', 'Open Sans', 'DM Sans', 'Nunito'
];

const ADMIN_PRESETS = [
  { name: 'Classico Caldo', primary: '#B45309', sidebar_bg: '#FFF8F0', sidebar_text: '#431407', accent: '#D97706', content_bg: '#FFFBF5', content_text: '#431407' },
  { name: 'Blu Elegante', primary: '#2563EB', sidebar_bg: '#F0F4FF', sidebar_text: '#0F172A', accent: '#F59E0B', content_bg: '#F8FAFC', content_text: '#0F172A' },
  { name: 'Verde Natura', primary: '#059669', sidebar_bg: '#F0FDF4', sidebar_text: '#14532D', accent: '#A3E635', content_bg: '#F7FDF9', content_text: '#14532D' },
  { name: 'Viola Lusso', primary: '#7C3AED', sidebar_bg: '#FAF5FF', sidebar_text: '#1E1B4B', accent: '#F472B6', content_bg: '#FDFAFF', content_text: '#1E1B4B' },
  { name: 'Rosso Fuoco', primary: '#DC2626', sidebar_bg: '#FFF5F5', sidebar_text: '#450A0A', accent: '#FACC15', content_bg: '#FFFAFA', content_text: '#450A0A' },
  { name: 'Teal Fresco', primary: '#0D9488', sidebar_bg: '#F0FDFA', sidebar_text: '#134E4A', accent: '#FB923C', content_bg: '#F7FFFE', content_text: '#134E4A' },
  { name: 'Grigio Moderno', primary: '#475569', sidebar_bg: '#F1F5F9', sidebar_text: '#0F172A', accent: '#0EA5E9', content_bg: '#F8FAFC', content_text: '#0F172A' },
  { name: 'Scuro', primary: '#3B82F6', sidebar_bg: '#1E1B14', sidebar_text: '#FAF7F2', accent: '#FACC15', content_bg: '#1C1917', content_text: '#F5F5F4' },
];

const DAYS = [
  { value: 'lunedì', label: 'Lunedì' },
  { value: 'martedì', label: 'Martedì' },
  { value: 'mercoledì', label: 'Mercoledì' },
  { value: 'giovedì', label: 'Giovedì' },
  { value: 'venerdì', label: 'Venerdì' },
  { value: 'sabato', label: 'Sabato' },
  { value: 'domenica', label: 'Domenica' },
];

export default function SettingsPage() {
  const { updateUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [adminTheme, setAdminTheme] = useState({
    primary: '#C8617A', sidebar_bg: '#FAF7F2', sidebar_text: '#2D1B14',
    accent: '#D4A847', font_display: 'Cormorant Garamond', font_body: 'Poppins',
    content_bg: '#F8F5F0', content_text: '#2D1B14'
  });
  const [savingTheme, setSavingTheme] = useState(false);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [newBlock, setNewBlock] = useState({ type: 'recurring', day_of_week: 'lunedì', date: '', start_time: '13:00', end_time: '14:00', reason: '' });
  const [savingBlock, setSavingBlock] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchBlockedSlots();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get(`${API}/settings`);
      setSettings(res.data);
      if (res.data.admin_theme) setAdminTheme(res.data.admin_theme);
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Errore nel caricamento delle impostazioni');
    } finally {
      setLoading(false);
    }
  };

  const applyAdminTheme = (theme) => {
    localStorage.setItem('adminTheme', JSON.stringify(theme));
  };

  const saveAdminTheme = async () => {
    setSavingTheme(true);
    try {
      await api.put(`${API}/settings/admin-theme`, { admin_theme: adminTheme });
      applyAdminTheme(adminTheme);
      toast.success('Tema gestionale salvato!');
    } catch { toast.error('Errore nel salvataggio tema'); }
    finally { setSavingTheme(false); }
  };

  const applyPreset = (preset) => {
    const newTheme = { ...adminTheme, ...preset };
    delete newTheme.name;
    setAdminTheme(newTheme);
    applyAdminTheme(newTheme);
    toast.success(`Preset "${preset.name}" applicato — salva per confermare`);
  };

  const fetchBlockedSlots = async () => {
    try {
      const res = await api.get(`${API}/blocked-slots`);
      setBlockedSlots(res.data || []);
    } catch {}
  };

  const addBlockedSlot = async () => {
    setSavingBlock(true);
    try {
      await api.post(`${API}/blocked-slots`, newBlock);
      toast.success('Blocco orario aggiunto!');
      fetchBlockedSlots();
      setNewBlock({ type: 'recurring', day_of_week: 'lunedì', date: '', start_time: '13:00', end_time: '14:00', reason: '' });
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
    finally { setSavingBlock(false); }
  };

  const deleteBlockedSlot = async (id) => {
    try {
      await api.delete(`${API}/blocked-slots/${id}`);
      toast.success('Blocco rimosso!');
      fetchBlockedSlots();
    } catch { toast.error('Errore nella rimozione'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`${API}/settings`, {
        salon_name: settings.salon_name,
        name: settings.name,
        opening_time: settings.opening_time,
        closing_time: settings.closing_time,
        working_days: settings.working_days,
        google_review_link: settings.google_review_link
      });
      updateUser({ name: settings.name, salon_name: settings.salon_name });
      toast.success('Impostazioni salvate!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day) => {
    setSettings(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day]
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('Le nuove password non coincidono');
      return;
    }
    if (pwForm.new_password.length < 6) {
      toast.error('La password deve avere almeno 6 caratteri');
      return;
    }
    setChangingPw(true);
    try {
      await api.put(`${API}/auth/change-password`, {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password
      });
      toast.success('Password cambiata con successo!');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nel cambio password');
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="settings-page">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-medium text-[#2D1B14]">Impostazioni</h1>
          <p className="text-[#7C5C4A] mt-1 ">Gestisci le impostazioni del tuo salone</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Settings */}
          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-xl text-[#2D1B14] flex items-center gap-2">
                <User className="w-5 h-5 text-[#C8617A]" />
                Profilo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Il tuo nome</Label>
                  <Input
                    value={settings.name || ''}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    data-testid="settings-name-input"
                    className="bg-[#FAF7F2] border-transparent focus:border-[#C8617A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={settings.email || ''}
                    disabled
                    className="bg-[#FAF7F2] border-transparent opacity-60"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Salon Settings */}
          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-xl text-[#2D1B14] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#C8617A]" />
                Salone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome del Salone</Label>
                <Input
                  value={settings.salon_name || ''}
                  onChange={(e) => setSettings({ ...settings, salon_name: e.target.value })}
                  data-testid="settings-salon-name-input"
                  className="bg-[#FAF7F2] border-transparent focus:border-[#C8617A]"
                />
              </div>
              <div className="space-y-2">
                <Label>Link Recensioni Google</Label>
                <Input
                  value={settings.google_review_link || ''}
                  onChange={(e) => setSettings({ ...settings, google_review_link: e.target.value })}
                  placeholder="https://search.google.com/local/writereview?placeid=..."
                  data-testid="settings-google-review-input"
                  className="bg-[#FAF7F2] border-transparent focus:border-[#C8617A]"
                />
                <p className="text-xs text-[#9C7060]">Cerca il tuo salone su Google Maps → Condividi → Copia link recensione</p>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-xl text-[#2D1B14] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#C8617A]" />
                Orari di Apertura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Apertura</Label>
                  <Input
                    type="time"
                    value={settings.opening_time || '09:00'}
                    onChange={(e) => setSettings({ ...settings, opening_time: e.target.value })}
                    data-testid="settings-opening-time-input"
                    className="bg-[#FAF7F2] border-transparent focus:border-[#C8617A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chiusura</Label>
                  <Input
                    type="time"
                    value={settings.closing_time || '19:00'}
                    onChange={(e) => setSettings({ ...settings, closing_time: e.target.value })}
                    data-testid="settings-closing-time-input"
                    className="bg-[#FAF7F2] border-transparent focus:border-[#C8617A]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Giorni Lavorativi</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {DAYS.map((day) => {
                    const isActive = settings.working_days?.includes(day.value);
                    return (
                      <div
                        key={day.value}
                        className={`flex items-center space-x-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[#C8617A]/10 border-[#C8617A]'
                            : 'bg-[#FAF7F2] border-transparent hover:border-[#F0E6DC]'
                        }`}
                        onClick={() => toggleDay(day.value)}
                        data-testid={`day-toggle-${day.value}`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isActive ? 'bg-[#C8617A] border-[#C8617A]' : 'border-gray-300'}`}>
                          {isActive && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-sm ${
                          isActive ? 'text-[#C8617A] font-medium' : 'text-[#2D1B14]'
                        }`}>
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blocked Slots */}
          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-xl text-[#2D1B14] flex items-center gap-2">
                <Lock className="w-5 h-5 text-red-500" />
                Blocco Orari
              </CardTitle>
              <p className="text-sm text-[#7C5C4A] mt-1">Blocca fasce orarie specifiche o ricorrenti per impedire le prenotazioni</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new block */}
              <div className="p-4 border-2 border-dashed border-red-200 rounded-xl bg-red-50/50 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Tipo</Label>
                    <select value={newBlock.type} onChange={e => setNewBlock({...newBlock, type: e.target.value})}
                      className="w-full p-2 border rounded-lg text-sm" data-testid="block-type-select">
                      <option value="recurring">Ricorrente (ogni settimana)</option>
                      <option value="one-time">Singolo (una data)</option>
                    </select>
                  </div>
                  {newBlock.type === 'recurring' ? (
                    <div>
                      <Label className="text-xs font-semibold">Giorno</Label>
                      <select value={newBlock.day_of_week} onChange={e => setNewBlock({...newBlock, day_of_week: e.target.value})}
                        className="w-full p-2 border rounded-lg text-sm" data-testid="block-day-select">
                        {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-xs font-semibold">Data</Label>
                      <Input type="date" value={newBlock.date} onChange={e => setNewBlock({...newBlock, date: e.target.value})}
                        className="text-sm" data-testid="block-date-input" />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs font-semibold">Da</Label>
                    <Input type="time" value={newBlock.start_time} onChange={e => setNewBlock({...newBlock, start_time: e.target.value})}
                      className="text-sm" data-testid="block-start-time" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">A</Label>
                    <Input type="time" value={newBlock.end_time} onChange={e => setNewBlock({...newBlock, end_time: e.target.value})}
                      className="text-sm" data-testid="block-end-time" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Input placeholder="Motivo (opzionale, es. Pausa pranzo)" value={newBlock.reason}
                    onChange={e => setNewBlock({...newBlock, reason: e.target.value})}
                    className="flex-1 text-sm" data-testid="block-reason-input" />
                  <Button onClick={addBlockedSlot} disabled={savingBlock}
                    className="bg-red-500 hover:bg-red-600 text-white shrink-0" data-testid="add-block-btn">
                    {savingBlock ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Blocca</>}
                  </Button>
                </div>
              </div>

              {/* Existing blocks */}
              {blockedSlots.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">Nessun orario bloccato</p>
              ) : (
                <div className="space-y-2" data-testid="blocked-slots-list">
                  {blockedSlots.map(slot => (
                    <div key={slot.id} className="flex items-center justify-between p-3 rounded-xl border bg-white hover:bg-red-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${slot.type === 'recurring' ? 'bg-orange-400' : 'bg-red-400'}`} />
                        <div>
                          <p className="text-sm font-bold text-[#2D1B14]">
                            {slot.type === 'recurring'
                              ? <span className="capitalize">{slot.day_of_week}</span>
                              : slot.date}
                            {' '}
                            <span className="text-[#C8617A]">{slot.start_time} - {slot.end_time}</span>
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${slot.type === 'recurring' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                              {slot.type === 'recurring' ? 'Ogni settimana' : 'Una tantum'}
                            </span>
                            {slot.reason && <span className="text-xs text-[#7C5C4A]">{slot.reason}</span>}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteBlockedSlot(slot.id)}
                        className="text-red-500 hover:bg-red-100 h-8 w-8 p-0" data-testid={`delete-block-${slot.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              data-testid="save-settings-btn"
              className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white shadow-[0_4px_12px_rgba(200,97,122,0.3)] shadow-lg shadow-[rgba(200,97,122,0.3)] px-8"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Salva Impostazioni
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Admin Theme Customization */}
        <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-xl text-[#2D1B14] flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#C8617A]" />
              Aspetto Gestionale
            </CardTitle>
            <p className="text-sm text-[#7C5C4A] mt-1">Personalizza colori e font del pannello di amministrazione</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Presets */}
            <div>
              <Label className="text-sm font-bold text-[#2D1B14] mb-2 block">Temi Rapidi</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {ADMIN_PRESETS.map((preset, idx) => (
                  <button key={idx} onClick={() => applyPreset(preset)}
                    className="p-2 rounded-xl border-2 hover:shadow-md transition-all text-center group"
                    style={{ borderColor: adminTheme.primary === preset.primary && adminTheme.sidebar_bg === preset.sidebar_bg ? preset.primary : '#F0E6DC' }}
                    data-testid={`admin-preset-${idx}`}>
                    <div className="flex gap-1 justify-center mb-1.5">
                      <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: preset.primary }} />
                      <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: preset.sidebar_bg }} />
                      <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: preset.accent }} />
                    </div>
                    <p className="text-[10px] font-bold text-[#2D1B14] group-hover:text-[#C8617A]">{preset.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Colore Principale</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={adminTheme.primary} onChange={e => { setAdminTheme(t => ({...t, primary: e.target.value})); applyAdminTheme({...adminTheme, primary: e.target.value}); }}
                    className="w-10 h-10 rounded-lg border-2 cursor-pointer" data-testid="admin-theme-primary" />
                  <Input value={adminTheme.primary} onChange={e => setAdminTheme(t => ({...t, primary: e.target.value}))} className="font-mono text-xs h-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sfondo Sidebar</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={adminTheme.sidebar_bg} onChange={e => { setAdminTheme(t => ({...t, sidebar_bg: e.target.value})); applyAdminTheme({...adminTheme, sidebar_bg: e.target.value}); }}
                    className="w-10 h-10 rounded-lg border-2 cursor-pointer" data-testid="admin-theme-sidebar-bg" />
                  <Input value={adminTheme.sidebar_bg} onChange={e => setAdminTheme(t => ({...t, sidebar_bg: e.target.value}))} className="font-mono text-xs h-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Testo Sidebar</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={adminTheme.sidebar_text} onChange={e => { setAdminTheme(t => ({...t, sidebar_text: e.target.value})); applyAdminTheme({...adminTheme, sidebar_text: e.target.value}); }}
                    className="w-10 h-10 rounded-lg border-2 cursor-pointer" data-testid="admin-theme-sidebar-text" />
                  <Input value={adminTheme.sidebar_text} onChange={e => setAdminTheme(t => ({...t, sidebar_text: e.target.value}))} className="font-mono text-xs h-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Accento</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={adminTheme.accent} onChange={e => { setAdminTheme(t => ({...t, accent: e.target.value})); applyAdminTheme({...adminTheme, accent: e.target.value}); }}
                    className="w-10 h-10 rounded-lg border-2 cursor-pointer" data-testid="admin-theme-accent" />
                  <Input value={adminTheme.accent} onChange={e => setAdminTheme(t => ({...t, accent: e.target.value}))} className="font-mono text-xs h-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sfondo Pagina</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={adminTheme.content_bg || '#F8F5F0'} onChange={e => { setAdminTheme(t => ({...t, content_bg: e.target.value})); applyAdminTheme({...adminTheme, content_bg: e.target.value}); }}
                    className="w-10 h-10 rounded-lg border-2 cursor-pointer" data-testid="admin-theme-content-bg" />
                  <Input value={adminTheme.content_bg || '#F8F5F0'} onChange={e => setAdminTheme(t => ({...t, content_bg: e.target.value}))} className="font-mono text-xs h-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Testo Pagina</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={adminTheme.content_text || '#2D1B14'} onChange={e => { setAdminTheme(t => ({...t, content_text: e.target.value})); applyAdminTheme({...adminTheme, content_text: e.target.value}); }}
                    className="w-10 h-10 rounded-lg border-2 cursor-pointer" data-testid="admin-theme-content-text" />
                  <Input value={adminTheme.content_text || '#2D1B14'} onChange={e => setAdminTheme(t => ({...t, content_text: e.target.value}))} className="font-mono text-xs h-10" />
                </div>
              </div>
            </div>

            {/* Fonts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1"><Type className="w-3 h-3" /> Font Titoli</Label>
                <select value={adminTheme.font_display} onChange={e => { setAdminTheme(t => ({...t, font_display: e.target.value})); applyAdminTheme({...adminTheme, font_display: e.target.value}); }}
                  className="w-full p-2.5 border rounded-lg text-sm" data-testid="admin-theme-font-display">
                  {ADMIN_FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1"><Type className="w-3 h-3" /> Font Corpo</Label>
                <select value={adminTheme.font_body} onChange={e => { setAdminTheme(t => ({...t, font_body: e.target.value})); applyAdminTheme({...adminTheme, font_body: e.target.value}); }}
                  className="w-full p-2.5 border rounded-lg text-sm" data-testid="admin-theme-font-body">
                  {ADMIN_FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                </select>
              </div>
            </div>

            {/* Save / Reset */}
            <div className="flex items-center gap-3">
              <Button onClick={saveAdminTheme} disabled={savingTheme}
                className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white px-8" data-testid="save-admin-theme-btn">
                {savingTheme ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salva Tema</>}
              </Button>
              <Button variant="outline" onClick={() => {
                const def = { primary: '#C8617A', sidebar_bg: '#FAF7F2', sidebar_text: '#2D1B14', accent: '#D4A847', font_display: 'Cormorant Garamond', font_body: 'Poppins', content_bg: '#F8F5F0', content_text: '#2D1B14' };
                setAdminTheme(def); applyAdminTheme(def);
                toast.success('Tema ripristinato — salva per confermare');
              }} className="text-[#7C5C4A]" data-testid="reset-admin-theme-btn">
                <RotateCcw className="w-4 h-4 mr-2" /> Ripristina Default
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="border-2 border-[#F0E6DC]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#2D1B14]">
              <Lock className="w-5 h-5 text-[#C8617A]" />
              Cambia Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#2D1B14] font-semibold">Password Attuale</Label>
                <Input
                  type="password"
                  value={pwForm.current_password}
                  onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                  placeholder="Inserisci password attuale"
                  required
                  data-testid="current-password-input"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#2D1B14] font-semibold">Nuova Password</Label>
                  <Input
                    type="password"
                    value={pwForm.new_password}
                    onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                    placeholder="Minimo 6 caratteri"
                    required
                    data-testid="new-password-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#2D1B14] font-semibold">Conferma Nuova Password</Label>
                  <Input
                    type="password"
                    value={pwForm.confirm_password}
                    onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                    placeholder="Ripeti nuova password"
                    required
                    data-testid="confirm-password-input"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={changingPw}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
                data-testid="change-password-btn"
              >
                {changingPw ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Cambia Password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
