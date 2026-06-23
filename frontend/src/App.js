import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "sonner";

// CONTEXT LOGIN
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

// Pagine pubbliche — caricate subito (nessun login richiesto)
import LoginPage from "./pages/LoginPage";
import WebsitePage from "./pages/WebsitePage";
import ConfirmAppointmentPage from "./pages/ConfirmAppointmentPage";
import PrivacyPage from "./pages/PrivacyPage";
import PlanningPage from "./pages/PlanningPage";
import PWAInstallBanner from "./components/PWAInstallBanner";

// Pagine admin — lazy load: non vengono scaricate finché non servono
const Dashboard        = lazy(() => import("./pages/Dashboard"));
const StatsPage        = lazy(() => import("./pages/StatsPage"));
const ClientsPage      = lazy(() => import("./pages/ClientsPage"));
const ServicesPage     = lazy(() => import("./pages/ServicesPage"));
const SettingsPage     = lazy(() => import("./pages/SettingsPage"));
const AppointmentsPage = lazy(() => import("./pages/AppointmentsPage"));
const OperatorsPage    = lazy(() => import("./pages/OperatorsPage"));
const PrepaidCardsPage = lazy(() => import("./pages/PrepaidCardsPage"));
const CardAlertsPage   = lazy(() => import("./pages/CardAlertsPage"));
const ReportIncassiPage= lazy(() => import("./pages/ReportIncassiPage"));
const BackupPage       = lazy(() => import("./pages/BackupPage"));
const RemindersPage    = lazy(() => import("./pages/RemindersPage"));
const DailySummaryPage = lazy(() => import("./pages/DailySummaryPage"));
const WebsiteAdminPage = lazy(() => import("./pages/WebsiteAdminPage"));
const ExpensesPage     = lazy(() => import("./pages/ExpensesPage"));
const PromotionsPage   = lazy(() => import("./pages/PromotionsPage"));
const WaitlistPage          = lazy(() => import("./pages/WaitlistPage"));
const ClientiAssentiPage    = lazy(() => import("./pages/ClientiAssentiPage"));
const SocialPage            = lazy(() => import("./pages/SocialPage"));
const ServiceDetailPage     = lazy(() => import("./pages/ServiceDetailPage"));
const MessageLogsPage       = lazy(() => import("./pages/MessageLogsPage"));
const SellAbbonamentoPage   = lazy(() => import("./pages/SellAbbonamentoPage"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-9 h-9 border-4 border-[#C8617A] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Offline indicator component
function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connessione ripristinata!');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Sei offline. I dati potrebbero non essere aggiornati.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white text-center py-2 text-sm z-50 font-medium shadow-lg">
      Modalità Offline - I dati mostrati potrebbero non essere aggiornati
    </div>
  );
}

// Homepage: gestionale for logged-in users, login for visitors
function HomePage() {
  const { user, loading, serverWaking } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-5">
      <div className="w-10 h-10 border-4 border-[#C8617A] border-t-transparent rounded-full animate-spin" />
      {serverWaking ? (
        <div className="text-center px-6">
          <p className="text-[#2D1B14] font-bold text-lg">Server in avvio...</p>
          <p className="text-[#7C5C4A] text-sm mt-1">Il server si sta svegliando, attendi qualche secondo.</p>
          <p className="text-[#7C5C4A] text-sm">Non ricaricare la pagina.</p>
        </div>
      ) : (
        <p className="text-[#7C5C4A] text-sm font-medium">Caricamento...</p>
      )}
    </div>
  );
  if (user) return <PlanningPage />;
  // Non-authenticated users see the public website
  return <Navigate to="/sito" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <OfflineIndicator />
      <PWAInstallBanner />
      <BrowserRouter basename="/">
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* LOGIN (non protetto) */}
          <Route path="/login" element={<LoginPage />} />

          {/* HOME = Landing page per visitatori, Planning per loggati */}
          <Route path="/" element={<HomePage />} />

          {/* PLANNING dedicato */}
          <Route
            path="/planning"
            element={
              <ProtectedRoute>
                <PlanningPage />
              </ProtectedRoute>
            }
          />

          {/* DASHBOARD */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* AGENDA */}
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <AppointmentsPage />
              </ProtectedRoute>
            }
          />

          {/* /month e /week → reindirizzano a Planning (le viste sono già nelle tab) */}
          <Route path="/month" element={<ProtectedRoute><Navigate to="/" replace /></ProtectedRoute>} />
          <Route path="/week" element={<ProtectedRoute><Navigate to="/" replace /></ProtectedRoute>} />

          {/* STATISTICHE */}
          <Route
            path="/stats"
            element={
              <ProtectedRoute>
                <StatsPage />
              </ProtectedRoute>
            }
          />

          {/* CLIENTI */}
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <ClientsPage />
              </ProtectedRoute>
            }
          />

          {/* SERVIZI */}
          <Route
            path="/services"
            element={
              <ProtectedRoute>
                <ServicesPage />
              </ProtectedRoute>
            }
          />

          {/* OPERATORI */}
          <Route
            path="/operators"
            element={
              <ProtectedRoute>
                <OperatorsPage />
              </ProtectedRoute>
            }
          />

          {/* CARD / ABBONAMENTI */}
          <Route
            path="/cards"
            element={
              <ProtectedRoute>
                <PrepaidCardsPage />
              </ProtectedRoute>
            }
          />

          {/* AVVISI CARD (Scadenza / Credito Basso) */}
          <Route
            path="/card-alerts"
            element={
              <ProtectedRoute>
                <CardAlertsPage />
              </ProtectedRoute>
            }
          />

          {/* VENDI ABBONAMENTO — wizard 3 step */}
          <Route
            path="/vendi-abbonamento"
            element={
              <ProtectedRoute>
                <SellAbbonamentoPage />
              </ProtectedRoute>
            }
          />

          {/* REPORT INCASSI */}
          <Route
            path="/incassi"
            element={
              <ProtectedRoute>
                <ReportIncassiPage />
              </ProtectedRoute>
            }
          />

          {/* BACKUP */}
          <Route
            path="/backup"
            element={
              <ProtectedRoute>
                <BackupPage />
              </ProtectedRoute>
            }
          />

          {/* Privacy Policy — pubblica, per Meta app review */}
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* /prenota reindirizza a /sito */}
          <Route path="/prenota" element={<Navigate to="/sito" replace />} />

          {/* PROMEMORIA & RICHIAMI */}
          <Route
            path="/reminders"
            element={
              <ProtectedRoute>
                <RemindersPage />
              </ProtectedRoute>
            }
          />

          {/* IMPOSTAZIONI */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* RIEPILOGO GIORNALIERO */}
          <Route
            path="/daily-summary"
            element={
              <ProtectedRoute>
                <DailySummaryPage />
              </ProtectedRoute>
            }
          />

          {/* CONFERMA APPUNTAMENTO (pubblica, no auth) */}
          <Route path="/conferma/:token" element={<ConfirmAppointmentPage />} />

          {/* SITO WEB PUBBLICO */}
          <Route path="/sito" element={<WebsitePage />} />

          {/* PAGINE SEO SERVIZI (pubbliche) */}
          <Route path="/servizi/:slug" element={<ServiceDetailPage />} />

          {/* GESTIONE SITO WEB (admin) */}
          <Route
            path="/gestione-sito"
            element={
              <ProtectedRoute>
                <WebsiteAdminPage />
              </ProtectedRoute>
            }
          />

          {/* REGISTRO USCITE */}
          <Route
            path="/uscite"
            element={
              <ProtectedRoute>
                <ExpensesPage />
              </ProtectedRoute>
            }
          />

          {/* PROMOZIONI */}
          <Route
            path="/promozioni"
            element={
              <ProtectedRoute>
                <PromotionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/waitlist"
            element={
              <ProtectedRoute>
                <WaitlistPage />
              </ProtectedRoute>
            }
          />

          {/* CLIENTI ASSENTI */}
          <Route
            path="/clienti-assenti"
            element={
              <ProtectedRoute>
                <ClientiAssentiPage />
              </ProtectedRoute>
            }
          />

          {/* SOCIAL MEDIA */}
          <Route
            path="/social"
            element={
              <ProtectedRoute>
                <SocialPage />
              </ProtectedRoute>
            }
          />

          {/* LOG MESSAGGI (storico invii WhatsApp) */}
          <Route
            path="/log-messaggi"
            element={
              <ProtectedRoute>
                <MessageLogsPage />
              </ProtectedRoute>
            }
          />

        </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#fff',
            border: '1px solid #E8D5C8',
            color: '#2D1B14',
          },
        }}
      />
    </AuthProvider>
  );
}
