import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Scissors, Sparkles, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '', name: '', salon_name: '' });

  useEffect(() => {
    if (searchParams.get('session') === 'expired') {
      toast.warning('Sessione scaduta. Effettua nuovamente il login.');
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userData = await login(loginData.email, loginData.password);
      toast.success(`Ciao ${userData?.name || 'benvenuto'}, buon lavoro!`);
      navigate('/');
    } catch (err) {
      if (err.code === 'ECONNABORTED' || !err.response) {
        toast.error('Il server si sta avviando, riprova tra qualche secondo...');
      } else {
        toast.error(err.response?.data?.detail || 'Credenziali non valide');
      }
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(registerData.email, registerData.password, registerData.name, registerData.salon_name);
      toast.success('Account creato! Benvenuta 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore di registrazione');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — immagine del salone */}
      <div className="hidden lg:flex lg:w-1/2 relative items-end justify-start overflow-hidden">
        <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="absolute inset-0 w-full h-full object-cover" />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#2D1B14]/80 via-[#2D1B14]/30 to-transparent" />
        {/* Decorative dots */}
        <div className="absolute top-10 right-10 w-32 h-32 rounded-full border border-white/10" />
        <div className="absolute top-20 right-20 w-16 h-16 rounded-full border border-white/10" />
        {/* Brand text */}
        <div className="relative z-10 p-12 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-0.5 bg-[#D4A847]" />
            <span className="text-[#D4A847] text-xs font-bold uppercase tracking-[4px]">Dal 1983</span>
          </div>
          <h2 className="font-display text-5xl font-semibold text-white leading-tight mb-2">
            Bruno Melito<br /><em>Hair</em>
          </h2>
          <p className="text-white/70 text-lg">Gestisci il tuo salone con eleganza</p>
          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            {['Agenda Smart', 'Card Prepagate', 'Booking Online', 'Statistiche'].map(f => (
              <span key={f} className="text-xs bg-white/10 backdrop-blur-sm border border-white/20 text-white px-3 py-1.5 rounded-full">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#FAF7F2]">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg">
              <img src="/logo.png?v=4" alt="" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#D4A847]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#9C7060]">Gestionale</span>
            </div>
            <h1 className="font-display text-4xl font-semibold text-[#2D1B14] italic">Ciao Bruno</h1>
            <p className="text-[#7C5C4A] text-sm mt-1">Buon lavoro!</p>
            <p className="text-[#9C7060] mt-1 text-sm">Accedi al tuo salone</p>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="w-full mb-6 bg-[#F0E6DC] rounded-xl p-1">
              <TabsTrigger value="login" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#C8617A] data-[state=active]:shadow-sm text-[#9C7060]">
                Accedi
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#C8617A] data-[state=active]:shadow-sm text-[#9C7060]">
                Registrati
              </TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="text-[#5C3D30] text-sm font-medium mb-1.5 block">Email</Label>
                  <Input
                    type="email" required placeholder="tua@email.it"
                    value={loginData.email} onChange={e => setLoginData(p => ({...p, email: e.target.value}))}
                    className="rounded-xl border-[#E8D5C8] bg-white focus:border-[#C8617A] focus:ring-[#C8617A]/20 h-11"
                  />
                </div>
                <div>
                  <Label className="text-[#5C3D30] text-sm font-medium mb-1.5 block">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPass ? 'text' : 'password'} required placeholder="••••••••"
                      value={loginData.password} onChange={e => setLoginData(p => ({...p, password: e.target.value}))}
                      className="rounded-xl border-[#E8D5C8] bg-white focus:border-[#C8617A] focus:ring-[#C8617A]/20 h-11 pr-10"
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C7060] hover:text-[#C8617A]">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white rounded-xl shadow-[0_4px_14px_rgba(200,97,122,0.35)] font-semibold mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Scissors className="w-4 h-4 mr-2" />}
                  Accedi
                </Button>
              </form>
            </TabsContent>

            {/* REGISTER */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                {[
                  { key: 'name', label: 'Il tuo nome', placeholder: 'Es. Maria', type: 'text' },
                  { key: 'salon_name', label: 'Nome del salone', placeholder: 'Es. Hair Studio Roma', type: 'text' },
                  { key: 'email', label: 'Email', placeholder: 'tua@email.it', type: 'email' },
                  { key: 'password', label: 'Password (min. 6 caratteri)', placeholder: '••••••••', type: 'password' },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-[#5C3D30] text-sm font-medium mb-1.5 block">{f.label}</Label>
                    <Input
                      type={f.type} required placeholder={f.placeholder}
                      value={registerData[f.key]} onChange={e => setRegisterData(p => ({...p, [f.key]: e.target.value}))}
                      className="rounded-xl border-[#E8D5C8] bg-white focus:border-[#C8617A] h-11"
                    />
                  </div>
                ))}
                <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white rounded-xl shadow-[0_4px_14px_rgba(200,97,122,0.35)] font-semibold mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Crea Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <p className="text-center text-xs text-[#9C7060] mt-8">
            Bruno Melito Hair · Gestionale Professionale
          </p>
        </div>
      </div>
    </div>
  );
}
