import { useState } from 'react';
import type { FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  PackagePlus,
  Search,
  Tags,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Rutas hijas que tienen su propia pestaña y por tanto no deben encender esta. */
  exclude?: string;
}

const NAV: NavEntry[] = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/productos', label: 'Productos', icon: Package, exclude: '/productos/nuevo' },
  { to: '/productos/nuevo', label: 'Nuevo producto', icon: PackagePlus },
  { to: '/movimientos/nuevo', label: 'Registrar movimiento', icon: ArrowLeftRight },
  { to: '/movimientos', label: 'Historial', icon: History, exclude: '/movimientos/nuevo' },
  { to: '/categorias', label: 'Categorías', icon: Tags },
  { to: '/stock-bajo', label: 'Stock bajo', icon: AlertTriangle },
];

const todayText = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());
const todayLabel = todayText.charAt(0).toUpperCase() + todayText.slice(1);

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [search, setSearch] = useState('');

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = search.trim();
    navigate(term ? `/productos?search=${encodeURIComponent(term)}` : '/productos');
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <img src="/brand/logo_vise_oscuro.png" alt="VISE Ltda" />
        </div>

        <nav className="sidebar__nav" aria-label="Principal">
          {NAV.map(({ to, label, icon: Icon, end, exclude }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-item${isActive && !(exclude && pathname.startsWith(exclude)) ? ' nav-item--active' : ''}`
              }
            >
              <Icon size={19} strokeWidth={2.1} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <span className="avatar">{initials(user?.name ?? '')}</span>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <button type="button" className="nav-item nav-item--logout" onClick={logout}>
            <LogOut size={19} strokeWidth={2.1} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <form className="search" onSubmit={submitSearch} role="search">
            <Search size={18} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto por nombre o SKU"
              aria-label="Buscar producto"
            />
          </form>
          <time className="topbar__date">{todayLabel}</time>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
