import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, ChevronUp, ChevronDown, X, Save, RotateCcw, GripVertical } from 'lucide-react';
import { ALL_MODULES, DEFAULT_SIDEBAR, DEFAULT_DASHBOARD, getModule } from '../utils/navModules';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NavConfigurator({ open, onClose, onSave }) {
  const [sidebar, setSidebar] = useState([]);
  const [dashboard, setDashboard] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dragItem, setDragItem] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => {
    if (open) loadConfig();
  }, [open]);

  const loadConfig = async () => {
    try {
      const res = await axios.get(`${API}/nav-config`);
      setSidebar(res.data.sidebar || DEFAULT_SIDEBAR);
      setDashboard(res.data.dashboard || DEFAULT_DASHBOARD);
    } catch {
      setSidebar([...DEFAULT_SIDEBAR]);
      setDashboard([...DEFAULT_DASHBOARD]);
    }
  };

  const moveToSidebar = (path) => {
    setDashboard(d => d.filter(p => p !== path));
    setSidebar(s => [...s, path]);
  };

  const moveToDashboard = (path) => {
    if (path === '/dashboard') return;
    setSidebar(s => s.filter(p => p !== path));
    setDashboard(d => [...d, path]);
  };

  const moveUp = (path) => {
    setSidebar(s => {
      const idx = s.indexOf(path);
      if (idx <= 0) return s;
      const n = [...s];
      [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]];
      return n;
    });
  };

  const moveDown = (path) => {
    setSidebar(s => {
      const idx = s.indexOf(path);
      if (idx < 0 || idx >= s.length - 1) return s;
      const n = [...s];
      [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]];
      return n;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/nav-config`, { sidebar, dashboard });
      toast.success('Configurazione salvata!');
      localStorage.setItem('mbhs_sidebar', JSON.stringify(sidebar));
      localStorage.setItem('mbhs_dashboard', JSON.stringify(dashboard));
      window.dispatchEvent(new Event('nav-config-updated'));
      onSave({ sidebar, dashboard });
      onClose();
    } catch {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setSidebar([...DEFAULT_SIDEBAR]);
    setDashboard([...DEFAULT_DASHBOARD]);
    toast('Ripristinato layout predefinito');
  };

  // Drag handlers for sidebar reordering
  const handleDragStart = (e, path) => {
    setDragItem(path);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, path) => {
    e.preventDefault();
    setDragOver(path);
  };

  const handleDrop = (e, targetPath) => {
    e.preventDefault();
    if (!dragItem || dragItem === targetPath) {
      setDragItem(null);
      setDragOver(null);
      return;
    }
    setSidebar(s => {
      const n = s.filter(p => p !== dragItem);
      const targetIdx = n.indexOf(targetPath);
      n.splice(targetIdx, 0, dragItem);
      return n;
    });
    setDragItem(null);
    setDragOver(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" data-testid="nav-configurator">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl mx-4 rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--gold)' }}>Personalizza Navigazione</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Sposta le voci tra sidebar e dashboard, riordina la sidebar</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: 'var(--bg-elevated)' }}>
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sidebar Column */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-8 rounded-full bg-[#0EA5E9]" />
                <div>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Barra Laterale</h3>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Sempre visibile. Trascina per riordinare</p>
                </div>
              </div>
              <div className="space-y-1" data-testid="sidebar-items">
                {sidebar.map((path, idx) => {
                  const mod = getModule(path);
                  if (!mod) return null;
                  const Icon = mod.icon;
                  const isDashboard = path === '/dashboard';
                  return (
                    <div key={path}
                      draggable={!isDashboard}
                      onDragStart={e => handleDragStart(e, path)}
                      onDragOver={e => handleDragOver(e, path)}
                      onDrop={e => handleDrop(e, path)}
                      onDragEnd={() => { setDragItem(null); setDragOver(null); }}
                      className={`flex items-center gap-2 p-2.5 rounded-lg transition-all ${
                        dragOver === path ? 'border border-[var(--gold)]' 
                        : dragItem === path ? 'opacity-40' 
                        : ''
                      }`}
                      style={{ background: dragOver === path ? 'var(--gold-dim)' : 'var(--bg-elevated)', border: `1px solid var(--border-subtle)` }}
                      data-testid={`sidebar-item-${path.slice(1)}`}>
                      {!isDashboard && (
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 cursor-grab flex-shrink-0" />
                      )}
                      {isDashboard && <div className="w-3.5" />}
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: mod.color + '15' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: mod.color }} />
                      </div>
                      <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{mod.label}</span>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={() => moveUp(path)} disabled={idx === 0}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-200 disabled:opacity-20 transition-all">
                          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <button onClick={() => moveDown(path)} disabled={idx === sidebar.length - 1}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-200 disabled:opacity-20 transition-all">
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        {!isDashboard && (
                          <button onClick={() => moveToDashboard(path)}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-50 transition-all group"
                            title="Sposta in Dashboard">
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dashboard Column */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-8 rounded-full bg-[#E9C46A]" />
                <div>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Dashboard</h3>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Card nella pagina Dashboard</p>
                </div>
              </div>
              <div className="space-y-1" data-testid="dashboard-items">
                {dashboard.map(path => {
                  const mod = getModule(path);
                  if (!mod) return null;
                  const Icon = mod.icon;
                  return (
                    <div key={path}
                      className="flex items-center gap-2 p-2.5 rounded-lg transition-all"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                      data-testid={`dashboard-item-${path.slice(1)}`}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: mod.color + '15' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: mod.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{mod.label}</span>
                        <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{mod.desc}</p>
                      </div>
                      <button onClick={() => moveToSidebar(path)}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-blue-50 transition-all group flex-shrink-0"
                        title="Sposta in Sidebar">
                        <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0EA5E9]" />
                      </button>
                    </div>
                  );
                })}
                {dashboard.length === 0 && (
                  <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>Dashboard vuota — sposta qui le voci dalla sidebar</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 rounded-b-2xl" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <button onClick={resetDefaults}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors" style={{ color: 'var(--text-muted)' }}>
            <RotateCcw className="w-3.5 h-3.5" /> Ripristina predefiniti
          </button>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
              Annulla
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-lg disabled:opacity-50 transition-all"
              style={{ background: 'var(--gold)', color: 'var(--bg-deep)' }}
              data-testid="save-nav-config-btn">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Salvo...' : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
