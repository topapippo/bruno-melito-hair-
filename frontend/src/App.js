import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useEffect, useState } from "react";

// CONTEXT LOGIN
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// PAGINE
import Dashboard from "./pages/Dashboard";
import StatsPage from "./pages/StatsPage";
import ClientsPage from "./pages/ClientsPage";
import ServicesPage from "./pages/ServicesPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import MonthlyView from "./pages/MonthlyView"; // mantenuto per route redirect
import WeeklyView from "./pages/WeeklyView"; // mantenuto per route redirect
import AppointmentsPage from "./pages/AppointmentsPage";
import OperatorsPage from "./pages/OperatorsPage";
import PlanningPage from "./pages/PlanningPage";
import PrepaidCardsPage from "./pages/PrepaidCardsPage";
import CardAlertsPage from "./pages/CardAlertsPage";
import ReportIncassiPage from "./pages/ReportIncassiPage";
import BackupPage from "./pages/BackupPage";
// BookingPage rimosso - usa WebsitePage (/sito)
import LoyaltyPage from "./pages/LoyaltyPage";
import RemindersPage from "./pages/RemindersPage";
import DailySummaryPage from "./pages/DailySummaryPage";
import WebsitePage from "./pages/WebsitePage";
import WebsiteAdminPage from "./pages/WebsiteAdminPage";
import ExpensesPage from "./pages/ExpensesPage";
import PromotionsPage from "./pages/PromotionsPage";
import LoginPage from "./pages/LoginPage";
import ConfirmAppointmentPage from "./pages/ConfirmAppointmentPage";
import PWAInstallBanner from "./components/PWAInstallBanner";
import { useAuth } from "./context/AuthContext";

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
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#C8617A] border-t-transparent rounded-full animate-spin" /></div>;
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

          {/* /prenota reindirizza a /sito */}
          <Route path="/prenota" element={<Navigate to="/sito" replace />} />

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

          {/* CONFERMA APPUNTAMENTO (pubblica, no auth) */}
          <Route path="/conferma/:token" element={<ConfirmAppointmentPage />} />

          {/* SITO WEB PUBBLICO */}
          <Route path="/sito" element={<WebsitePage />} />

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
