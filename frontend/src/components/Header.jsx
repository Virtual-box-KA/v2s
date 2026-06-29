import React from 'react';
import { useAuth } from '../context/AuthContext';

const Header = ({ activeView }) => {
  const { currentUser, userRole, profile } = useAuth();

  const viewTitles = {
    dashboard: 'Civiverse Dashboard',
    feed: 'Dynamic Issues Feed',
    report: 'File Incident Report',
    insights: 'Predictive Diagnostics',
    rewards: 'Rewards Vault & Store'
  };

  const isAgent = userRole === 'admin';

  return (
    <header className="header">
      <div className="header-title-section">
        <h2 id="header-title" style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
          {isAgent ? 'Municipal Operations Console' : (viewTitles[activeView] || 'Civiverse Action')}
        </h2>
      </div>

      <div className="header-right">
        {/* Citizen statistics progression details */}
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
                  ></div>
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

        <div className="user-profile-badge">
          <div className="avatar-shield">
            <i className={isAgent ? 'fas fa-user-shield' : 'fas fa-user-astronaut'}></i>
          </div>
          <div className="profile-details">
            <span id="header-username" className="username-text">{currentUser || 'Anonymous'}</span>
            <span id="header-user-role" className="role-text">
              {isAgent ? 'Municipal Officer' : (profile?.levelName || 'Citizen')}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
