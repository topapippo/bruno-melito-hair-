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
      <div className="relative w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Personalizza Navigazione</h2>
            <p className="text-xs text-slate-500 mt-0.5">Sposta le voci tra sidebar e dashboard, riordina la sidebar</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
            <X className="w-4 h-4 text-slate-500" />
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
                  <h3 className="font-bold text-sm text-slate-800">Barra Laterale</h3>
                  <p className="text-[10px] text-slate-400">Sempre visibile. Trascina per riordinare</p>
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
                      className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                        dragOver === path ? 'border-[#0EA5E9] bg-[#0EA5E9]/5' 
                        : dragItem === path ? 'opacity-40 border-slate-200' 
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                      }`}
                      data-testid={`sidebar-item-${path.slice(1)}`}>
                      {!isDashboard && (
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 cursor-grab flex-shrink-0" />
                      )}
                      {isDashboard && <div className="w-3.5" />}
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: mod.color + '15' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: mod.color }} />
                      </div>
                      <span className="flex-1 text-sm font-semibold text-slate-700">{mod.label}</span>
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
                  <h3 className="font-bold text-sm text-slate-800">Dashboard</h3>
                  <p className="text-[10px] text-slate-400">Card nella pagina Dashboard</p>
                </div>
              </div>
              <div className="space-y-1" data-testid="dashboard-items">
                {dashboard.map(path => {
                  const mod = getModule(path);
                  if (!mod) return null;
                  const Icon = mod.icon;
                  return (
                    <div key={path}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-all"
                      data-testid={`dashboard-item-${path.slice(1)}`}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: mod.color + '15' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: mod.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-slate-700">{mod.label}</span>
                        <p className="text-[10px] text-slate-400 truncate">{mod.desc}</p>
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
                  <p className="text-center text-sm text-slate-400 py-6">Dashboard vuota — sposta qui le voci dalla sidebar</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={resetDefaults}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Ripristina predefiniti
          </button>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 rounded-lg transition-colors">
              Annulla
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#0EA5E9] text-white text-sm font-bold rounded-lg hover:bg-[#0284C7] disabled:opacity-50 transition-all"
              data-testid="save-nav-config-btn">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Salvo...' : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
