import { NavLink } from 'react-router-dom';

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const TABS = [
  { to: '/', label: 'Aujourd’hui', end: true, d: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
  { to: '/paquets', label: 'Paquets', end: false, d: 'M4 7h12v13H4zM8 4h12v13' },
  { to: '/fiches', label: 'Fiches', end: false, d: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7' },
  { to: '/tableau', label: 'Tableau de bord', end: false, d: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  { to: '/reglages', label: 'Réglages', end: false, d: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4' },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      <div className="tabbar-inner">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
            {icon(t.d)}
            <span>{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
