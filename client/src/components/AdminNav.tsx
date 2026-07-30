import { useLocation } from "wouter";
import {
  Shield, Users, Globe, AlertTriangle, Bell,
  LayoutDashboard, LogOut,
} from "lucide-react";

export type AdminSection = 'dashboard' | 'alerts' | 'users' | 'errors' | 'surfspots';

interface AdminNavProps {
  /** Which nav item is currently active */
  activeSection: AdminSection | 'user-detail';
  /** Called when a nav item is clicked. If omitted, falls back to wouter navigation. */
  onSectionChange?: (section: AdminSection) => void;
  onLogout: () => void;
}

const NAV_ITEMS: { id: AdminSection; label: string; short: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard',     short: 'Home',   icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: 'alerts',    label: 'Alert Testing', short: 'Alerts', icon: <Bell className="h-5 w-5" />            },
  { id: 'users',     label: 'User Database', short: 'Users',  icon: <Users className="h-5 w-5" />           },
  { id: 'errors',    label: 'Error Logs',    short: 'Errors', icon: <AlertTriangle className="h-5 w-5" />   },
  { id: 'surfspots', label: 'Surf Spots',    short: 'Spots',  icon: <Globe className="h-5 w-5" />           },
];

export default function AdminNav({ activeSection, onSectionChange, onLogout }: AdminNavProps) {
  const [, navigate] = useLocation();

  const handleClick = (id: AdminSection) => {
    if (onSectionChange) {
      onSectionChange(id);
    } else {
      navigate(`/admin?view=${id}`);
    }
  };

  const isActive = (id: AdminSection) =>
    id === activeSection || (id === 'users' && activeSection === 'user-detail');

  return (
    <>
      {/* ── Desktop: fixed left sidebar ──────────────────────────────── */}
      <aside className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-50 flex-col gap-1 bg-background/95 backdrop-blur border rounded-2xl shadow-xl p-2 w-52">
        <div className="flex items-center gap-2 px-3 py-2 mb-1 border-b">
          <Shield className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="font-semibold text-sm truncate">LiveSwell Admin</span>
        </div>

        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full text-left
              ${isActive(item.id)
                ? 'bg-blue-600 text-white'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}

        <div className="mt-1 border-t pt-1">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full text-left"
            data-testid="button-admin-logout"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile: floating bottom bar ──────────────────────────────── */}
      <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-background/95 backdrop-blur border rounded-2xl shadow-xl px-2 py-2">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${isActive(item.id)
                ? 'bg-blue-600 text-white'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            {item.icon}
            {item.short}
          </button>
        ))}
        <button
          onClick={onLogout}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Out
        </button>
      </nav>
    </>
  );
}
