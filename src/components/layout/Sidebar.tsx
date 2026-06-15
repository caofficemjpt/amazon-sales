import { NavLink, useLocation } from 'react-router-dom';
import { usePeriodContext } from '../../context/PeriodContext';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  BarChart3,
  Coins,
  ClipboardList,
  UploadCloud,
  Settings,
  Package,
  LogOut,
  User,
} from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/', adminOnly: false },
  { icon: <BarChart3 size={18} />, label: 'Products', path: '/products', adminOnly: false },
  { icon: <Coins size={18} />, label: 'Financials', path: '/financials', adminOnly: false },
  { icon: <ClipboardList size={18} />, label: 'Orders', path: '/orders', adminOnly: false },
  { icon: <UploadCloud size={18} />, label: 'Upload Data', path: '/upload', adminOnly: true },
  { icon: <Settings size={18} />, label: 'Settings', path: '/settings', adminOnly: true },
] as const;

export function Sidebar() {
  const { state } = usePeriodContext();
  const { user, logout } = useAuth();
  const location = useLocation();

  // Filter navigation items based on user's role
  const visibleNavItems = NAV_ITEMS.filter(item => !item.adminOnly || user?.role === 'admin');

  return (
    <aside className="sidebar" aria-label="Main navigation">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <Package size={24} style={{ color: 'var(--color-primary-light)' }} />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-title">Amazon</span>
          <span className="sidebar-brand-subtitle">Sales Dashboard</span>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* Navigation */}
      <nav className="sidebar-nav">
        {visibleNavItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="sidebar-item-icon" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
                {item.icon}
              </span>
              <span className="sidebar-item-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer profile info & selected period badge */}
      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* User profile */}
        {user && (
          <div className="sidebar-user-profile" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-2) var(--space-3)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-xs)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <User size={14} style={{ color: 'var(--color-text-muted)' }} />
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontWeight: 600, color: '#fff', margin: 0 }}>{user.username}</p>
                <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 10, textTransform: 'capitalize' }}>{user.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 'var(--space-1)',
              }}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {state.selectedPeriod ? (
          <div className="sidebar-period-badge">
            <span className="sidebar-period-dot" aria-hidden="true" />
            <span className="sidebar-period-text">
              {state.selectedPeriod.month} {state.selectedPeriod.year}
            </span>
          </div>
        ) : (
          <div className="sidebar-period-badge sidebar-period-badge--none">
            <span className="sidebar-period-dot sidebar-period-dot--inactive" aria-hidden="true" />
            <span className="sidebar-period-text">No period selected</span>
          </div>
        )}
      </div>
    </aside>
  );
}
