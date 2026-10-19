import { useState, useEffect, useCallback } from 'react';
import api, { API, getErrorMessage } from '../lib/api';
import { fetchCategories } from '../lib/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowUp, ArrowDown, Check, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const COLOR_PRESETS = [
  '#0EA5E9', '#0284C7', '#10B981', '#14B8A6', '#E9C46A', '#F59E0B',
  '#F97316', '#EF4444', '#EC4899', '#C084FC', '#6366F1', '#64748B',
];

function ColorPicker({ value, onChange, label }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {COLOR_PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Colore ${c}`}
          aria-pressed={value?.toUpperCase() === c}
          onClick={() => onChange(c)}
          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
            value?.toUpperCase() === c ? 'border-[#0F172A] scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

/**
 * Finestra "Gestisci categorie" della pagina Servizi.
 * Ogni azione salva subito sul server e aggiorna l'elenco condiviso (planning, statistiche, sito...).
 * `onChanged` serve alla pagina per ricaricare i servizi (es. dopo uno spostamento).
 */
export default function CategoriesManager({ open, onOpenChange, onChanged }) {
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const [openPicker, setOpenPicker] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [moveTo, setMoveTo] = useState('altro');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchCategories();
      setItems(list);
      setDrafts({});
    } catch (err) {
      toast.error(getErrorMessage(err, 'Errore nel caricamento delle categorie'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const registered = items.filter((c) => !c.legacy);
  const legacy = items.filter((c) => c.legacy);

  const run = async (key, fn, successMsg) => {
    setBusy(key);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Operazione non riuscita'));
    } finally {
      setBusy(null);
    }
  };

  const draftOf = (c) => drafts[c.value] || { label: c.label, color: c.color };
  const isChanged = (c) => {
    const d = draftOf(c);
    return d.label.trim() !== c.label || d.color.toUpperCase() !== c.color.toUpperCase();
  };
  const setDraft = (c, patch) =>
    setDrafts((prev) => ({ ...prev, [c.value]: { ...draftOf(c), ...patch } }));

  const handleAdd = () => {
    if (!newLabel.trim()) {
      toast.error('Scrivi il nome della nuova categoria');
      return;
    }
    run('new', async () => {
      await api.post(`${API}/service-categories`, { label: newLabel.trim(), color: newColor });
      setNewLabel('');
    }, 'Categoria aggiunta');
  };

  const handleSave = (c) => {
    const d = draftOf(c);
    run(c.value, () => api.put(`${API}/service-categories/${encodeURIComponent(c.value)}`, {
      label: d.label.trim(),
      color: d.color,
    }), 'Categoria aggiornata');
  };

  const handleMove = (index, direction) => {
    const order = registered.map((c) => c.value);
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    run(`move-${index}`, () => api.post(`${API}/service-categories/reorder`, { order }));
  };

  const handleAdopt = (c) => {
    const label = c.value.charAt(0).toUpperCase() + c.value.slice(1);
    run(c.value, () => api.post(`${API}/service-categories`, {
      label,
      color: c.color,
      value: c.value,
    }), 'Categoria aggiunta all\'elenco');
  };

  const askDelete = (c) => {
    setToDelete(c);
    setMoveTo(registered.find((x) => x.value === 'altro') ? 'altro' : (registered.find((x) => x.value !== c.value)?.value || ''));
  };

  const confirmDelete = () => {
    const c = toDelete;
    if (!c) return;
    run(c.value, () => api.delete(`${API}/service-categories/${encodeURIComponent(c.value)}`, {
      params: c.service_count > 0 ? { move_to: moveTo } : {},
    }), 'Categoria eliminata');
    setToDelete(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[560px] max-h-[88vh] overflow-y-auto" data-testid="categories-manager">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-[#2D1B14]">Gestisci categorie</DialogTitle>
            <DialogDescription>
              Aggiungi, rinomina, colora e riordina le categorie. Le modifiche valgono ovunque:
              agenda, statistiche e sito di prenotazione.
            </DialogDescription>
          </DialogHeader>

          {loading && items.length === 0 ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#C8617A]" /></div>
          ) : (
            <div className="space-y-3 mt-2">
              {registered.map((c, index) => {
                const d = draftOf(c);
                return (
                  <div key={c.value} className="rounded-xl border border-[#F0E6DC] p-3 space-y-2" data-testid={`category-row-${c.value}`}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Cambia colore di ${c.label}`}
                        onClick={() => setOpenPicker(openPicker === c.value ? null : c.value)}
                        className="w-7 h-7 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: d.color }}
                      />
                      <Input
                        value={d.label}
                        maxLength={40}
                        aria-label={`Nome della categoria ${c.label}`}
                        onChange={(e) => setDraft(c, { label: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter' && isChanged(c)) handleSave(c); }}
                        className="bg-[#FAF7F2] border-transparent focus:border-[#C8617A]"
                      />
                      <Badge variant="outline" className="shrink-0 border-[#F0E6DC] text-[#7C5C4A]" title="Servizi in questa categoria">
                        {c.service_count}
                      </Badge>
                    </div>
                    {openPicker === c.value && (
                      <ColorPicker value={d.color} onChange={(color) => setDraft(c, { color })} label={`Colori per ${c.label}`} />
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <Button type="button" size="icon" variant="ghost" aria-label={`Sposta su ${c.label}`}
                          disabled={index === 0 || busy !== null} onClick={() => handleMove(index, -1)}>
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" aria-label={`Sposta giù ${c.label}`}
                          disabled={index === registered.length - 1 || busy !== null} onClick={() => handleMove(index, 1)}>
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        {isChanged(c) && (
                          <Button type="button" size="sm" disabled={busy !== null || !d.label.trim()}
                            onClick={() => handleSave(c)}
                            className="bg-gradient-to-r from-[#B0485F] to-[#A0404F] text-white">
                            {busy === c.value ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Salva</>}
                          </Button>
                        )}
                        {c.protected ? (
                          <span className="text-xs text-[#7C5C4A] px-2" title="Usata dal gestionale: si può rinominare ma non eliminare">fissa</span>
                        ) : (
                          <Button type="button" size="icon" variant="ghost" aria-label={`Elimina ${c.label}`}
                            disabled={busy !== null} onClick={() => askDelete(c)}
                            className="text-[#7C5C4A] hover:text-[#E76F51]">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {legacy.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2">
                  <p className="text-sm text-amber-900 font-medium">Categorie usate dai servizi ma non in elenco</p>
                  {legacy.map((c) => (
                    <div key={c.value} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-amber-900">{c.value} · {c.service_count} servizi</span>
                      <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => handleAdopt(c)}>
                        Aggiungi all'elenco
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-dashed border-[#C8617A]/50 p-3 space-y-2" data-testid="category-new">
                <p className="text-sm font-medium text-[#2D1B14]">Nuova categoria</p>
                <Input
                  value={newLabel}
                  maxLength={40}
                  placeholder="Es. Barba, Sposa, Bambini..."
                  aria-label="Nome della nuova categoria"
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                  className="bg-[#FAF7F2] border-transparent focus:border-[#C8617A]"
                  data-testid="category-new-input"
                />
                <ColorPicker value={newColor} onChange={setNewColor} label="Colori per la nuova categoria" />
                <Button type="button" onClick={handleAdd} disabled={busy !== null}
                  className="bg-gradient-to-r from-[#B0485F] to-[#A0404F] text-white" data-testid="category-add-btn">
                  {busy === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Aggiungi categoria</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina categoria «{toDelete?.label}»</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.service_count > 0
                ? `${toDelete.service_count} servizi usano questa categoria: scegli dove spostarli. Agenda e statistiche già registrate si aggiornano di conseguenza.`
                : 'Nessun servizio usa questa categoria. L\'azione non può essere annullata.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {toDelete?.service_count > 0 && (
            <Select value={moveTo} onValueChange={setMoveTo}>
              <SelectTrigger aria-label="Categoria di destinazione"><SelectValue /></SelectTrigger>
              <SelectContent>
                {registered.filter((c) => c.value !== toDelete.value).map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-[#E76F51] hover:bg-[#D55F41]">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
