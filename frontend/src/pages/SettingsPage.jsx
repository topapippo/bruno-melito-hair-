import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API, getErrorMessage } from '../lib/api';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Loader2, Clock, Building2, User, Lock, Unlock, Palette, Type, RotateCcw, Trash2, Check, Share2, ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { key: 'salone', label: 'Salone' },
  { key: 'orari', label: 'Orari e blocchi' },
  { key: 'messaggi', label: 'Messaggi' },
  { key: 'collegamenti', label: 'Collegamenti' },
  { key: 'account', label: 'Account e aspetto' },
];
const TAB_STORAGE_KEY = 'settingsTab';
const readStoredTab = () => {
  try {
    const t = localStorage.getItem(TAB_STORAGE_KEY);
    return TABS.some(x => x.key === t) ? t : 'salone';
  } catch { return 'salone'; }
};

const BTN_PRIMARY = 'h-11 min-h-[44px] px-5 rounded-lg font-bold text-base bg-[color:var(--admin-primary)] text-white hover:bg-[color:var(--admin-primary)] hover:text-white hover:brightness-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--admin-primary)]';
const BTN_OUTLINE = 'h-11 min-h-[44px] px-5 rounded-lg border-2 border-[color:var(--admin-primary)] bg-white text-[color:var(--admin-primary)] font-bold text-base hover:bg-[color-mix(in_srgb,var(--admin-primary)_10%,white)] hover:text-[color:var(--admin-primary)]';
const BTN_CHIP = 'inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg text-sm font-semibold border border-[color:var(--admin-primary)] text-[color:var(--admin-primary)] bg-white hover:bg-[color-mix(in_srgb,var(--admin-primary)_10%,white)] transition-colors';
const FIELD = 'h-11 text-base bg-[#FAF7F2] border-transparent focus:border-[color:var(--admin-primary)]';

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <Card className="bg-white border-[#F0E6DC] shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-xl sm:text-2xl text-[#2D1B14] flex items-center gap-2">
          <Icon className="w-5 h-5 text-[color:var(--admin-primary)] shrink-0" aria-hidden="true" />
          {title}
        </CardTitle>
        {description && <p className="text-sm sm:text-base text-[#7C5C4A] mt-1">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function StatusNote({ status }) {
  if (!status) return null;
  return (
    <div
      role={status.ok ? 'status' : 'alert'}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${status.ok ? 'bg-green-50 text-green-800 border-green-300' : 'bg-red-50 text-red-800 border-red-300'}`}
    >
      {status.ok ? <Check className="w-4 h-4 shrink-0" aria-hidden="true" /> : <X className="w-4 h-4 shrink-0" aria-hidden="true" />}
      <span>{String(status.message ?? '').replace(/^[^\p{L}\p{N}]+/u, '')}</span>
    </div>
  );
}

function SettingsTabs({ value, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Sezioni delle impostazioni"
      className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map(t => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`settings-tab-${t.key}`}
            aria-selected={active}
            aria-controls="settings-panel"
            onClick={(e) => { onChange(t.key); e.currentTarget.scrollIntoView?.({ inline: 'center', block: 'nearest' }); }}
            data-testid={`settings-tab-${t.key}`}
            className={`shrink-0 h-12 px-4 rounded-lg border-2 border-[color:var(--admin-primary)] text-base font-bold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--admin-primary)] ${active ? 'bg-[color:var(--admin-primary)] text-white hover:brightness-90' : 'bg-white text-[color:var(--admin-primary)] hover:bg-[color-mix(in_srgb,var(--admin-primary)_10%,white)]'}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}


