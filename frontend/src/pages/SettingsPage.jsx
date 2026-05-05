import { useState, useEffect } from 'react';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, Save, Loader2, Clock, Building2, User, Lock, Palette, Type, RotateCcw, Plus, Trash2, Check, Download, Share2, FileText, ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

function BackupButtons() {
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const runAndDownload = async () => {
    setLoading(true);
    try {
      await api.post(`${API}/backup/run`);
      const res = await api.get(`${API}/backup/download`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup JSON scaricato sul PC');
    } catch {
      toast.error('Errore durante il backup');
    } finally {
      setLoading(false);
    }
  };

  const shareWhatsApp = async () => {
    setLoading(true);
    try {
      await api.post(`${API}/backup/run`);
      const res = await api.get(`${API}/backup/download`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const date = new Date().toISOString().slice(0, 10);
      const filename = `backup_${date}.json`;
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename)] })) {
        await navigator.share({ files: [new File([blob], filename)], title: 'Backup Salone' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast('File scaricato. Aprilo e condividilo su WhatsApp.', { icon: '📲' });
      }
    } catch {
      toast.error('Errore durante la condivisione');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await api.get(`${API}/backup/download-pdf`, { responseType: 'blob' });
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF scaricato sul PC');
    } catch {
      toast.error('Errore nella generazione del PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const sharePDFWhatsApp = async () => {
    setPdfLoading(true);
    try {
      const res = await api.get(`${API}/backup/download-pdf`, { responseType: 'blob' });
      const date = new Date().toISOString().slice(0, 10);
      const filename = `backup_${date}.pdf`;
      const blob = new Blob([res.data], { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename)] })) {
        await navigator.share({ files: [new File([blob], filename)], title: 'Backup Salone PDF' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast('PDF scaricato. Aprilo e condividilo su WhatsApp.', { icon: '📲' });
      }
    } catch {
      toast.error('Errore durante la condivisione PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={runAndDownload} disabled={loading} variant="outline"
        className="border-[#C8617A] text-[#C8617A] hover:bg-[#C8617A]/10">
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
        Scarica JSON (PC)
      </Button>
      <Button type="button" onClick={shareWhatsApp} disabled={loading} variant="outline"
        className="border-green-600 text-green-700 hover:bg-green-50">
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
        JSON su WhatsApp
      </Button>
      <Button type="button" onClick={downloadPDF} disabled={pdfLoading} variant="outline"
        className="border-red-500 text-red-600 hover:bg-red-50">
        {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
        Scarica PDF (PC)
      </Button>
      <Button type="button" onClick={sharePDFWhatsApp} disabled={pdfLoading} variant="outline"
        className="border-green-700 text-green-800 hover:bg-green-50">
        {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
        PDF su WhatsApp
      </Button>
    </div>
  );
}


const ADMIN_FONTS = [
  'Cormorant Garamond', 'Playfair Display', 'Montserrat', 'Poppins', 'Inter',
  'Lora', 'Raleway', 'Roboto', 'Open Sans', 'DM Sans', 'Nunito'
];

const ADMIN_PRESETS = [
  // ── Temi Allegri (nuovi) ──
  { name: '🎉 Viola Fest',   primary: '#A855F7', sidebar_bg: '#12053A', sidebar_text: '#FAF5FF', accent: '#FBBF24', content_bg: '#FAF5FF', content_text: '#12053A' },
  { name: '🌊 Tropicale',    primary: '#06B6D4', sidebar_bg: '#0C1A2E', sidebar_text: '#ECFEFF', accent: '#F43F5E', content_bg: '#F0FDFF', content_text: '#0C1A2E' },
  { name: '🌅 Tramonto',     primary: '#F97316', sidebar_bg: '#1A0A2E', sidebar_text: '#FFF7ED', accent: '#A855F7', content_bg: '#FFFBF5', content_text: '#1A0A2E' },
  { name: '🌸 Corallo',      primary: '#F43F5E', sidebar_bg: '#1C0533', sidebar_text: '#FFF1F2', accent: '#34D399', content_bg: '#FFF1F2', content_text: '#1C0533' },
  { name: '🍀 Bosco',        primary: '#10B981', sidebar_bg: '#042F2E', sidebar_text: '#ECFDF5', accent: '#FBBF24', content_bg: '#F0FDF9', content_text: '#042F2E' },
  { name: '⭐ Ambra',        primary: '#F59E0B', sidebar_bg: '#1C1207', sidebar_text: '#FFFBEB', accent: '#6366F1', content_bg: '#FFFBEB', content_text: '#1C1207' },
  // ── Temi Classici ──
  { name: '⚡ Elettrico',    primary: '#2563EB', sidebar_bg: '#0F172A', sidebar_text: '#F8FAFC', accent: '#22D3EE', content_bg: '#F0F6FF', content_text: '#0F172A' },
  { name: '🔥 Fuoco',        primary: '#EA580C', sidebar_bg: '#0C4A6E', sidebar_text: '#F0F9FF', accent: '#0891B2', content_bg: '#FFFBEB', content_text: '#1C1917' },
  { name: '💎 Lusso',        primary: '#7C3AED', sidebar_bg: '#1E1033', sidebar_text: '#F5F3FF', accent: '#EAB308', content_bg: '#FAF5FF', content_text: '#1E1B4B' },
  { name: '🌿 Smeraldo',     primary: '#059669', sidebar_bg: '#052E16', sidebar_text: '#ECFDF5', accent: '#F97316', content_bg: '#F0FDF4', content_text: '#14532D' },
  { name: '🌙 Scuro',        primary: '#3B82F6', sidebar_bg: '#0F172A', sidebar_text: '#F1F5F9', accent: '#FACC15', content_bg: '#1E293B', content_text: '#F1F5F9' },
  { name: '🌺 Rosa Vivace',  primary: '#E8477C', sidebar_bg: '#FAF7F2', sidebar_text: '#1A1A2E', accent: '#2EC4B6', content_bg: '#FCFCFD', content_text: '#1A1A2E' },
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

const DAY_OF_WEEK_MAP = { 'lunedì': 1, 'martedì': 2, 'mercoledì': 3, 'giovedì': 4, 'venerdì': 5, 'sabato': 6, 'domenica': 0 };

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
  // Calendario blocco
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-based
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [calForm, setCalForm] = useState({ start_time: '09:00', end_time: '18:00', reason: '', all_day: true });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [waForm, setWaForm] = useState({ green_api_instance_id: '', green_api_token: '' });
  const [savingWa, setSavingWa] = useState(false);
  const [waTest, setWaTest] = useState(null);
  const [testingWa, setTestingWa] = useState(false);
  const [waSendTest, setWaSendTest] = useState({ phone: '', result: null, loading: false });
  const [tgForm, setTgForm] = useState({ telegram_instance_id: '', telegram_api_token: '' });
  const [savingTg, setSavingTg] = useState(false);
  const [tgTest, setTgTest] = useState(null);
  const [testingTg, setTestingTg] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchBlockedSlots();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get(`${API}/settings`);
      setSettings(res.data);
      if (res.data.admin_theme) setAdminTheme(res.data.admin_theme);
      if (res.data.green_api_instance_id) setWaForm(f => ({ ...f, green_api_instance_id: res.data.green_api_instance_id }));
      if (res.data.telegram_instance_id) setTgForm(f => ({ ...f, telegram_instance_id: res.data.telegram_instance_id }));
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

  const saveWaSettings = async () => {
    if (!waForm.green_api_instance_id || !waForm.green_api_token) {
      toast.error('Inserisci sia Instance ID che API Token');
      return;
    }
    setSavingWa(true);
    try {
      await api.put(`${API}/settings/whatsapp-api`, waForm);
      toast.success('Salvato! Clicca "Testa connessione" per verificare.');
      setWaTest(null);
    } catch { toast.error('Errore nel salvataggio'); }
    finally { setSavingWa(false); }
  };

  const testWaConnection = async () => {
    setTestingWa(true);
    setWaTest(null);
    try {
      const res = await api.get(`${API}/settings/whatsapp-test`);
      setWaTest(res.data);
    } catch { setWaTest({ ok: false, message: 'Errore di connessione al server' }); }
    finally { setTestingWa(false); }
  };

  const sendWaTestMessage = async () => {
    if (!waSendTest.phone) return;
    setWaSendTest(p => ({ ...p, loading: true, result: null }));
    try {
      const res = await api.post(`${API}/settings/whatsapp-send-test`, { phone: waSendTest.phone });
      setWaSendTest(p => ({ ...p, result: res.data, loading: false }));
    } catch (e) {
      setWaSendTest(p => ({ ...p, result: { ok: false, message: 'Errore server: ' + (e?.response?.data?.detail || e.message) }, loading: false }));
    }
  };

  const saveTgSettings = async () => {
    if (!tgForm.telegram_instance_id || !tgForm.telegram_api_token) {
      toast.error('Inserisci sia Instance ID che API Token Telegram');
      return;
    }
    setSavingTg(true);
    try {
      await api.put(`${API}/settings/telegram-api`, tgForm);
      toast.success('Impostazioni Telegram salvate! Clicca "Testa connessione" per verificare.');
      setTgTest(null);
    } catch { toast.error('Errore nel salvataggio'); }
    finally { setSavingTg(false); }
  };

  const testTgConnection = async () => {
    setTestingTg(true);
    setTgTest(null);
    try {
      const res = await api.get(`${API}/settings/telegram-test`);
      setTgTest(res.data);
    } catch { setTgTest({ ok: false, message: 'Errore di connessione al server' }); }
    finally { setTestingTg(false); }
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

  const applyPreset = async (preset) => {
    const newTheme = { ...adminTheme, ...preset };
    delete newTheme.name;
    setAdminTheme(newTheme);
    localStorage.setItem('adminTheme', JSON.stringify(newTheme));
    window.dispatchEvent(new StorageEvent('storage', { key: 'adminTheme', newValue: JSON.stringify(newTheme) }));
    try {
      await api.put(`${API}/settings/admin-theme`, { admin_theme: newTheme });
      toast.success(`Tema "${preset.name}" applicato e salvato!`);
    } catch {
      toast.success(`Tema "${preset.name}" applicato — salva per confermare`);
    }
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

  // ── Calendario festività ──────────────────────────────────────────
  const easterSunday = (year) => {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  };

  const getItalianHolidays = (year) => {
    const fixed = [
      [1, 1, 'Capodanno'], [1, 6, 'Epifania'], [4, 25, 'Liberazione'],
      [5, 1, 'Festa del Lavoro'], [6, 2, 'Repubblica'], [8, 15, 'Ferragosto'],
      [11, 1, 'Tutti i Santi'], [12, 8, 'Immacolata'], [12, 25, 'Natale'], [12, 26, 'S. Stefano'],
    ];
    const map = {};
    fixed.forEach(([m, d, label]) => {
      const key = `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      map[key] = label;
    });
    const easter = easterSunday(year);
    const easterMonday = new Date(easter); easterMonday.setDate(easterMonday.getDate() + 1);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    map[fmt(easter)] = 'Pasqua';
    map[fmt(easterMonday)] = 'Lunedì di Pasqua';
    return map;
  };

  const fmtDateKey = (year, month, day) =>
    `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  const oneTimeBlockMap = {};
  blockedSlots.filter(s => s.type === 'one-time' && s.date).forEach(s => { oneTimeBlockMap[s.date] = s; });

  const recurringBlockMap = {};
  const recurringSlots = blockedSlots.filter(s => s.type === 'recurring' && s.day_of_week);
  if (recurringSlots.length > 0) {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const jsDay = new Date(calYear, calMonth, d).getDay();
      const matchingSlot = recurringSlots.find(s => DAY_OF_WEEK_MAP[s.day_of_week] === jsDay);
      if (matchingSlot) {
        const k = fmtDateKey(calYear, calMonth, d);
        if (!oneTimeBlockMap[k]) recurringBlockMap[k] = matchingSlot;
      }
    }
  }

  const blockedDateMap = { ...oneTimeBlockMap, ...recurringBlockMap };
  const blockedDateSet = new Set(Object.keys(blockedDateMap));

  const calPrevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); };
  const calNextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); };

  const calHolidays = getItalianHolidays(calYear);

  const selectHolidaysInMonth = () => {
    const keys = Object.keys(calHolidays).filter(k => {
      const d = new Date(k + 'T12:00:00');
      return d.getFullYear() === calYear && d.getMonth() === calMonth;
    });
    setSelectedDates(prev => { const next = new Set(prev); keys.forEach(k => next.add(k)); return next; });
  };

  const selectAllInMonth = () => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const next = new Set(selectedDates);
    for (let d = 1; d <= daysInMonth; d++) next.add(fmtDateKey(calYear, calMonth, d));
    setSelectedDates(next);
  };

  const bulkBlockDates = async () => {
    if (selectedDates.size === 0) return;
    setBulkSaving(true);
    let saved = 0;
    for (const date of selectedDates) {
      try {
        await api.post(`${API}/blocked-slots`, {
          type: 'one-time', date,
          start_time: calForm.all_day ? '00:00' : calForm.start_time,
          end_time: calForm.all_day ? '23:59' : calForm.end_time,
          reason: calForm.reason || (calHolidays[date] ? calHolidays[date] : 'Chiusura'),
        });
        saved++;
      } catch {}
    }
    setBulkSaving(false);
    setSelectedDates(new Set());
    fetchBlockedSlots();
    toast.success(`${saved} giorn${saved === 1 ? 'o bloccato' : 'i bloccati'}!`);
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
        google_review_link: settings.google_review_link,
        auto_backup_enabled: settings.auto_backup_enabled,
        auto_backup_email: settings.auto_backup_email
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

        <form onSubmit={handleSubmit} className="space-y-6 stagger-in">
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
              <p className="text-sm text-[#7C5C4A] mt-1">Clicca i giorni nel calendario per bloccarli in blocco. Le festività italiane sono evidenziate in giallo.</p>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* ── CALENDARIO ─────────────────────────────────────── */}
              <div className="rounded-2xl border border-[#F0E6DC] overflow-hidden">
                {/* Navigazione mese */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-b border-[#F0E6DC]">
                  <button onClick={calPrevMonth} className="w-8 h-8 rounded-full hover:bg-white/70 flex items-center justify-center transition-colors">
                    <ChevronLeft className="w-4 h-4 text-[#7C5C4A]" />
                  </button>
                  <div className="text-center">
                    <p className="font-bold text-[#2D1B14] capitalize">
                      {new Date(calYear, calMonth, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] text-[#7C5C4A]"><span className="w-2.5 h-2.5 rounded-sm bg-amber-300 inline-block" /> Festività</span>
                      <span className="flex items-center gap-1 text-[10px] text-[#7C5C4A]"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Bloccato</span>
                      <span className="flex items-center gap-1 text-[10px] text-[#7C5C4A]"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block" /> Ricorrente</span>
                      <span className="flex items-center gap-1 text-[10px] text-[#7C5C4A]"><span className="w-2.5 h-2.5 rounded-sm bg-[#C8617A] inline-block" /> Selezionato</span>
                    </div>
                  </div>
                  <button onClick={calNextMonth} className="w-8 h-8 rounded-full hover:bg-white/70 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4 text-[#7C5C4A]" />
                  </button>
                </div>

                {/* Pulsanti rapidi */}
                <div className="flex flex-wrap gap-2 px-4 py-2 bg-[#FAF7F2] border-b border-[#F0E6DC]">
                  <button onClick={selectHolidaysInMonth}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors">
                    🎉 Aggiungi festività del mese
                  </button>
                  <button onClick={selectAllInMonth}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                    <CalendarDays className="w-3 h-3" /> Seleziona tutto il mese
                  </button>
                  {selectedDates.size > 0 && (
                    <button onClick={() => setSelectedDates(new Set())}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors ml-auto">
                      <X className="w-3 h-3" /> Deseleziona tutto
                    </button>
                  )}
                </div>

                {/* Griglia calendario */}
                <div className="p-3">
                  {/* Intestazione giorni */}
                  <div className="grid grid-cols-7 mb-1">
                    {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d => (
                      <div key={d} className="text-center text-[10px] font-bold text-[#7C5C4A] uppercase py-1">{d}</div>
                    ))}
                  </div>
                  {/* Celle giorni */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {(() => {
                      const firstDay = new Date(calYear, calMonth, 1);
                      // Lunedì = 0, ... Domenica = 6
                      const startOffset = (firstDay.getDay() + 6) % 7;
                      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                      const cells = [];
                      // Celle vuote prima del 1°
                      for (let i = 0; i < startOffset; i++) {
                        cells.push(<div key={`e-${i}`} />);
                      }
                      for (let d = 1; d <= daysInMonth; d++) {
                        const key = fmtDateKey(calYear, calMonth, d);
                        const isHoliday = !!calHolidays[key];
                        const isBlocked = blockedDateSet.has(key);
                        const isRecurringBlocked = isBlocked && !oneTimeBlockMap[key];
                        const isSelected = selectedDates.has(key);
                        const isToday = key === fmtDateKey(today.getFullYear(), today.getMonth(), today.getDate());
                        const isSunday = new Date(calYear, calMonth, d).getDay() === 0;
                        const isSaturday = new Date(calYear, calMonth, d).getDay() === 6;
                        const isEditing = editingBlock?.date === key;

                        let bg = 'bg-white hover:bg-[#FFF0F3]';
                        let text = 'text-[#2D1B14]';
                        let border = 'border border-[#F0E6DC]';

                        if (isSelected) { bg = 'bg-[#C8617A]'; text = 'text-white'; border = 'border border-[#A0404F]'; }
                        else if (isBlocked && !isRecurringBlocked) { bg = 'bg-red-400 hover:bg-red-500'; text = 'text-white'; border = 'border border-red-500'; }
                        else if (isRecurringBlocked) { bg = 'bg-orange-400 hover:bg-orange-500'; text = 'text-white'; border = 'border border-orange-500'; }
                        else if (isHoliday) { bg = 'bg-amber-100 hover:bg-amber-200'; text = 'text-amber-900'; border = 'border border-amber-300'; }
                        else if (isSunday || isSaturday) { bg = 'bg-slate-50 hover:bg-slate-100'; text = 'text-slate-500'; }

                        cells.push(
                          <button
                            key={key}
                            onClick={() => {
                              if (isBlocked) {
                                setEditingBlock(prev => prev?.date === key ? null : { date: key, slot: blockedDateMap[key] });
                                return;
                              }
                              setEditingBlock(null);
                              setSelectedDates(prev => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key); else next.add(key);
                                return next;
                              });
                            }}
                            title={isHoliday ? calHolidays[key] : isBlocked ? `${blockedDateMap[key]?.reason || 'Bloccato'} — clicca per gestire` : key}
                            className={`relative rounded-lg text-xs font-semibold h-9 flex flex-col items-center justify-center transition-all ${bg} ${text} ${border} cursor-pointer ${isToday && !isSelected ? 'ring-2 ring-[#C8617A] ring-offset-1' : ''} ${isEditing ? 'ring-2 ring-orange-400 ring-offset-1' : ''}`}
                          >
                            <span>{d}</span>
                            {isHoliday && !isSelected && !isBlocked && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />}
                            {isBlocked && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/50" />}
                          </button>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                </div>

                {/* Pannello selezione attiva */}
                {selectedDates.size > 0 && (
                  <div className="border-t border-[#F0E6DC] bg-[#FFF5F7] px-4 py-3 space-y-3">
                    <p className="text-sm font-bold text-[#C8617A]">
                      {selectedDates.size} giorn{selectedDates.size === 1 ? 'o selezionato' : 'i selezionati'} — imposta il blocco:
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div
                          onClick={() => setCalForm(f => ({...f, all_day: !f.all_day}))}
                          className={`w-10 h-5 rounded-full transition-colors relative ${calForm.all_day ? 'bg-[#C8617A]' : 'bg-gray-300'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${calForm.all_day ? 'left-5' : 'left-0.5'}`} />
                        </div>
                        <span className="text-sm font-semibold text-[#2D1B14]">Giornata intera</span>
                      </label>
                      {!calForm.all_day && (
                        <>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-[#7C5C4A]">Da</Label>
                            <Input type="time" value={calForm.start_time}
                              onChange={e => setCalForm(f => ({...f, start_time: e.target.value}))}
                              className="w-24 text-sm h-8" />
                          </div>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-[#7C5C4A]">A</Label>
                            <Input type="time" value={calForm.end_time}
                              onChange={e => setCalForm(f => ({...f, end_time: e.target.value}))}
                              className="w-24 text-sm h-8" />
                          </div>
                        </>
                      )}
                      <Input placeholder="Motivo (es. Ferie, Festività...)"
                        value={calForm.reason}
                        onChange={e => setCalForm(f => ({...f, reason: e.target.value}))}
                        className="flex-1 min-w-[160px] text-sm h-8" />
                      <Button onClick={bulkBlockDates} disabled={bulkSaving}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold h-9 shrink-0">
                        {bulkSaving
                          ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Salvo...</>
                          : <><Lock className="w-4 h-4 mr-1" /> Blocca {selectedDates.size} giorn{selectedDates.size === 1 ? 'o' : 'i'}</>}
                      </Button>
                    </div>
                    {/* Elenco giorni selezionati */}
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {[...selectedDates].sort().map(d => (
                        <span key={d} className="flex items-center gap-1 bg-[#C8617A]/10 text-[#C8617A] text-xs font-semibold px-2 py-0.5 rounded-full border border-[#C8617A]/20">
                          {d.slice(8)}/{d.slice(5,7)}
                          {calHolidays[d] && <span className="text-amber-600">🎉</span>}
                          <button onClick={() => setSelectedDates(prev => { const n = new Set(prev); n.delete(d); return n; })} className="hover:text-red-600 ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {editingBlock && (
                  <div className="border-t border-[#F0E6DC] bg-orange-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-orange-700 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" />
                          {editingBlock.date} — Blocco attivo
                        </p>
                        <p className="text-sm text-[#2D1B14] mt-0.5">
                          {editingBlock.slot.start_time} – {editingBlock.slot.end_time}
                          {editingBlock.slot.start_time === '00:00' && editingBlock.slot.end_time === '23:59' &&
                            <span className="ml-1.5 text-xs font-semibold text-orange-600">Giornata intera</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${editingBlock.slot.type === 'recurring' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                            {editingBlock.slot.type === 'recurring' ? `Ogni ${editingBlock.slot.day_of_week}` : 'Una tantum'}
                          </span>
                          {editingBlock.slot.reason && <span className="text-xs text-[#7C5C4A]">{editingBlock.slot.reason}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="sm" variant="ghost"
                          onClick={() => { deleteBlockedSlot(editingBlock.slot.id); setEditingBlock(null); }}
                          className="text-red-500 hover:bg-red-100 h-8 px-3 text-xs font-bold">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Elimina
                        </Button>
                        <button onClick={() => setEditingBlock(null)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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

          {/* Backup */}
          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-xl text-[#2D1B14] flex items-center gap-2">
                <Save className="w-5 h-5 text-[#C8617A]" />
                Backup Dati
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[#7C5C4A]">
                Salva una copia di tutti i dati del salone sul tuo PC o condividila su WhatsApp.
              </p>
              <BackupButtons />
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
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

        {/* WhatsApp Diretto — Green API (gratuito) */}
        <Card className="border-2 border-green-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#2D1B14]">
              <Share2 className="w-5 h-5 text-green-600" />
              WhatsApp Diretto — Invio senza aprire l'app
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 space-y-2">
              <p className="font-bold">✅ Gratuito — fino a 1500 messaggi/mese</p>
              <p>Usa il tuo numero WhatsApp normale (non serve un account Business). Setup in 2 minuti:</p>
              <ol className="list-decimal list-inside space-y-1 text-green-700">
                <li>Vai su <strong>greenapi.com</strong> e crea un account gratuito</li>
                <li>Crea una nuova istanza e scansiona il QR code con WhatsApp (come WhatsApp Web)</li>
                <li>Copia <strong>Instance ID</strong> e <strong>API Token</strong> qui sotto e salva</li>
              </ol>
              <p className="text-xs text-green-600">Se non configurato, i messaggi aprono WhatsApp Web con il testo precompilato (comportamento attuale).</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-semibold text-sm">Instance ID</Label>
                <Input
                  value={waForm.green_api_instance_id}
                  onChange={e => setWaForm(f => ({ ...f, green_api_instance_id: e.target.value }))}
                  placeholder="es. 1101234567"
                  className="border-2"
                />
                <p className="text-xs text-gray-400">Trovalo nella dashboard di Green API</p>
              </div>
              <div className="space-y-1">
                <Label className="font-semibold text-sm">API Token</Label>
                <Input
                  value={waForm.green_api_token}
                  onChange={e => setWaForm(f => ({ ...f, green_api_token: e.target.value }))}
                  placeholder="Token dalla dashboard Green API"
                  type="password"
                  className="border-2"
                />
                <p className="text-xs text-gray-400">Visibile nella pagina della tua istanza</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={saveWaSettings} disabled={savingWa} className="bg-green-600 hover:bg-green-700 text-white">
                {savingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salva</>}
              </Button>
              <Button onClick={testWaConnection} disabled={testingWa} variant="outline" className="border-2 border-green-200 text-green-700 hover:bg-green-50">
                {testingWa ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Testa connessione
              </Button>
            </div>
            {waTest && (
              <div className={`p-3 rounded-xl text-sm font-medium ${waTest.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {waTest.message}
                {!waTest.ok && waTest.status === 'notAuthorized' && (
                  <p className="text-xs mt-1 text-red-600">
                    Apri WhatsApp → Dispositivi collegati → Collega un dispositivo → scansiona il QR code dal sito Green API
                  </p>
                )}
              </div>
            )}

            {/* Test invio reale */}
            <div className="border-t border-green-100 pt-4 space-y-2">
              <Label className="text-[#2D1B14] font-semibold text-sm">Prova invio reale</Label>
              <p className="text-xs text-gray-500">Inserisci il tuo numero per verificare che il messaggio arrivi davvero su WhatsApp (non solo che la connessione sia attiva).</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Es. 339 783 3526"
                  value={waSendTest.phone}
                  onChange={e => setWaSendTest(p => ({ ...p, phone: e.target.value, result: null }))}
                  className="border-green-200 focus:border-green-400"
                />
                <Button
                  onClick={sendWaTestMessage}
                  disabled={waSendTest.loading || !waSendTest.phone}
                  className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                >
                  {waSendTest.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invia prova'}
                </Button>
              </div>
              {waSendTest.result && (
                <div className={`p-3 rounded-xl text-sm font-medium ${waSendTest.result.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {waSendTest.result.message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Telegram — Green API Fallback */}
        <Card className="border-2 border-sky-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#2D1B14]">
              <Share2 className="w-5 h-5 text-sky-500" />
              Telegram — Fallback automatico quando WhatsApp esaurisce la quota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-sm text-sky-800 space-y-2">
              <p className="font-bold">📲 Fallback automatico su Telegram</p>
              <p>Quando la quota mensile WhatsApp (Green API) è esaurita, i messaggi vengono inviati automaticamente su Telegram. Il cliente deve avere Telegram con lo stesso numero di telefono.</p>
              <ol className="list-decimal list-inside space-y-1 text-sky-700">
                <li>Vai su <strong>app.green-api.com</strong> → crea una nuova istanza <strong>Telegram</strong></li>
                <li>Copia <strong>Instance ID</strong> e <strong>API Token</strong> dell'istanza Telegram</li>
                <li>Incollali qui sotto e salva</li>
              </ol>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-semibold text-sm">Instance ID Telegram</Label>
                <Input
                  value={tgForm.telegram_instance_id}
                  onChange={e => setTgForm(f => ({ ...f, telegram_instance_id: e.target.value }))}
                  placeholder="es. 4100610381"
                  className="border-2"
                />
                <p className="text-xs text-gray-400">Trovalo nella dashboard di Green API</p>
              </div>
              <div className="space-y-1">
                <Label className="font-semibold text-sm">API Token Telegram</Label>
                <Input
                  value={tgForm.telegram_api_token}
                  onChange={e => setTgForm(f => ({ ...f, telegram_api_token: e.target.value }))}
                  placeholder="Token dalla dashboard Green API"
                  type="password"
                  className="border-2"
                />
                <p className="text-xs text-gray-400">Visibile nella pagina della tua istanza Telegram</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={saveTgSettings} disabled={savingTg} className="bg-sky-600 hover:bg-sky-700 text-white">
                {savingTg ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salva</>}
              </Button>
              <Button onClick={testTgConnection} disabled={testingTg} variant="outline" className="border-2 border-sky-200 text-sky-700 hover:bg-sky-50">
                {testingTg ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Testa connessione
              </Button>
            </div>
            {tgTest && (
              <div className={`p-3 rounded-xl text-sm font-medium ${tgTest.ok ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {tgTest.message}
              </div>
            )}
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
