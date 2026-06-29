import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Header = ({ activeView, setActiveView }) => {
  const { currentUser, userRole, profile, logoutUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const viewTitles = {
    dashboard: 'Civiverse Dashboard',
    feed: 'Dynamic Issues Feed',
    report: 'File Incident Report',
    insights: 'City Pulse Analytics',
    rewards: 'Rewards Vault & Store',
    profile: 'My Profile',
  };

  const isAgent = userRole === 'admin';
  const initials = (currentUser || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const isMoAdmin = isAgent && currentUser && currentUser.startsWith('mo-');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="header">
      <div className="header-title-section">
        <h2 id="header-title" style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
          {isAgent ? 'Municipal Operations Console' : (viewTitles[activeView] || 'Civiverse Action')}
        </h2>
      </div>

      <div className="header-right">
        {/* XP progress widget — citizens only */}
        {!isAgent && profile && (
          <div className="user-progress-widget">
            <div className="xp-metric-box">
              <span id="header-user-level-badge" className="level-indicator-badge">LVL {profile.level}</span>
              <div className="xp-progress-bar-container">
                <div className="xp-bar-bg">
                  <div
                    id="header-xp-bar-fill"
                    className="xp-bar-fill"
                    style={{ width: `${(profile.xpCurrent / profile.xpNextLevel) * 100}%` }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <span id="header-xp-text-current">{profile.xpCurrent} XP</span>
                  <span id="header-xp-text-target">{profile.xpNextLevel} XP</span>
                </div>
              </div>
            </div>

            <div className="points-metrics-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-coins" style={{ color: '#ffc107' }}></i>
                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>XP Balance</div>
                  <div id="header-points-balance" style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{profile.points} XP</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)', padding: '8px 14px',
              cursor: 'pointer', transition: 'all var(--transition-fast)',
              color: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-steel)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = dropdownOpen ? 'var(--accent-steel)' : 'var(--border-color)'}
          >
            {/* Avatar circle */}
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: isAgent ? 'rgba(224,153,94,0.2)' : 'linear-gradient(135deg, var(--accent-steel), #2a68c4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '800', color: isAgent ? 'var(--color-open)' : '#fff',
              flexShrink: 0,
            }}>
              {isAgent ? <i className="fas fa-user-shield" style={{ fontSize: '13px' }} /> : initials}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', lineHeight: '1.2' }}>{currentUser}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.2' }}>
                {isAgent ? (isMoAdmin ? `${currentUser.slice(3).charAt(0).toUpperCase() + currentUser.slice(4)} Office` : 'Global Admin') : (profile?.levelName || 'Citizen')}
              </div>
            </div>
            <i className={`fas fa-chevron-${dropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }} />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)', minWidth: '180px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              zIndex: 1000, overflow: 'hidden',
              animation: 'slideDown 0.15s ease',
            }}>
              {/* User info header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{currentUser}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {isAgent ? 'Municipal Officer' : (profile?.levelName || 'Citizen')}
                </div>
              </div>

              {/* My Profile — citizens only */}
              {!isAgent && (
                <button
                  onClick={() => { setActiveView?.('profile'); setDropdownOpen(false); }}
                  style={{
                    width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                    color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600',
                    textAlign: 'left', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <i className="fas fa-user" style={{ width: '16px', textAlign: 'center', color: 'var(--accent-steel)' }} />
                  My Profile
                </button>
              )}

              {/* My Reports — citizens only */}
              {!isAgent && (
                <button
                  onClick={() => { setActiveView?.('profile'); setDropdownOpen(false); }}
                  style={{
                    width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                    color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600',
                    textAlign: 'left', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <i className="fas fa-flag" style={{ width: '16px', textAlign: 'center', color: '#ffc107' }} />
                  My Reports
                </button>
              )}

              <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

              {/* Sign Out */}
              <button
                onClick={() => { logoutUser(); setDropdownOpen(false); }}
                style={{
                  width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                  color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600',
                  textAlign: 'left', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,94,94,0.08)'; e.currentTarget.style.color = 'var(--color-critical)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <i className="fas fa-sign-out-alt" style={{ width: '16px', textAlign: 'center', color: 'var(--color-critical)' }} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
