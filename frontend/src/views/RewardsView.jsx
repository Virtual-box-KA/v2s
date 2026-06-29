import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const RewardsView = () => {
  const { profile, deductPoints, showToast } = useAuth();
  
  // Leaderboard states
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch leaderboard citizens ranks on load
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) throw new Error();
        const data = await response.json();
        setLeaderboard(data);
      } catch (error) {
        showToast('Error loading leaderboard ranks', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const storeItems = [
    {
      id: 1,
      name: 'Noida-Delhi Metro 10-Ride Pass',
      cost: 50,
      description: 'Redeem 50 XP Points to get a complimentary transit voucher for metro bus lines.',
      icon: 'fa-subway'
    },
    {
      id: 2,
      name: 'Civic Center Library Daily Entry',
      cost: 100,
      description: 'Acquire complete reading access to the municipal library including research archives.',
      icon: 'fa-book'
    },
    {
      id: 3,
      name: 'Sports Complex Weekly Pass',
      cost: 150,
      description: 'Get pool, gym, and badminton court bookings for a consecutive 7 days.',
      icon: 'fa-volleyball'
    }
  ];

  const badges = [
    { name: 'Aadhaar Verified', desc: 'Securely registered profile with verified ID document.', icon: 'fa-shield-check', active: true },
    { name: 'Pothole Sentinel', desc: 'Contributed 3 verified road hazard incidents.', icon: 'fa-road', active: profile?.level >= 2 },
    { name: 'Eco-Warrior', desc: 'Successfully resolved garbage/sanitation reports.', icon: 'fa-leaf', active: profile?.level >= 3 },
    { name: 'Civic Champion', desc: 'Highest contributor with over 500 XP.', icon: 'fa-crown', active: profile?.level >= 5 }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 6px 0' }}>Citizen Gamification & Rewards Vault</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Earn contribution points by reporting issues, upvoting validations, and completing local tasks. Redeem vouchers here!
        </p>
      </div>

      <div className="rewards-layout">
        
        {/* Left Side: Profile Stats & Vouchers catalog */}
        <div className="rewards-left-column">
          
          {/* User Profile Shield card */}
          {profile && (
            <div className="glass-panel rewards-profile-panel animate-slide-up">
              <div className="level-shield-container">
                <div id="rewards-level-shield" className="level-shield">{profile.level}</div>
              </div>
              <div className="level-info-card">
                <div className="level-title-row">
                  <span id="rewards-level-name" className="level-name">{profile.levelName}</span>
                  <span id="rewards-points-total" className="level-points-total">
                    <i className="fas fa-coins" style={{ color: '#ffc107', marginRight: '6px' }}></i>
                    {profile.points} XP Points Balance
                  </span>
                </div>
                <div className="xp-bar-bg large-xp-bar">
                  <div 
                    id="rewards-xp-fill" 
                    className="xp-bar-fill" 
                    style={{ width: `${(profile.xpCurrent / profile.xpNextLevel) * 100}%` }}
                  ></div>
                </div>
                <div className="xp-text" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                  <span id="rewards-xp-text-current">{profile.xpCurrent} XP</span>
                  <span id="rewards-xp-text-target">{profile.xpNextLevel} XP</span>
                </div>
              </div>
            </div>
          )}

          {/* Vouchers Store */}
          <div className="rewards-store-section">
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}>Redeem Civic Vouchers</h3>
            <div className="store-grid">
              {storeItems.map(item => (
                <div key={item.id} className="glass-panel store-card animate-slide-up">
                  <div className="store-card-icon">
                    <i className={`fas ${item.icon}`}></i>
                  </div>
                  <h4 className="store-card-title">{item.name}</h4>
                  <p className="store-card-desc">{item.description}</p>
                  <div className="store-card-footer">
                    <span className="store-card-cost"><i className="fas fa-coins" style={{ color: '#ffc107', marginRight: '4px' }}></i> {item.cost} XP</span>
                    <button 
                      className="btn" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => deductPoints(item.cost, item.name)}
                    >
                      Redeem
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Redeemed List */}
          {profile && profile.redeemedVouchers && profile.redeemedVouchers.length > 0 && (
            <div className="rewards-store-section" style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}><i className="fas fa-ticket-simple"></i> Your Active Vouchers</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {profile.redeemedVouchers.map((vouch, idx) => (
                  <div key={idx} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderLeft: '3px solid var(--color-resolved)' }}>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', margin: 0 }}>{vouch.name}</h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Redeemed on {vouch.date || new Date().toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Voucher Code</span>
                      <strong style={{ fontSize: '13px', color: 'var(--color-resolved)', fontFamily: 'var(--font-mono)' }}>{vouch.code}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Leaderboard + Badges — bounded flex column */}
        <div className="rewards-right-column" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>

          {/* Leaderboard */}
          <div className="glass-panel leaderboard-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', flexShrink: 0 }}>
              <i className="fas fa-trophy" style={{ color: '#ffc107', marginRight: '6px' }} /> Civic Leaderboard
            </h3>
            <div className="leaderboard-list" style={{ overflowY: 'auto', flex: 1, minHeight: 0, maxHeight: '380px' }}>
              {loading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '20px 0', textAlign: 'center' }}>
                  Loading ranks...
                </div>
              ) : (
                leaderboard.map((user, index) => (
                  <div key={index} className="leaderboard-item">
                    <div className="leaderboard-rank">#{index + 1}</div>
                    <div className="leaderboard-user">
                      <div className="leaderboard-username">{user.name}</div>
                      <div className="leaderboard-badge">{user.badge}</div>
                    </div>
                    <div className="leaderboard-score">{user.score} XP</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Achievements Badges — fixed-height, no overflow */}
          <div className="glass-panel badges-panel" style={{ flexShrink: 0 }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>
              <i className="fas fa-medal" style={{ color: 'var(--accent-steel)', marginRight: '6px' }} /> Achievements Badges
            </h3>
            <div className="badges-grid">
              {badges.map((badge, idx) => (
                <div key={idx} className={`badge-vault-item ${badge.active ? 'unlocked' : 'locked'}`} title={badge.desc}>
                  <div className="badge-vault-icon">
                    <i className={`fas ${badge.icon}`} />
                  </div>
                  <div className="badge-vault-name">{badge.name}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default RewardsView;
