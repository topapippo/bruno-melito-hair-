import { useState, useEffect } from 'react';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { Users, Plus, Edit2, Trash2, Loader2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { adminBarStyle, adminCardStyle, adminBtnPrimaryStyle, adminIconBg, adminBorder, adminTextMuted, mix, BTN, BTN_ICON } from '../lib/adminUi';


const COLORS = [
  { value: '#0EA5E9', name: 'Rosa Antico' },
  { value: '#789F8A', name: 'Verde Salvia' },
  { value: '#E9C46A', name: 'Oro' },
  { value: '#334155', name: 'Grigio' },
  { value: '#E76F51', name: 'Corallo' },
  { value: '#264653', name: 'Blu Notte' },
  { value: '#9B59B6', name: 'Viola' },
  { value: '#3498DB', name: 'Azzurro' },
];

export default function OperatorsPage() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [operatorToDelete, setOperatorToDelete] = useState(null);
  const [editingOperator, setEditingOperator] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    color: '#0EA5E9'
  });

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    try {
      const res = await api.get(`${API}/operators`);
      setOperators(res.data);
    } catch (err) {
      console.error('Error fetching operators:', err);
      toast.error('Errore nel caricamento degli operatori');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Inserisci il nome dell\'operatore');
      return;
    }
    
    setSaving(true);
    try {
      if (editingOperator) {
        await api.put(`${API}/operators/${editingOperator.id}`, formData);
        toast.success('Operatore aggiornato!');
      } else {
        await api.post(`${API}/operators`, formData);
        toast.success('Operatore aggiunto!');
      }
      setDialogOpen(false);
      setEditingOperator(null);
      setFormData({ name: '', phone: '', color: '#0EA5E9' });
      fetchOperators();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (operator) => {
    setEditingOperator(operator);
    setFormData({
      name: operator.name,
      phone: operator.phone,
      color: operator.color
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (operator) => {
    try {
      await api.put(`${API}/operators/${operator.id}`, { active: !operator.active });
      toast.success(operator.active ? 'Operatore disattivato' : 'Operatore attivato');
      fetchOperators();
    } catch (err) {
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const handleDelete = async () => {
    if (!operatorToDelete) return;
    try {
      await api.delete(`${API}/operators/${operatorToDelete}`);
      toast.success('Operatore eliminato');
      setDeleteDialogOpen(false);
      setOperatorToDelete(null);
      fetchOperators();
    } catch (err) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const openNewDialog = () => {
    setEditingOperator(null);
    setFormData({ name: '', phone: '', color: '#0EA5E9' });
    setDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="operators-page">
        {/* Header */}
        <div className="rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={adminBarStyle}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={adminIconBg}>
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-medium adm-text">Operatori</h1>
              <p className="text-sm mt-0.5" style={adminTextMuted}>{operators.length} collaboratori</p>
            </div>
          </div>
          <Button
            onClick={openNewDialog}
            data-testid="new-operator-btn"
            className={`${BTN} text-white`}
            style={adminBtnPrimaryStyle}
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuovo Operatore
          </Button>
        </div>

        {/* Operators Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : operators.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fast">
            {operators.map((operator) => (
              <div
                key={operator.id}
                data-testid={`operator-card-${operator.id}`}
                className={`rounded-2xl p-4 sm:p-5 transition-transform duration-200 hover:-translate-y-0.5 ${
                  !operator.active ? 'opacity-60' : ''
                }`}
                style={adminCardStyle}
              >
                <Card className="border-0 bg-transparent shadow-none">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${operator.color}20` }}
                      >
                        <UserCircle 
                          className="w-7 h-7" 
                          style={{ color: operator.color }}
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium adm-text text-lg break-words">{operator.name}</h3>
                        {operator.phone && (
                          <p className="text-sm" style={adminTextMuted}>{operator.phone}</p>
                        )}
                      </div>
                    </div>
                    <div 
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: operator.color }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: adminBorder }}>
                    <div className="flex items-center gap-2 min-h-11">
                      <Switch
                        checked={operator.active}
                        onCheckedChange={() => handleToggleActive(operator)}
                        aria-label={`Attiva o disattiva ${operator.name}`}
                        className="relative after:absolute after:-inset-3 after:content-[''] data-[state=checked]:bg-[var(--admin-primary,#C8617A)]"
                      />
                      <span className="text-sm" style={adminTextMuted}>
                        {operator.active ? 'Attivo' : 'Inattivo'}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Modifica ${operator.name}`}
                        onClick={() => handleEdit(operator)}
                        className={`${BTN_ICON} adm-hover-primary`}
                        style={adminTextMuted}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Elimina ${operator.name}`}
                        onClick={() => {
                          setOperatorToDelete(operator.id);
                          setDeleteDialogOpen(true);
                        }}
                        className={`${BTN_ICON} hover:text-[#E76F51]`}
                        style={adminTextMuted}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
            <CardContent className="py-16 text-center">
              <Users className="w-16 h-16 mx-auto mb-4" style={{ color: mix('var(--admin-primary, #C8617A)', 35) }} strokeWidth={1.5} />
              <h3 className="font-display text-xl adm-text mb-2">Nessun operatore</h3>
              <p className="mb-4" style={adminTextMuted}>Aggiungi le tue collaboratrici</p>
              <Button
                onClick={openNewDialog}
                className={`${BTN} text-white`}
                style={adminBtnPrimaryStyle}
              >
                <Plus className="w-4 h-4 mr-2" /> Aggiungi Operatore
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl adm-text">
                {editingOperator ? 'Modifica Operatore' : 'Nuovo Operatore'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome operatore"
                  data-testid="operator-name-input"
                  className="h-11 text-sm adm-soft border-transparent adm-focus-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+39 ..."
                  data-testid="operator-phone-input"
                  className="h-11 text-sm adm-soft border-transparent adm-focus-primary"
                />
              </div>
              <div className="space-y-2">
                <Label>Colore Calendario</Label>
                <div className="grid grid-cols-4 gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-full h-11 rounded-xl transition-all ${
                        formData.color === color.value 
                          ? 'ring-2 ring-offset-2 ring-[#0F172A]' 
                          : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                      aria-label={color.name}
                    />
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={saving}
                  data-testid="save-operator-btn"
                  className={`${BTN} text-white`}
                  style={adminBtnPrimaryStyle}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingOperator ? 'Salva Modifiche' : 'Aggiungi Operatore'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Elimina Operatore</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicura di voler eliminare questo operatore? L'azione non può essere annullata.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-11">Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="min-h-11 bg-[#E76F51] hover:bg-[#D55F41]"
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