function CalendarSyncCard() {
  const [feedUrl, setFeedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const buildUrl = (feedPath) => `${process.env.REACT_APP_BACKEND_URL}${feedPath}`;

  const loadLink = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/calendar/link`);
      setFeedUrl(buildUrl(res.data.feed_path));
    } catch {
      toast.error('Errore nel generare il link calendario');
    } finally {
      setLoading(false);
    }
  };

  const resetLink = async () => {
    if (!window.confirm('Il link attuale smetterà di funzionare. Continuare?')) return;
    setResetting(true);
    try {
      const res = await api.post(`${API}/calendar/link/reset`);
      setFeedUrl(buildUrl(res.data.feed_path));
      toast.success('Nuovo link generato');
    } catch {
      toast.error('Errore nel rigenerare il link');
    } finally {
      setResetting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      toast.success('Link copiato!');
    } catch {
      toast.error('Impossibile copiare il link');
    }
  };

  return (
    <div className="space-y-3">
      {feedUrl ? (
        <div className="flex flex-wrap gap-2">
          <Input readOnly value={feedUrl} className={`flex-1 min-w-[220px] font-mono ${FIELD} text-sm`} aria-label="Link feed calendario" />
          <Button type="button" onClick={copyLink} variant="outline" className={BTN_OUTLINE} aria-label="Copia link calendario">
            Copia
          </Button>
          <Button type="button" onClick={resetLink} disabled={resetting} variant="outline" className="h-11 min-h-[44px] px-5 rounded-lg font-bold text-base border-2 border-red-400 text-red-700 bg-white hover:bg-red-50 hover:text-red-700" aria-label="Rigenera link calendario">
            {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rigenera link'}
          </Button>
        </div>
      ) : (
        <Button type="button" onClick={loadLink} disabled={loading} className={BTN_PRIMARY}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CalendarDays className="w-4 h-4 mr-2" />}
          Genera link calendario
        </Button>
      )}
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
const MONTH_NAMES = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

export default function SettingsPage() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [makeWebhookUrl, setMakeWebhookUrl] = useState('');
  const [savingMakeWebhook, setSavingMakeWebhook] = useState(false);
  const [adminTheme, setAdminTheme] = useState({
    primary: '#C8617A', sidebar_bg: '#FAF7F2', sidebar_text: '#2D1B14',
    accent: '#D4A847', font_display: 'Cormorant Garamond', font_body: 'Poppins',
    content_bg: '#F8F5F0', content_text: '#2D1B14'
  });
  const [savingTheme, setSavingTheme] = useState(false);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [newBlock, setNewBlock] = useState({ type: 'recurring', day_of_week: 'lunedì', date: '', day_of_month: 1, month_of_year: 1, start_time: '13:00', end_time: '14:00', reason: '' });
  const [savingBlock, setSavingBlock] = useState(false);
  // Calendario blocco
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-based
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [calForm, setCalForm] = useState({ start_time: '09:00', end_time: '18:00', reason: '', all_day: true });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [cloudApiTest, setCloudApiTest] = useState(null);
  const [testingCloudApi, setTestingCloudApi] = useState(false);
  const [templatesList, setTemplatesList] = useState({ loading: false, data: null, error: null });
  const [mergingDups, setMergingDups] = useState(false);
  const [tab, setTab] = useState(readStoredTab);
  const [saveStatus, setSaveStatus] = useState(null);
  const [pwStatus, setPwStatus] = useState(null);
  const [makeStatus, setMakeStatus] = useState(null);

  const changeTab = (key) => {
    setTab(key);
    try { localStorage.setItem(TAB_STORAGE_KEY, key); } catch { /* storage non disponibile */ }
  };

  const handleMergeDuplicates = async () => {
    if (!window.confirm('Unire tutti i clienti con lo stesso nome? Gli appuntamenti e i pagamenti dei duplicati verranno spostati su un unico cliente. Operazione consigliata, ma non reversibile.')) return;
    setMergingDups(true);
    try {
      const res = await api.post('/clients/merge-duplicates');
      const d = res.data || {};
      if (d.groups_merged > 0) {
        toast.success(`✅ Uniti ${d.groups_merged} gruppi di duplicati — ${d.clients_removed} clienti rimossi, ${d.appointments_moved} appuntamenti riassegnati.`, { duration: 8000 });
      } else {
        toast.success('Nessun cliente duplicato trovato — tutto in ordine!');
      }
    } catch {
      toast.error('Errore durante l\'unione dei duplicati. Riprova.');
    }
    setMergingDups(false);
  };

  useEffect(() => {
    fetchSettings();
    fetchBlockedSlots();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get(`${API}/settings`);
      setSettings(res.data);
      if (res.data.admin_theme) setAdminTheme(res.data.admin_theme);
      if (res.data.cloud_api_configured) setCloudApiTest({ ok: true, message: '✅ WhatsApp Cloud API configurata e attiva' });

      const configRes = await api.get(`${API}/social/config`);
      setMakeWebhookUrl(configRes.data.make_webhook_url || '');
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

  const testCloudApi = async () => {
    setTestingCloudApi(true);
    setCloudApiTest(null);
    try {
      const res = await api.get(`${API}/settings/cloud-api-test`);
      setCloudApiTest(res.data);
    } catch { setCloudApiTest({ ok: false, message: 'Errore di connessione al server' }); }
    finally { setTestingCloudApi(false); }
  };

  const fetchCloudApiTemplates = async () => {
    setTemplatesList({ loading: true, data: null, error: null });
    try {
      const res = await api.get(`${API}/settings/cloud-api-templates`);
      if (res.data?.ok) {
        setTemplatesList({ loading: false, data: res.data, error: null });
      } else {
        setTemplatesList({ loading: false, data: null, error: res.data?.error || 'Errore Meta' });
      }
    } catch (e) {
      setTemplatesList({ loading: false, data: null, error: e?.response?.data?.detail || e.message });
    }
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
      setNewBlock({ type: 'recurring', day_of_week: 'lunedì', date: '', day_of_month: 1, month_of_year: 1, start_time: '13:00', end_time: '14:00', reason: '' });
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
    setSaveStatus(null);
    try {
      const res = await api.put(`${API}/settings`, {
        salon_name: settings.salon_name,
        name: settings.name,
        opening_time: settings.opening_time,
        closing_time: settings.closing_time,
        working_days: settings.working_days,
        google_review_link: settings.google_review_link,
        auto_backup_enabled: settings.auto_backup_enabled,
        auto_backup_email: settings.auto_backup_email,
        monthly_target: settings.monthly_target ? parseFloat(settings.monthly_target) : null,
        make_webhook_url: makeWebhookUrl,
      });
      updateUser({ name: settings.name, salon_name: settings.salon_name });
      setSaveStatus({ ok: true, message: 'Impostazioni salvate' });
      toast.success('Impostazioni salvate!');
    } catch (err) {
      const msg = getErrorMessage(err, 'Errore nel salvataggio');
      setSaveStatus({ ok: false, message: msg });
      toast.error(msg);
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
    setPwStatus(null);
    try {
      await api.put(`${API}/auth/change-password`, {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password
      });
      setPwStatus({ ok: true, message: 'Password cambiata con successo' });
      toast.success('Password cambiata con successo!');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      const msg = getErrorMessage(err, 'Errore nel cambio password');
      setPwStatus({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setChangingPw(false);
    }
  };

  const saveMakeWebhookUrl = async () => {
    setSavingMakeWebhook(true);
    setMakeStatus(null);
    try {
      await api.put(`${API}/social/config`, { make_webhook_url: makeWebhookUrl });
      setMakeStatus({ ok: true, message: 'Webhook salvato' });
      toast.success('Webhook Make salvato!');
    } catch (err) {
      const msg = getErrorMessage(err, 'Errore nel salvataggio webhook');
      setMakeStatus({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setSavingMakeWebhook(false);
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
        <div>
          <h1 className="font-display font-bold text-3xl sm:text-[40px] leading-tight text-[#2D2326]">Impostazioni</h1>
          <p className="text-base text-[#7C5C4A] mt-1">Gestisci le impostazioni del tuo salone</p>
        </div>

        <SettingsTabs value={tab} onChange={changeTab} />

        <div role="tabpanel" id="settings-panel" aria-labelledby={`settings-tab-${tab}`} className="space-y-6">
          {tab === 'salone' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <SectionCard icon={User} title="Profilo" description="I tuoi dati di accesso. L'email non si può modificare.">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="settings-name">Il tuo nome</Label>
                    <Input
                      id="settings-name"
                      value={settings.name || ''}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      data-testid="settings-name-input"
                      className={FIELD}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-email">Email</Label>
                    <Input
                      id="settings-email"
                      value={settings.email || ''}
                      disabled
                      className={`${FIELD} opacity-70`}
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={Building2} title="Salone" description="Nome, recensioni e obiettivo di incasso mostrato in dashboard.">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="settings-salon-name">Nome del salone</Label>
                    <Input
                      id="settings-salon-name"
                      value={settings.salon_name || ''}
                      onChange={(e) => setSettings({ ...settings, salon_name: e.target.value })}
                      data-testid="settings-salon-name-input"
                      className={FIELD}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-monthly-target">Obiettivo incasso mensile (€)</Label>
                    <Input
                      id="settings-monthly-target"
                      type="number"
                      min="0"
                      step="100"
                      value={settings.monthly_target || ''}
                      onChange={(e) => setSettings({ ...settings, monthly_target: e.target.value })}
                      placeholder="es. 3000"
                      className={FIELD}
                    />
                    <p className="text-sm text-[#7C5C4A]">Imposta un target e vedrai il progresso in dashboard ogni giorno</p>
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor="settings-google-review">Link recensioni Google</Label>
                    <Input
                      id="settings-google-review"
                      value={settings.google_review_link || ''}
                      onChange={(e) => setSettings({ ...settings, google_review_link: e.target.value })}
                      placeholder="https://search.google.com/local/writereview?placeid=..."
                      data-testid="settings-google-review-input"
                      className={FIELD}
                    />
                    <p className="text-sm text-[#7C5C4A]">Cerca il tuo salone su Google Maps → Condividi → Copia link recensione</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={Clock} title="Orari di apertura" description="Orario del salone e giorni in cui si lavora. Valgono per il Planning e per le prenotazioni online.">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="settings-opening-time">Apertura</Label>
                    <Input
                      id="settings-opening-time"
                      type="time"
                      value={settings.opening_time || '09:00'}
                      onChange={(e) => setSettings({ ...settings, opening_time: e.target.value })}
                      data-testid="settings-opening-time-input"
                      className={FIELD}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-closing-time">Chiusura</Label>
                    <Input
                      id="settings-closing-time"
                      type="time"
                      value={settings.closing_time || '19:00'}
                      onChange={(e) => setSettings({ ...settings, closing_time: e.target.value })}
                      data-testid="settings-closing-time-input"
                      className={FIELD}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Giorni lavorativi</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {DAYS.map((day) => {
                      const isActive = settings.working_days?.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => toggleDay(day.value)}
                          data-testid={`day-toggle-${day.value}`}
                          className={`flex items-center gap-2 min-h-[44px] px-3 rounded-lg border-2 text-left text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-primary)] ${
                            isActive
                              ? 'bg-[color-mix(in_srgb,var(--admin-primary)_10%,transparent)] border-[color:var(--admin-primary)] text-[color:var(--admin-primary)] font-semibold'
                              : 'bg-[#FAF7F2] border-transparent text-[#2D1B14] hover:border-[#F0E6DC]'
                          }`}
                        >
                          <span className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center ${isActive ? 'bg-[color:var(--admin-primary)] border-[color:var(--admin-primary)]' : 'border-gray-300 bg-white'}`}>
                            {isActive && <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />}
                          </span>
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </SectionCard>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="sm:flex-1"><StatusNote status={saveStatus} /></div>
                <Button
                  type="submit"
                  disabled={saving}
                  data-testid="save-settings-btn"
                  className={`${BTN_PRIMARY} w-full sm:w-auto sm:px-8`}
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" aria-hidden="true" />
                      Salva Impostazioni
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {tab === 'orari' && (
            <>
              <SectionCard icon={Lock} title="Blocco orari" description="Tocca i giorni nel calendario per bloccarli. Le festività italiane sono evidenziate.">
              <div className="rounded-2xl border border-[#F0E6DC] overflow-hidden">
                {/* Navigazione mese */}
                <div className="flex items-center justify-between px-4 py-3 bg-[color-mix(in_srgb,var(--admin-accent)_16%,white)] border-b border-[#F0E6DC]">
                  <button type="button" aria-label="Mese precedente" onClick={calPrevMonth} className="w-11 h-11 rounded-full hover:bg-white/70 flex items-center justify-center transition-colors">
                    <ChevronLeft className="w-4 h-4 text-[#7C5C4A]" />
                  </button>
                  <div className="text-center">
                    <p className="font-bold text-[#2D1B14] capitalize">
                      {new Date(calYear, calMonth, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1 text-sm text-[#7C5C4A]"><span className="w-2.5 h-2.5 rounded-sm bg-amber-300 inline-block" /> Festività</span>
                      <span className="flex items-center gap-1 text-sm text-[#7C5C4A]"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Bloccato</span>
                      <span className="flex items-center gap-1 text-sm text-[#7C5C4A]"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block" /> Ricorrente</span>
                      <span className="flex items-center gap-1 text-sm text-[#7C5C4A]"><span className="w-2.5 h-2.5 rounded-sm bg-[color:var(--admin-primary)] inline-block" /> Selezionato</span>
                    </div>
                  </div>
                  <button type="button" aria-label="Mese successivo" onClick={calNextMonth} className="w-11 h-11 rounded-full hover:bg-white/70 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4 text-[#7C5C4A]" />
                  </button>
                </div>

                {/* Pulsanti rapidi */}
                <div className="flex flex-wrap gap-2 px-4 py-2 bg-[#FAF7F2] border-b border-[#F0E6DC]">
                  <button type="button" onClick={selectHolidaysInMonth}
                    className={BTN_CHIP}>
                    Aggiungi festività del mese
                  </button>
                  <button type="button" onClick={selectAllInMonth}
                    className={BTN_CHIP}>
                    <CalendarDays className="w-3 h-3" /> Seleziona tutto il mese
                  </button>
                  {selectedDates.size > 0 && (
                    <button type="button" onClick={() => setSelectedDates(new Set())}
                      className={BTN_CHIP}>
                      <X className="w-3 h-3" /> Deseleziona tutto
                    </button>
                  )}
                </div>

                {/* Griglia calendario */}
                <div className="p-3">
                  {/* Intestazione giorni */}
                  <div className="grid grid-cols-7 mb-1">
                    {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d => (
                      <div key={d} className="text-center text-sm font-bold text-[#7C5C4A] uppercase py-1">{d}</div>
                    ))}
                  </div>
                  {/* Celle giorni */}
                  <div className="grid grid-cols-7 gap-1">
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

                        let bg = 'bg-white hover:bg-[color-mix(in_srgb,var(--admin-primary)_8%,white)]';
                        let text = 'text-[#2D1B14]';
                        let border = 'border border-[#F0E6DC]';

                        if (isSelected) { bg = 'bg-[color:var(--admin-primary)]'; text = 'text-white'; border = 'border border-[color:var(--admin-primary)]'; }
                        else if (isBlocked && !isRecurringBlocked) { bg = 'bg-red-400 hover:bg-red-500'; text = 'text-white'; border = 'border border-red-500'; }
                        else if (isRecurringBlocked) { bg = 'bg-orange-400 hover:bg-orange-500'; text = 'text-white'; border = 'border border-orange-500'; }
                        else if (isHoliday) { bg = 'bg-amber-100 hover:bg-amber-200'; text = 'text-amber-900'; border = 'border border-amber-300'; }
                        else if (isSunday) { bg = 'bg-slate-50 hover:bg-slate-100'; text = 'text-slate-500'; }

                        cells.push(
                          <button type="button" type="button"
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
                            className={`relative rounded-lg text-sm font-semibold h-11 flex flex-col items-center justify-center transition-all ${bg} ${text} ${border} cursor-pointer ${isToday && !isSelected ? 'ring-2 ring-[color:var(--admin-primary)] ring-offset-1' : ''} ${isEditing ? 'ring-2 ring-orange-400 ring-offset-1' : ''}`}
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
                  <div className="border-t border-[#F0E6DC] bg-[color-mix(in_srgb,var(--admin-primary)_6%,white)] px-4 py-3 space-y-3">
                    <p className="text-sm font-bold text-[color:var(--admin-primary)]">
                      {selectedDates.size} giorn{selectedDates.size === 1 ? 'o selezionato' : 'i selezionati'} — imposta il blocco:
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div
                          onClick={() => setCalForm(f => ({...f, all_day: !f.all_day}))}
                          className={`w-10 h-5 rounded-full transition-colors relative ${calForm.all_day ? 'bg-[color:var(--admin-primary)]' : 'bg-gray-300'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${calForm.all_day ? 'left-5' : 'left-0.5'}`} />
                        </div>
                        <span className="text-sm font-semibold text-[#2D1B14]">Giornata intera</span>
                      </label>
                      {!calForm.all_day && (
                        <>
                          <div className="flex items-center gap-1">
                            <Label className="text-sm text-[#7C5C4A]">Da</Label>
                            <Input type="time" value={calForm.start_time}
                              onChange={e => setCalForm(f => ({...f, start_time: e.target.value}))}
                              className="w-24 text-sm h-11" />
                          </div>
                          <div className="flex items-center gap-1">
                            <Label className="text-sm text-[#7C5C4A]">A</Label>
                            <Input type="time" value={calForm.end_time}
                              onChange={e => setCalForm(f => ({...f, end_time: e.target.value}))}
                              className="w-24 text-sm h-11" />
                          </div>
                        </>
                      )}
                      <Input placeholder="Motivo (es. Ferie, Festività...)"
                        value={calForm.reason}
                        onChange={e => setCalForm(f => ({...f, reason: e.target.value}))}
                        className="flex-1 min-w-[160px] text-sm h-11" />
                      <Button onClick={bulkBlockDates} disabled={bulkSaving}
                        className={`${BTN_PRIMARY} shrink-0`}>
                        {bulkSaving
                          ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Salvo...</>
                          : <><Lock className="w-4 h-4 mr-1" /> Blocca {selectedDates.size} giorn{selectedDates.size === 1 ? 'o' : 'i'}</>}
                      </Button>
                    </div>
                    {/* Elenco giorni selezionati */}
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {[...selectedDates].sort().map(d => (
                        <span key={d} className="flex items-center gap-1 bg-[color-mix(in_srgb,var(--admin-primary)_10%,transparent)] text-[color:var(--admin-primary)] text-sm font-semibold px-2 py-0.5 rounded-full border border-[color-mix(in_srgb,var(--admin-primary)_20%,transparent)]">
                          {d.slice(8)}/{d.slice(5,7)}
                          
                          <button type="button" onClick={() => setSelectedDates(prev => { const n = new Set(prev); n.delete(d); return n; })} aria-label={`Rimuovi ${d.slice(8)}/${d.slice(5,7)}`} className="hover:text-red-600 ml-0.5 -my-3 -mr-2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center">×</button>
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
                            <span className="ml-1.5 text-sm font-semibold text-orange-600">Giornata intera</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${editingBlock.slot.type === 'recurring' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                            {editingBlock.slot.type === 'recurring' ? `Ogni ${editingBlock.slot.day_of_week}` : 'Una tantum'}
                          </span>
                          {editingBlock.slot.reason && <span className="text-sm text-[#7C5C4A]">{editingBlock.slot.reason}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="sm" variant="ghost"
                          onClick={() => { deleteBlockedSlot(editingBlock.slot.id); setEditingBlock(null); }}
                          className="text-red-500 hover:bg-red-100 h-11 px-3 text-sm font-bold">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Elimina
                        </Button>
                        <button type="button" onClick={() => setEditingBlock(null)}
                          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </SectionCard>

              <SectionCard icon={Lock} title="Blocca orari ricorrenti" description="Blocca una fascia oraria che si ripete (es. pausa pranzo). Vale sia sul Planning che sulle prenotazioni online.">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                  <Label className="text-sm font-semibold block mb-1">Tipo</Label>
                  <select value={newBlock.type} onChange={e => setNewBlock(b => ({ ...b, type: e.target.value }))}
                    className="w-full px-3 border rounded-lg text-base h-11 bg-white">
                    <option value="recurring">Ogni settimana</option>
                    <option value="daily">Ogni giorno</option>
                    <option value="monthly">Ogni mese</option>
                    <option value="yearly">Ogni anno</option>
                  </select>
                </div>
                {newBlock.type === 'recurring' && (
                  <div>
                    <Label className="text-sm font-semibold block mb-1">Giorno</Label>
                    <select value={newBlock.day_of_week} onChange={e => setNewBlock(b => ({ ...b, day_of_week: e.target.value }))}
                      className="w-full px-3 border rounded-lg text-base h-11 bg-white">
                      {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                )}
                {(newBlock.type === 'monthly' || newBlock.type === 'yearly') && (
                  <div>
                    <Label className="text-sm font-semibold block mb-1">Giorno del mese</Label>
                    <Input type="number" min={1} max={31} value={newBlock.day_of_month}
                      onChange={e => setNewBlock(b => ({ ...b, day_of_month: parseInt(e.target.value) || 1 }))}
                      className="w-full h-11" />
                  </div>
                )}
                {newBlock.type === 'yearly' && (
                  <div>
                    <Label className="text-sm font-semibold block mb-1">Mese</Label>
                    <select value={newBlock.month_of_year} onChange={e => setNewBlock(b => ({ ...b, month_of_year: parseInt(e.target.value) }))}
                      className="w-full px-3 border rounded-lg text-base h-11 bg-white">
                      {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-semibold block mb-1">Da</Label>
                  <Input type="time" value={newBlock.start_time} onChange={e => setNewBlock(b => ({ ...b, start_time: e.target.value }))} className="w-full h-11" />
                </div>
                <div>
                  <Label className="text-sm font-semibold block mb-1">A</Label>
                  <Input type="time" value={newBlock.end_time} onChange={e => setNewBlock(b => ({ ...b, end_time: e.target.value }))} className="w-full h-11" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm font-semibold block mb-1">Motivo (opzionale)</Label>
                  <Input placeholder="es. Pausa pranzo" value={newBlock.reason} onChange={e => setNewBlock(b => ({ ...b, reason: e.target.value }))} className="h-11" />
                </div>
                <Button onClick={addBlockedSlot} disabled={savingBlock} className={BTN_PRIMARY}>
                  {savingBlock ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Lock className="w-4 h-4 mr-1" />} Blocca
                </Button>
              </div>

              <div className="space-y-1.5">
                {blockedSlots.filter(s => s.type !== 'one-time').length === 0 && (
                  <p className="text-sm text-[#7C5C4A]">Nessun orario ricorrente bloccato.</p>
                )}
                {blockedSlots.filter(s => s.type !== 'one-time').map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-2 bg-[#FAF7F2] border border-[#F0E6DC] rounded-lg px-3 py-2">
                    <div className="text-sm">
                      <span className="font-bold text-[#2D1B14]">{s.start_time}–{s.end_time}</span>
                      <span className="text-[#7C5C4A] ml-2">
                        {s.type === 'recurring' && `ogni ${s.day_of_week}`}
                        {s.type === 'daily' && 'ogni giorno'}
                        {s.type === 'monthly' && `ogni mese il ${s.day_of_month}`}
                        {s.type === 'yearly' && `ogni anno il ${s.day_of_month}/${s.month_of_year}`}
                      </span>
                      {s.reason && <span className="text-[#7C5C4A] italic ml-2">— {s.reason}</span>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteBlockedSlot(s.id)} className="text-red-600 hover:bg-red-50 h-11 px-3 text-sm font-bold shrink-0">
                      <Unlock className="w-3.5 h-3.5 mr-1" /> Sblocca
                    </Button>
                  </div>
                ))}
              </div>
              </SectionCard>
            </>
          )}

          {tab === 'messaggi' && (
            <SectionCard icon={Share2} title="WhatsApp Cloud API" description="Il collegamento con Meta per i messaggi ai clienti. Token e Phone Number ID sono già impostati su Render: qui controlli solo che tutto funzioni.">
              <div>
                <Button type="button" onClick={testCloudApi} disabled={testingCloudApi} className={BTN_PRIMARY}>
                  {testingCloudApi ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Verifica stato
                </Button>
              </div>
              {cloudApiTest && <StatusNote status={{ ok: !!cloudApiTest.ok, message: cloudApiTest.message }} />}
              <div className="border-t border-[#F0E6DC] pt-4 space-y-3">
                <div>
                  <p className="text-base font-semibold text-[#2D1B14]">Template approvati su Meta</p>
                  <p className="text-sm text-[#7C5C4A]">Richiede la variabile <code>WHATSAPP_BUSINESS_ACCOUNT_ID</code> su Render. Mostra nome, stato (APPROVED/PENDING/REJECTED), lingua e numero di parametri.</p>
                </div>
                <Button type="button" onClick={fetchCloudApiTemplates} disabled={templatesList.loading} variant="outline" className={BTN_OUTLINE} title="Mostra tutti i template registrati su Meta (con stato approvazione)">
                  {templatesList.loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Lista template Meta
                </Button>
                {templatesList.error && (
                  <div className="mt-2 p-2 rounded bg-red-50 text-red-700 text-sm border border-red-200">{templatesList.error}</div>
                )}
                {templatesList.data && (
                  <div className="mt-2 space-y-1 max-h-72 overflow-auto">
                    <p className="text-sm font-semibold text-[#2D1B14]">{templatesList.data.count} template trovati ({templatesList.data.approved?.length || 0} approvati)</p>
                    {templatesList.data.phone_belongs_to_this_waba === false && (
                      <div className="p-2 rounded border text-sm bg-red-50 border-red-300 text-red-800 font-medium">
                        ❌ Il numero di invio (Phone Number ID {templatesList.data.sending_phone_id}) NON appartiene a questo WhatsApp Business Account — i template qui sopra non sono utilizzabili per l'invio da questo numero, anche se "approvati". Verifica WHATSAPP_BUSINESS_ACCOUNT_ID su Render.
                      </div>
                    )}
                    {templatesList.data.phone_belongs_to_this_waba === true && (
                      <div className="p-2 rounded border text-sm bg-green-50 border-green-300 text-green-800">✅ Numero di invio verificato: appartiene a questo WABA.</div>
                    )}
                    {templatesList.data.all?.map((t, i) => (
                      <div key={i} className={`p-2 rounded border text-sm ${t.status === 'APPROVED' ? 'bg-green-50 border-green-200' : t.status === 'REJECTED' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1">
                          <code className="font-bold break-all">{t.name}</code>
                          <span className="font-medium">{t.status} · {t.category} · {t.language} · {t.param_count} var</span>
                        </div>
                        {t.body_text && <div className="text-sm text-gray-600 mt-1 line-clamp-2">{t.body_text}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {tab === 'collegamenti' && (
            <>
              <SectionCard icon={CalendarDays} title="Sincronizza calendario" description="Genera un link da inserire una sola volta come «calendario da URL» su Google Calendar o iPhone: da quel momento ogni appuntamento apparirà automaticamente sul telefono.">
                <CalendarSyncCard />
              </SectionCard>

              <SectionCard icon={Share2} title="Make.com — post social" description="Incolla l'URL del webhook di Make.com per pubblicare i post su Instagram, Facebook e TikTok. Lo trovi in Make.com → scenario dei post social → webhook.">
                <div className="space-y-2">
                  <Label htmlFor="settings-make-webhook">Webhook URL Make.com</Label>
                  <Input
                    id="settings-make-webhook"
                    type="url"
                    placeholder="https://hook.make.com/..."
                    value={makeWebhookUrl}
                    onChange={(e) => setMakeWebhookUrl(e.target.value)}
                    className={`${FIELD} font-mono text-sm`}
                  />
                  <p className="text-sm text-[#7C5C4A]">
                    L'URL deve iniziare con <code className="bg-gray-100 px-1 rounded">https://hook.make.com/</code>. Le immagini dei post vengono caricate automaticamente su Cloudinary.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={saveMakeWebhookUrl}
                    disabled={savingMakeWebhook || !makeWebhookUrl.trim()}
                    className={BTN_PRIMARY}
                  >
                    {savingMakeWebhook ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvo...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" aria-hidden="true" /> Salva webhook</>
                    )}
                  </Button>
                  {makeStatus
                    ? <StatusNote status={makeStatus} />
                    : makeWebhookUrl && (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-800">
                        <Check className="w-4 h-4" aria-hidden="true" /> Configurato
                      </span>
                    )}
                </div>
              </SectionCard>

              <SectionCard icon={User} title="Manutenzione dati" description={'Se una cliente appare due volte in rubrica o risulta "assente" pur essendo venuta, potrebbe esserci un doppione. Questo strumento unisce i clienti con lo stesso nome e riassegna i loro appuntamenti a un unico profilo.'}>
                <Button
                  type="button"
                  onClick={handleMergeDuplicates}
                  disabled={mergingDups}
                  className={BTN_PRIMARY}
                  data-testid="merge-duplicates-btn"
                >
                  {mergingDups ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Unione in corso…</>
                  ) : (
                    <><Check className="w-4 h-4 mr-2" aria-hidden="true" /> Trova e unisci clienti duplicati</>
                  )}
                </Button>
              </SectionCard>

              <SectionCard icon={Save} title="Backup" description="I backup si gestiscono nella pagina Backup">
                <Button type="button" onClick={() => navigate('/backup')} className={BTN_PRIMARY}>
                  Vai ai Backup
                </Button>
              </SectionCard>
            </>
          )}

          {tab === 'account' && (
            <>
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
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={saveAdminTheme} disabled={savingTheme}
                className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white px-8 min-h-[44px]" data-testid="save-admin-theme-btn">
                {savingTheme ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salva Tema</>}
              </Button>
              <Button variant="outline" onClick={() => {
                const def = { primary: '#C8617A', sidebar_bg: '#FAF7F2', sidebar_text: '#2D1B14', accent: '#D4A847', font_display: 'Cormorant Garamond', font_body: 'Poppins', content_bg: '#F8F5F0', content_text: '#2D1B14' };
                setAdminTheme(def); applyAdminTheme(def);
                toast.success('Tema ripristinato — salva per confermare');
              }} className="text-[#7C5C4A] min-h-[44px]" data-testid="reset-admin-theme-btn">
                <RotateCcw className="w-4 h-4 mr-2" /> Ripristina Default
              </Button>
            </div>
          </CardContent>
        </Card>

              <SectionCard icon={Lock} title="Cambia password" description="Scegli una nuova password di almeno 6 caratteri.">
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="settings-current-password">Password attuale</Label>
                    <Input
                      id="settings-current-password"
                      type="password"
                      value={pwForm.current_password}
                      onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                      placeholder="Inserisci password attuale"
                      required
                      autoComplete="current-password"
                      data-testid="current-password-input"
                      className={FIELD}
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="settings-new-password">Nuova password</Label>
                      <Input
                        id="settings-new-password"
                        type="password"
                        value={pwForm.new_password}
                        onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                        placeholder="Minimo 6 caratteri"
                        required
                        autoComplete="new-password"
                        data-testid="new-password-input"
                        className={FIELD}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-confirm-password">Conferma nuova password</Label>
                      <Input
                        id="settings-confirm-password"
                        type="password"
                        value={pwForm.confirm_password}
                        onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                        placeholder="Ripeti nuova password"
                        required
                        autoComplete="new-password"
                        data-testid="confirm-password-input"
                        className={FIELD}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      disabled={changingPw}
                      className={BTN_PRIMARY}
                      data-testid="change-password-btn"
                    >
                      {changingPw ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
                          Cambia password
                        </>
                      )}
                    </Button>
                    <StatusNote status={pwStatus} />
                  </div>
                </form>
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
