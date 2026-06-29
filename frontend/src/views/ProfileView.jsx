import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const getBadgeColor = (status) => {
  if (status === 'Resolved') return 'var(--color-resolved)';
  if (status === 'In Progress') return 'var(--color-progress)';
  return 'var(--color-open)';
};

const ProfileView = ({ setActiveView }) => {
  const { currentUser, userRecord, profile, showToast } = useAuth();

  const [activeTab, setActiveTab] = useState('profile');
  const [myIssues, setMyIssues] = useState([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  const initials = (currentUser || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const level = profile?.level || 1;
  const xpCurrent = profile?.xpCurrent || 0;
  const xpNextLevel = profile?.xpNextLevel || 100;
  const xpPct = Math.min(Math.round((xpCurrent / xpNextLevel) * 100), 100);
  const levelName = profile?.levelName || 'Civic Novice';
  const points = profile?.points || 0;

  const rankColors = {
    'Civic Novice': '#aaa',
    'Civic Guardian': '#2ec4b6',
    'Pothole Sentinel': '#ff9f1c',
    'Community Veteran': '#9b5de5',
    'Civic Champion': '#ffc107',
    'Municipal Officer': 'var(--color-open)',
  };
  const rankColor = rankColors[levelName] || 'var(--accent-steel)';

  const fetchMyIssues = async () => {
    setLoadingIssues(true);
    try {
      const res = await fetch('/api/issues');
      if (!res.ok) throw new Error();
      const all = await res.json();
      setMyIssues(all.filter(i => i.createdBy === currentUser));
    } catch {
      showToast('Could not load your reports', 'error');
    } finally {
      setLoadingIssues(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') fetchMyIssues();
  }, [activeTab]);

  const statusCounts = {
    Open: myIssues.filter(i => i.status === 'Open').length,
    'In Progress': myIssues.filter(i => i.status === 'In Progress').length,
    Resolved: myIssues.filter(i => i.status === 'Resolved').length,
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>

      {/* Profile hero card */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
        {/* Header gradient */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(74,120,192,0.25) 0%, rgba(94,188,224,0.1) 100%)',
          padding: '28px 28px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', gap: '20px'
        }}>
          {/* Avatar */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-steel), #2a68c4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px', fontWeight: '800', color: '#fff',
            border: '3px solid rgba(255,255,255,0.15)',
            boxShadow: '0 8px 24px rgba(74,120,192,0.4)',
            flexShrink: 0,
          }}>
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>{currentUser}</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px', padding: '4px 12px', fontSize: '12px',
              color: rankColor, fontWeight: '700',
            }}>
              <i className="fas fa-star" style={{ fontSize: '10px' }} />
              {levelName}
            </div>
            {userRecord?.email && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                <i className="fas fa-envelope" style={{ marginRight: '6px' }} />{userRecord.email}
              </div>
            )}
          </div>

          {userRecord?.role !== 'admin' && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#ffc107', lineHeight: 1 }}>{points}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>points</div>
            </div>
          )}
        </div>

        {/* XP bar — only for citizens */}
        {userRecord?.role !== 'admin' && (
          <div style={{ padding: '14px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Level {level} — {xpCurrent} XP</span>
              <span style={{ color: 'var(--text-muted)' }}>{xpNextLevel} XP to level up</span>
            </div>
            <div className="xp-bar-bg">
              <div className="xp-bar-fill" style={{ width: `${xpPct}%`, transition: 'width 1s ease' }} />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid var(--border-color)', marginBottom: '16px', width: 'fit-content' }}>
        {[
          { id: 'profile', label: 'Profile', icon: 'fa-user' },
          { id: 'reports', label: `My Reports${myIssues.length > 0 ? ` (${myIssues.length})` : ''}`, icon: 'fa-flag' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: activeTab === t.id ? 'linear-gradient(135deg, var(--accent-steel), #3a68b0)' : 'none',
              border: 'none', color: activeTab === t.id ? '#fff' : 'var(--text-secondary)',
              padding: '8px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-primary)',
              transition: 'all var(--transition-fast)', display: 'flex', alignItems: 'center', gap: '7px',
            }}
          >
            <i className={`fas ${t.icon}`} />{t.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {activeTab === 'profile' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Stats row */}
          {userRecord?.role !== 'admin' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: 'Reports Filed', value: myIssues.length || '—', icon: 'fa-flag', color: 'var(--accent-steel)' },
                { label: 'Issues Resolved', value: statusCounts.Resolved || '—', icon: 'fa-circle-check', color: 'var(--color-resolved)' },
                { label: 'Total XP', value: userRecord?.xp || 0, icon: 'fa-bolt', color: '#ffc107' },
              ].map(s => (
                <div key={s.label} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: `rgba(${s.color === 'var(--accent-steel)' ? '74,120,192' : s.color === 'var(--color-resolved)' ? '94,224,157' : '255,193,7'},0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: '16px' }}>
                    <i className={`fas ${s.icon}`} />
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Account details */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                ['Username', userRecord?.username || currentUser],
                ['Phone', userRecord?.phone || '—'],
                ['Email', userRecord?.email || '—'],
                ['ID Type', userRecord?.idType || '—'],
                ['Role', userRecord?.role || 'citizen'],
                ['Status', userRecord?.verified ? 'Verified' : 'Pending'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{k}</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{String(v)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Report issue CTA for citizens */}
          {userRecord?.role === 'citizen' && (
            <button
              className="btn"
              style={{ width: '100%', padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => setActiveView('report')}
            >
              <i className="fas fa-plus-circle" /> Report a New Issue
            </button>
          )}
        </div>
      )}

      {/* ── My Reports tab ── */}
      {activeTab === 'reports' && (
        <div className="animate-fade-in">
          {loadingIssues ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }} />
              Loading your reports...
            </div>
          ) : myIssues.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
              <i className="fas fa-flag" style={{ fontSize: '32px', color: 'var(--text-muted)', display: 'block', marginBottom: '12px', opacity: 0.4 }} />
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>No reports yet</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>You haven't filed any civic issues. Be the change!</div>
              <button className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => setActiveView('report')}>
                <i className="fas fa-plus" /> Report Your First Issue
              </button>
            </div>
          ) : (
            <>
              {/* Summary badges */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', padding: '8px 14px',
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getBadgeColor(status) }} />
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{status}</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: getBadgeColor(status) }}>{count}</span>
                  </div>
                ))}
              </div>

              {/* Issues list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myIssues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(issue => (
                  <div
                    key={issue.id}
                    className="glass-panel"
                    style={{ padding: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start', cursor: 'pointer', transition: 'border-color var(--transition-fast)', border: '1px solid var(--border-color)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-steel)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    onClick={() => setActiveView('feed')}
                  >
                    {/* Status dot */}
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: getBadgeColor(issue.status),
                      marginTop: '5px', flexShrink: 0,
                      boxShadow: `0 0 8px ${getBadgeColor(issue.status)}55`
                    }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', lineHeight: '1.3' }}>{issue.title}</div>
                        <span style={{
                          fontSize: '10px', fontWeight: '700', padding: '3px 8px',
                          borderRadius: '20px', border: `1px solid ${getBadgeColor(issue.status)}`,
                          color: getBadgeColor(issue.status), whiteSpace: 'nowrap', flexShrink: 0
                        }}>{issue.status}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span><i className="fas fa-tag" style={{ marginRight: '4px' }} />{issue.category}</span>
                        <span><i className="fas fa-map-marker-alt" style={{ marginRight: '4px' }} />{issue.city}</span>
                        <span><i className="fas fa-calendar" style={{ marginRight: '4px' }} />{new Date(issue.createdAt).toLocaleDateString()}</span>
                        <span style={{ color: '#ffc107' }}><i className="fas fa-arrow-up" style={{ marginRight: '4px' }} />{issue.upvotes} upvotes</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileView;
