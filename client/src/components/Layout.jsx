import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="mobile-container bg-white">
      <main className="flex-1 overflow-y-auto">{children}</main>
      <nav className="border-t border-gray-100 bg-white px-6 py-3 flex items-center justify-around sticky bottom-0 z-10">
        <NavLink
          to="/home"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-sage-600' : 'text-gray-400'
            }`
          }
        >
          <HomeIcon />
          <span>Home</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-sage-600' : 'text-gray-400'
            }`
          }
        >
          <ProfileIcon />
          <span>Profilo</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          <LogoutIcon />
          <span>Esci</span>
        </button>
      </nav>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
