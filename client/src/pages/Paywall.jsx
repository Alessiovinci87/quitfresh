import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PremiumGate from '../components/PremiumGate';

export default function Paywall() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex flex-col min-h-screen max-w-mobile mx-auto bg-white">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 shrink-0">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">QuitFresh</p>
          <p className="text-xs text-sage-600">{user?.email}</p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Profilo
        </button>
      </div>

      <div className="flex-1">
        <PremiumGate />
      </div>

      <div className="px-6 pb-6 pt-2 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full py-2.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Esci dall'account
        </button>
      </div>
    </div>
  );
}
