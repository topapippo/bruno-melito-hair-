import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { user, loading, serverWaking } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-5">
        <Loader2 className="w-10 h-10 animate-spin text-[#C8617A]" />
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
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
