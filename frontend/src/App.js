import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useEffect, useState, lazy, Suspense } from "react";

// CONTEXT LOGIN
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// PAGINE - Eager load (homepage)
import WebsitePage from "./pages/WebsitePage";
import LoginPage from "./pages/LoginPage";

// PAGINE - Lazy load (admin/gestionale)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const MonthlyView = lazy(() => import("./pages/MonthlyView"));
const WeeklyView = lazy(() => import("./pages/WeeklyView"));
const AppointmentsPage = lazy(() => import("./pages/AppointmentsPage"));
const OperatorsPage = lazy(() => import("./pages/OperatorsPage"));
const PlanningPage = lazy(() => import("./pages/PlanningPage"));
const PrepaidCardsPage = lazy(() => import("./pages/PrepaidCardsPage"));
const CardAlertsPage = lazy(() => import("./pages/CardAlertsPage"));
const ReportIncassiPage = lazy(() => import("./pages/ReportIncassiPage"));
const BackupPage = lazy(() => import("./pages/BackupPage"));
const LoyaltyPage = lazy(() => import("./pages/LoyaltyPage"));
const RemindersPage = lazy(() => import("./pages/RemindersPage"));
const DailySummaryPage = lazy(() => import("./pages/DailySummaryPage"));
const WebsiteAdminPage = lazy(() => import("./pages/WebsiteAdminPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const PromotionsPage = lazy(() => import("./pages/PromotionsPage"));
const BookingPage = lazy(() => import("./pages/BookingPage"));

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
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center py-2 text-sm z-50 font-medium">
      Modalità Offline - I dati mostrati potrebbero non essere aggiornati
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OfflineIndicator />
      <BrowserRouter basename="/">
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" /></div>}>
        <Routes>
          {/* LOGIN (non protetto) */}
          <Route path="/login" element={<LoginPage />} />

          {/* HOME = Sito Web Pubblico */}
          <Route path="/" element={<WebsitePage />} />

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

          {/* VISTA MENSILE */}
          <Route
            path="/month"
            element={
              <ProtectedRoute>
                <MonthlyView />
              </ProtectedRoute>
            }
          />

          {/* VISTA SETTIMANALE */}
          <Route
            path="/week"
            element={
              <ProtectedRoute>
                <WeeklyView />
              </ProtectedRoute>
            }
          />

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

          {/* PRENOTAZIONE ONLINE - Redirect alla home (prenotazione integrata) */}
          <Route path="/prenota" element={<Navigate to="/" replace />} />

          {/* PROGRAMMA FEDELTÀ */}
          <Route
            path="/loyalty"
            element={
              <ProtectedRoute>
                <LoyaltyPage />
              </ProtectedRoute>
            }
          />

          {/* PROMEMORIA & RICHIAMI */}
          <Route
            path="/reminders"
            element={
              <ProtectedRoute>
                <RemindersPage />
              </ProtectedRoute>
            }
          />

          {/* STORICO */}
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
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

          {/* SITO WEB PUBBLICO - Redirect alla home */}
          <Route path="/sito" element={<Navigate to="/" replace />} />

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
        </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#fff',
            border: '1px solid #E6CCB2',
            color: '#44403C',
          },
        }}
      />
    </AuthProvider>
  );
}
