import React from 'react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ activeView, setActiveView }) => {
  const { userRole, userRecord, currentUser, logoutUser } = useAuth();
  const isAgent    = userRole === 'admin';
  const isEmployee = userRole === 'employee';
  const isMoAdmin  = isAgent && currentUser && currentUser.startsWith('mo-');

  const citizenNavItems = [
    { id: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
    { id: 'feed',      icon: 'fa-list-ul',    label: 'Issues Feed' },
    { id: 'report',    icon: 'fa-plus-circle', label: 'Report Issue' },
    { id: 'insights',  icon: 'fa-brain',       label: 'City Pulse' },
    { id: 'rewards',   icon: 'fa-medal',       label: 'Rewards Hub' },
  ];

  const adminNavItems = [
    { id: 'issues',    icon: 'fa-list-check',   label: 'Issues' },
    { id: 'users',     icon: 'fa-users',         label: isMoAdmin ? 'My Team' : 'Citizens' },
    { id: 'analytics', icon: 'fa-chart-pie',     label: 'Analytics' },
  ];

  const employeeNavItems = [
    { id: 'employee', icon: 'fa-hard-hat', label: 'My Assignments' },
  ];

  const navItems = isEmployee ? employeeNavItems : (isAgent ? adminNavItems : citizenNavItems);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <i className="fas fa-city" />
        <h1>Civiverse</h1>
      </div>

      {isAgent && (
        <div style={{
          margin: '12px 10px 4px', padding: '8px 12px',
          background: 'rgba(224,153,94,0.1)', border: '1px solid rgba(224,153,94,0.25)',
          borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--color-open)',
          fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <i className="fas fa-shield-halved" /> Admin Console
        </div>
      )}
      {isEmployee && (
        <div style={{
          margin: '12px 10px 4px', padding: '8px 12px',
          background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.25)',
          borderRadius: 'var(--radius-sm)', fontSize: '11px', color: '#ffc107',
          fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <i className="fas fa-hard-hat" /> Field Officer
        </div>
      )}

      <ul className="sidebar-menu">
        {navItems.map(item => (
          <li key={item.id} className={activeView === item.id ? 'active' : ''}>
            <a onClick={() => setActiveView(item.id)}>
              <i className={`fas ${item.icon}`} />
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <div>Civiverse Portal v2.0</div>
        <div>
          {isAgent ? (
            <span style={{ color: 'var(--color-open)' }}>Municipal Officer</span>
          ) : isEmployee ? (
            <span style={{ color: '#ffc107' }}>Field Officer</span>
          ) : (
            <span>{userRecord?.idType || 'Citizen'}</span>
          )}
        </div>
        <button className="logout-btn" onClick={logoutUser}>
          <i className="fas fa-sign-out-alt" /> Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
