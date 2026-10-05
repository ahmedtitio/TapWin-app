import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Icon from './Icons3D';
import { clearSession, getUser } from '../lib/api';
import { useI18n } from '../lib/i18n';

const NAV = [
  { to: '/', key: 'dashboard', icon: 'dashboard', end: true },
  { to: '/users', key: 'users', icon: 'users' },
  { to: '/analytics', key: 'analytics', icon: 'globe' },
  { to: '/activity', key: 'activity', icon: 'activity' },
  { to: '/settings', key: 'settings', icon: 'settings' },
];

const sidebarStyle = {
  width: 260, minHeight: '100vh', padding: '24px 16px',
  background: 'rgba(255,255,255,.08)',
  borderInlineEnd: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8,
  position: 'sticky', top: 0,
};

export default function Layout() {
  const navigate = useNavigate();
  const user = getUser();
  const { t } = useI18n();

  const logout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex' }}>
      <aside style={sidebarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 10px 20px' }}>
          <div className="icon-tile" style={{ '--tile': '#101010' }}>
            <Icon name="bolt" size={26} c1="#e9e4ff" c2="#c7f5ff" />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{t('adminPanel')}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Admin Dashboard</div>
          </div>
        </div>

        {NAV.map((item) => (
          <NavLink
            key={item.to} to={item.to} end={item.end}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              borderRadius: 14, fontWeight: 700, fontSize: 14.5, transition: 'all .15s',
              background: isActive ? 'rgba(255,255,255,.12)' : 'transparent',
              border: isActive ? '1px solid rgba(255,255,255,.35)' : '1px solid transparent',
              boxShadow: 'none',
              color: isActive ? '#fff' : 'var(--muted)',
            })}
          >
            <Icon name={item.icon} size={21} c1="#ffffff" c2="#d9d9d9" />
            {t(item.key)}
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto', padding: '14px 10px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div className="avatar3d" style={{ width: 38, height: 38, fontSize: 13 }}>
              {(user?.full_name || 'A')[0]}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.full_name || 'مشرف'}</div>
              <div style={{ color: 'var(--muted)', fontSize: 11.5, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={logout}>
            <Icon name="logout" size={16} c1="#ffffff" c2="#d9d9d9" />
            {t('logout')}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '28px 32px', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
