import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user } = useAuth();
  return (
    <div className="mobile-container bg-cream-50">
      <main
        className="flex-1 overflow-y-auto pb-28"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {children}
      </main>
      <nav
        className="
          fixed bottom-0 left-0 right-0 z-10
          max-w-mobile mx-auto
          bg-white/85 backdrop-blur-md
          border-t border-gray-100/80
          shadow-[0_-4px_20px_rgba(15,23,42,0.04)]
          px-2 pt-2 pb-safe
          flex items-center justify-around gap-1
        "
      >
        <NavItem to="/home" label="Home" icon={<HomeIcon />} />
        <NavItem to="/stats" label="Progressi" icon={<StatsIcon />} />
        <NavItem to="/craving" label="Chat" icon={<ChatIcon />} />
        <NavItem to="/tools" label="Strumenti" icon={<ToolsIcon />} />
        <NavItem to="/diary" label="Diario" icon={<DiaryIcon />} />
        <NavItem to="/profile" label="Profilo" icon={<ProfileIcon />} />
        {user?.isAdmin && (
          <NavItem to="/admin/promo-codes" label="Admin" icon={<AdminIcon />} />
        )}
      </nav>
    </div>
  );
}

function NavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex flex-col items-center justify-center',
          'gap-0.5 min-w-0 flex-1',
          'rounded-xl py-1.5 px-1',
          'text-[10px] font-medium tracking-wide',
          'transition-all duration-200 ease-out',
          'active:scale-[0.94]',
          isActive
            ? 'text-sage-700 bg-sage-50'
            : 'text-gray-400 hover:text-gray-600',
        ].join(' ')
      }
    >
      <span aria-hidden="true">{icon}</span>
      <span className="truncate max-w-full">{label}</span>
    </NavLink>
  );
}

/* Icone — stroke più sottile (1.6) e line cap round per look più curato */
function HomeIcon() {
  return <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" /></svg>;
}
function ToolsIcon() {
  return <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
}
function DiaryIcon() {
  return <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
}
function ProfileIcon() {
  return <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function StatsIcon() {
  return <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18M6 20V10m6 10V4m6 16v-7" /></svg>;
}
function ChatIcon() {
  return <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>;
}
function AdminIcon() {
  return <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
}
