import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, Save, Loader2, Clock, Building2, User, Lock, Palette, Type, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
    primary_color: '#D4AF37',
    accent_color: '#0EA5E9',
    font_family: 'system-ui',
    font_size: 'base',
    border_radius: '0.75rem',
  });
  const [savingTheme, setSavingTheme] = useState(false);

  const FONT_OPTIONS = [
    { value: 'system-ui', label: 'Sistema (Default)' },
    { value: "'Inter', sans-serif", label: 'Inter' },
    { value: "'Playfair Display', serif", label: 'Playfair Display' },
    { value: "'Poppins', sans-serif", label: 'Poppins' },
    { value: "'Montserrat', sans-serif", label: 'Montserrat' },
    { value: "'DM Sans', sans-serif", label: 'DM Sans' },
  ];

  const SIZE_OPTIONS = [
    { value: 'sm', label: 'Piccolo' },
    { value: 'base', label: 'Medio (Default)' },
    { value: 'lg', label: 'Grande' },
    { value: 'xl', label: 'Extra Grande' },
  ];

  const RADIUS_OPTIONS = [
    { value: '0', label: 'Nessuno' },
    { value: '0.375rem', label: 'Piccolo' },
    { value: '0.75rem', label: 'Medio (Default)' },
    { value: '1rem', label: 'Grande' },
    { value: '1.5rem', label: 'Molto Grande' },
  ];

  useEffect(() => {
    fetchSettings();
    loadAdminTheme();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/settings`);
      setSettings(res.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Errore nel caricamento delle impostazioni');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminTheme = async () => {
    try {
      const res = await axios.get(`${API}/admin-theme`);
      if (res.data && Object.keys(res.data).length > 0) {
        setAdminTheme(prev => ({ ...prev, ...res.data }));
        applyAdminTheme(res.data);
      }
    } catch { /* ignore if no config yet */ }
  };

  const applyAdminTheme = (theme) => {
    const root = document.documentElement;
    if (theme.primary_color) {
      root.style.setProperty('--gold', theme.primary_color);
      // Generate dim variant
      root.style.setProperty('--gold-dim', theme.primary_color + '15');
      root.style.setProperty('--border-gold', theme.primary_color + '30');
      root.style.setProperty('--glow-gold', `0 0 20px ${theme.primary_color}30`);
    }
    if (theme.accent_color) {
      root.style.setProperty('--cyan', theme.accent_color);
    }
    if (theme.font_family) {
      root.style.setProperty('--font-admin', theme.font_family);
      document.body.style.fontFamily = theme.font_family;
    }
    if (theme.font_size) {
      const sizes = { sm: '13px', base: '14px', lg: '16px', xl: '18px' };
      root.style.setProperty('--font-size-admin', sizes[theme.font_size] || '14px');
      document.body.style.fontSize = sizes[theme.font_size] || '14px';
    }
    if (theme.border_radius) {
      root.style.setProperty('--radius', theme.border_radius);
    }
  };

  const saveAdminTheme = async () => {
    setSavingTheme(true);
    try {
      await axios.put(`${API}/admin-theme`, adminTheme);
      applyAdminTheme(adminTheme);
      toast.success('Aspetto gestionale salvato!');
    } catch (err) {
      toast.error('Errore nel salvataggio');
    } finally {
      setSavingTheme(false);
    }
  };

  const resetAdminTheme = () => {
    const defaults = { primary_color: '#D4AF37', accent_color: '#0EA5E9', font_family: 'system-ui', font_size: 'base', border_radius: '0.75rem' };
    setAdminTheme(defaults);
    applyAdminTheme(defaults);
    toast.success('Aspetto ripristinato ai valori predefiniti');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.put(`${API}/settings`, {
        salon_name: settings.salon_name,
        name: settings.name,
        opening_time: settings.opening_time,
        closing_time: settings.closing_time,
        working_days: settings.working_days
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
    setSettings(prev => {
      const days = Array.isArray(prev.working_days) ? prev.working_days : [];
      return {
        ...prev,
        working_days: days.includes(day)
          ? days.filter(d => d !== day)
          : [...days, day]
      };
    });
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
      await axios.put(`${API}/auth/change-password`, {
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
          <h1 className="font-playfair text-3xl font-medium text-[var(--text-primary)]">Impostazioni</h1>
          <p className="text-[var(--text-secondary)] mt-1 font-manrope">Gestisci le impostazioni del tuo salone</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Settings */}
          <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]/30 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]">
            <CardHeader>
              <CardTitle className="font-playfair text-xl text-[var(--text-primary)] flex items-center gap-2">
                <User className="w-5 h-5 text-[var(--gold)]" />
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
                    className="bg-[var(--bg-elevated)] border-transparent focus:border-[var(--gold)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={settings.email || ''}
                    disabled
                    className="bg-[var(--bg-elevated)] border-transparent opacity-60"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Salon Settings */}
          <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]/30 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]">
            <CardHeader>
              <CardTitle className="font-playfair text-xl text-[var(--text-primary)] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[var(--gold)]" />
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
                  className="bg-[var(--bg-elevated)] border-transparent focus:border-[var(--gold)]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]/30 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]">
            <CardHeader>
              <CardTitle className="font-playfair text-xl text-[var(--text-primary)] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[var(--gold)]" />
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
                    className="bg-[var(--bg-elevated)] border-transparent focus:border-[var(--gold)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chiusura</Label>
                  <Input
                    type="time"
                    value={settings.closing_time || '19:00'}
                    onChange={(e) => setSettings({ ...settings, closing_time: e.target.value })}
                    data-testid="settings-closing-time-input"
                    className="bg-[var(--bg-elevated)] border-transparent focus:border-[var(--gold)]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Giorni Lavorativi</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {DAYS.map((day) => {
                    const isChecked = Array.isArray(settings.working_days) && settings.working_days.includes(day.value);
                    return (
                      <div
                        key={day.value}
                        className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-[var(--gold)]/10 border-[var(--gold)]'
                            : 'bg-[var(--bg-elevated)] border-transparent hover:border-[var(--border-subtle)]'
                        }`}
                        onClick={() => toggleDay(day.value)}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleDay(day.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="data-[state=checked]:bg-[var(--gold)] data-[state=checked]:border-[var(--gold)]"
                        />
                        <span className={`text-sm ${
                          isChecked ? 'text-[var(--gold)] font-medium' : 'text-[var(--text-primary)]'
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

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              data-testid="save-settings-btn"
              className="bg-[var(--gold)] hover:bg-[var(--gold)] text-white shadow-lg shadow-[var(--gold)]/20 px-8"
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

        {/* Admin Theme / Aspetto Gestionale */}
        <Card data-testid="admin-theme-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Palette className="w-5 h-5 text-[var(--gold)]" />
              Aspetto Gestionale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)] font-semibold">Colore Primario</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={adminTheme.primary_color}
                    onChange={e => { const c = e.target.value; setAdminTheme(p => ({ ...p, primary_color: c })); applyAdminTheme({ ...adminTheme, primary_color: c }); }}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border-subtle)]"
                    data-testid="admin-primary-color" />
                  <Input value={adminTheme.primary_color}
                    onChange={e => setAdminTheme(p => ({ ...p, primary_color: e.target.value }))}
                    className="flex-1 bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)] font-semibold">Colore Secondario</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={adminTheme.accent_color}
                    onChange={e => { const c = e.target.value; setAdminTheme(p => ({ ...p, accent_color: c })); applyAdminTheme({ ...adminTheme, accent_color: c }); }}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border-subtle)]"
                    data-testid="admin-accent-color" />
                  <Input value={adminTheme.accent_color}
                    onChange={e => setAdminTheme(p => ({ ...p, accent_color: e.target.value }))}
                    className="flex-1 bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] font-mono" />
                </div>
              </div>
            </div>

            {/* Font Family */}
            <div className="space-y-2">
              <Label className="text-[var(--text-secondary)] font-semibold flex items-center gap-2">
                <Type className="w-4 h-4" /> Font
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {FONT_OPTIONS.map(f => (
                  <button key={f.value} type="button"
                    onClick={() => { setAdminTheme(p => ({ ...p, font_family: f.value })); applyAdminTheme({ ...adminTheme, font_family: f.value }); }}
                    className={`btn-animate p-3 rounded-xl border text-sm font-medium transition-all text-left ${
                      adminTheme.font_family === f.value
                        ? 'border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--gold)]'
                    }`}
                    style={{ fontFamily: f.value }}
                    data-testid={`font-${f.label.toLowerCase().replace(/\s/g, '-')}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label className="text-[var(--text-secondary)] font-semibold">Dimensione Testo</Label>
              <div className="grid grid-cols-4 gap-2">
                {SIZE_OPTIONS.map(s => (
                  <button key={s.value} type="button"
                    onClick={() => { setAdminTheme(p => ({ ...p, font_size: s.value })); applyAdminTheme({ ...adminTheme, font_size: s.value }); }}
                    className={`btn-animate p-3 rounded-xl border text-sm font-medium transition-all ${
                      adminTheme.font_size === s.value
                        ? 'border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--gold)]'
                    }`}
                    data-testid={`size-${s.value}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Border Radius */}
            <div className="space-y-2">
              <Label className="text-[var(--text-secondary)] font-semibold">Arrotondamento Angoli</Label>
              <div className="grid grid-cols-5 gap-2">
                {RADIUS_OPTIONS.map(r => (
                  <button key={r.value} type="button"
                    onClick={() => { setAdminTheme(p => ({ ...p, border_radius: r.value })); applyAdminTheme({ ...adminTheme, border_radius: r.value }); }}
                    className={`btn-animate p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      adminTheme.border_radius === r.value
                        ? 'border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--gold)]'
                    }`}
                    data-testid={`radius-${r.value}`}>
                    <div className="w-6 h-6 border-2 border-current mx-auto mb-1" style={{ borderRadius: r.value }} />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Save + Reset */}
            <div className="flex gap-3 pt-2">
              <Button onClick={saveAdminTheme} disabled={savingTheme}
                className="btn-gold bg-[var(--gold)] text-[var(--bg-deep)] hover:bg-[var(--gold)] px-6"
                data-testid="save-admin-theme-btn">
                {savingTheme ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salva Aspetto</>}
              </Button>
              <Button variant="outline" onClick={resetAdminTheme} className="border-[var(--border-subtle)] text-[var(--text-secondary)]"
                data-testid="reset-admin-theme-btn">
                <RotateCcw className="w-4 h-4 mr-2" /> Ripristina Default
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="border-2 border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Lock className="w-5 h-5 text-[var(--gold)]" />
              Cambia Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[var(--text-primary)] font-semibold">Password Attuale</Label>
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
                  <Label className="text-[var(--text-primary)] font-semibold">Nuova Password</Label>
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
                  <Label className="text-[var(--text-primary)] font-semibold">Conferma Nuova Password</Label>
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
