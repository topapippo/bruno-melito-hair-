import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Users, Euro, Calendar, Clock, TrendingUp, Plus, ChevronRight,
  Scissors, UserCheck, CalendarDays, CalendarRange, BarChart3,
  CreditCard, Gift, Bell, Download, Globe, Settings, AlertTriangle,
  MessageCircle, X
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { ALL_MODULES, DEFAULT_DASHBOARD, getModule } from '../utils/navModules';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardAlerts, setCardAlerts] = useState({ expiring: [], low_balance: [], total: 0 });
  const [showAlerts, setShowAlerts] = useState(true);
  const [dashboardPaths, setDashboardPaths] = useState(() => {
    try {
      const saved = localStorage.getItem('mbhs_dashboard');
      return saved ? JSON.parse(saved) : DEFAULT_DASHBOARD;
    } catch { return DEFAULT_DASHBOARD; }
  });
  const navigate = useNavigate();

  useEffect(() => { 
    fetchDashboardStats(); 
    fetchCardAlerts();
    loadNavConfig();

    // Listen for nav config changes from NavConfigurator
    const handleStorage = (e) => {
      if (e.key === 'mbhs_dashboard') {
        try {
          setDashboardPaths(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // Custom event for same-tab updates
    const handleNavUpdate = () => loadNavConfig();
    window.addEventListener('nav-config-updated', handleNavUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('nav-config-updated', handleNavUpdate);
    };
  }, []);

  const loadNavConfig = async () => {
    try {
      const res = await axios.get(`${API}/nav-config`);
      if (res.data.dashboard) {
        setDashboardPaths(res.data.dashboard);
        localStorage.setItem('mbhs_dashboard', JSON.stringify(res.data.dashboard));
      }
    } catch {}
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await axios.get(`${API}/stats/dashboard`);
      setStats(res.data);
    } catch (err) { console.error('Error fetching stats:', err); }
    finally { setLoading(false); }
  };

  const fetchCardAlerts = async () => {
    try {
      const res = await axios.get(`${API}/cards/alerts/all?days=7&threshold_percent=20`);
      setCardAlerts({
        expiring: res.data.expiring_cards || [],
        low_balance: res.data.low_balance_cards || [],
        total: res.data.total_alerts || 0
      });
    } catch (err) { console.error('Error fetching card alerts:', err); }
  };

  const sendQuickWhatsApp = (card, type) => {
    if (!card.client_phone) {
      toast.error('Numero di telefono non disponibile');
      return;
    }
    let phone = card.client_phone.replace(/[\s\-\+]/g, '');
    if (!phone.startsWith('39')) phone = '39' + phone;
    
    let message = type === 'expiring' 
      ? `Ciao ${card.client_name}! 👋 La tua card "${card.name}" scade tra ${card.days_until_expiry} giorni. Affrettati a usare il credito di €${card.remaining_value?.toFixed(2)}!`
      : `Ciao ${card.client_name}! 👋 Il credito della tua card "${card.name}" è quasi esaurito (€${card.remaining_value?.toFixed(2)}). Vieni a ricaricarla!`;
    
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    toast.success('WhatsApp aperto!');
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (<Skeleton key={i} className="h-32" />))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8" data-testid="dashboard-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="font-playfair text-3xl md:text-4xl font-medium" style={{ color: 'var(--gold)' }}>Buongiorno!</h1>
            <p className="mt-1 font-manrope" style={{ color: 'var(--text-secondary)' }}>{format(new Date(), "EEEE d MMMM yyyy", { locale: it })}</p>
          </div>
          <Link to="/appointments">
            <Button data-testid="new-appointment-btn" className="text-[var(--bg-deep)] font-bold shadow-lg transition-all active:scale-95 glow-gold-hover"
              style={{ background: 'var(--gold)' }}>
              <Plus className="w-5 h-5 mr-2" /> Nuovo Appuntamento
            </Button>
          </Link>
        </div>

        {/* Daily Card Alerts Banner */}
        {showAlerts && cardAlerts.total > 0 && (
          <div className="glass rounded-xl p-4 animate-slide-down" style={{ borderColor: 'var(--amber)' }} data-testid="daily-alerts-banner">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
                  <Bell className="w-5 h-5" style={{ color: 'var(--amber)' }} />
                </div>
                <div>
                  <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--amber)' }}>
                    <AlertTriangle className="w-4 h-4" />
                    Promemoria - {cardAlerts.total} Avvisi Card
                  </h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {cardAlerts.expiring.length > 0 && `${cardAlerts.expiring.length} card in scadenza`}
                    {cardAlerts.expiring.length > 0 && cardAlerts.low_balance.length > 0 && ' · '}
                    {cardAlerts.low_balance.length > 0 && `${cardAlerts.low_balance.length} credito basso`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cardAlerts.expiring.slice(0, 3).map(card => (
                      <div key={card.id} className="flex items-center gap-2 glass rounded-lg px-3 py-1.5">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{card.client_name}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.2)', color: 'var(--amber)' }}>{card.days_until_expiry}g</span>
                        {card.client_phone && (
                          <button onClick={() => sendQuickWhatsApp(card, 'expiring')}
                            className="w-6 h-6 rounded-full flex items-center justify-center transition-all" style={{ background: 'var(--emerald)' }}>
                            <MessageCircle className="w-3.5 h-3.5 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to="/card-alerts">
                  <Button size="sm" style={{ background: 'var(--amber)', color: 'var(--bg-deep)' }} className="font-bold">Vedi Tutti</Button>
                </Link>
                <button onClick={() => setShowAlerts(false)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/5">
                  <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
          {[
            { title: "Appuntamenti Oggi", value: stats?.today_appointments_count || 0, icon: Calendar, color: 'var(--cyan)' },
            { title: "Clienti Totali", value: stats?.total_clients || 0, icon: Users, color: 'var(--emerald)' },
            { title: "Incasso Mensile", value: `\u20AC${(stats?.monthly_revenue || 0).toFixed(0)}`, icon: Euro, color: 'var(--gold)', sub: `${stats?.monthly_appointments || 0} appuntamenti` },
            { title: "Prossimi 7 Giorni", value: stats?.upcoming_appointments?.length || 0, icon: TrendingUp, color: 'var(--violet)' },
          ].map((s, i) => (
            <div key={i} className="glass rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 glow-gold-hover cursor-default">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-manrope" style={{ color: 'var(--text-muted)' }}>{s.title}</p>
                  <p className="text-3xl font-playfair font-medium mt-2" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                  {s.sub && <p className="text-xs mt-1 font-manrope" style={{ color: 'var(--text-muted)' }}>{s.sub}</p>}
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                  <s.icon className="w-6 h-6" style={{ color: s.color }} strokeWidth={1.5} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modules Grid */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          <h2 className="font-playfair text-xl mb-4" style={{ color: 'var(--text-primary)' }}>Moduli</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 stagger-children">
            {dashboardPaths.map(path => {
              const mod = getModule(path);
              if (!mod) return null;
              const Icon = mod.icon;
              return (
                <div
                  key={mod.path}
                  data-testid={`module-${mod.path.slice(1)}`}
                  onClick={() => navigate(mod.path)}
                  className="glass rounded-xl p-4 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 group"
                  style={{ '--glow-color': mod.color }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 20px ${mod.color}30`}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${mod.color}15` }}>
                    <Icon className="w-6 h-6" style={{ color: mod.color }} strokeWidth={1.5} />
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{mod.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{mod.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Appointments + Upcoming */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
          <div className="lg:col-span-8 glass rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="font-playfair text-xl" style={{ color: 'var(--text-primary)' }}>Appuntamenti di Oggi</h2>
              <Link to="/planning"><Button variant="ghost" size="sm" style={{ color: 'var(--cyan)' }}>Vedi tutti <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
            </div>
            <div className="px-6 pb-6">
              {stats?.today_appointments?.length > 0 ? (
                <div className="space-y-2">
                  {stats.today_appointments.map((apt) => (
                    <div key={apt.id} data-testid={`appointment-${apt.id}`}
                      className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-white/[0.03]"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      <div className="flex-shrink-0 w-16 text-center">
                        <p className="text-lg font-medium font-manrope" style={{ color: 'var(--cyan)' }}>{apt.time}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{apt.end_time}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{apt.client_name}</p>
                        <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{apt.services.map(s => s.name).join(', ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold" style={{ color: 'var(--gold)' }}>{'\u20AC'}{apt.total_price}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{apt.total_duration} min</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
                  <p className="font-manrope" style={{ color: 'var(--text-secondary)' }}>Nessun appuntamento per oggi</p>
                  <Link to="/appointments"><Button variant="outline" className="mt-4" style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>Prenota un appuntamento</Button></Link>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 glass rounded-xl overflow-hidden">
            <div className="p-6 pb-4">
              <h2 className="font-playfair text-xl" style={{ color: 'var(--text-primary)' }}>Prossimi Appuntamenti</h2>
            </div>
            <div className="px-6 pb-6">
              {stats?.upcoming_appointments?.length > 0 ? (
                <div className="space-y-3">
                  {stats.upcoming_appointments.slice(0, 5).map((apt) => (
                    <div key={apt.id} className="flex items-center gap-3 py-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{apt.client_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(apt.date), "EEE d MMM", { locale: it })} - {apt.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>Nessun appuntamento in programma</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
