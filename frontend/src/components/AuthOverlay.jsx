import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const AuthOverlay = () => {
  const { loginUser, showToast } = useAuth();

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'admin'
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idType, setIdType] = useState('Aadhaar Card');
  const [idNumber, setIdNumber] = useState('');

  // OTP
  const [otp, setOtp] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let response;

      if (authMode === 'admin') {
        response = await fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, phone })
        });
      } else if (authMode === 'register') {
        response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, phone, idType, idNumber, role: 'citizen' })
        });
      } else {
        response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Authentication failed');
      }

      const res = await response.json();
      showToast('OTP sent to your phone!', 'success');
      setSimulatedOtp(res.simulatedOtp);
      setOtpSent(true);
      setTimeout(() => {
        showToast(`💬 SMS: Your Civiverse OTP is ${res.simulatedOtp}`, 'info');
      }, 900);

    } catch (err) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Verification failed');
      }
      const res = await response.json();
      showToast('Welcome to Civiverse!', 'success');
      loginUser(res.user);
    } catch (err) {
      showToast(err.message || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setOtpSent(false);
    setOtp('');
    setPhone('');
    setUsername('');
    setEmail('');
    setIdNumber('');
  };

  const tabs = [
    { id: 'login',    icon: 'fa-arrow-right-to-bracket', label: 'Log In' },
    { id: 'register', icon: 'fa-user-plus',               label: 'Register' },
    { id: 'admin',    icon: 'fa-shield-halved',            label: 'Admin' },
  ];

  const subtitles = {
    login:    'Log in with your registered phone number.',
    register: 'Create a citizen account to report issues.',
    admin:    'Municipal officer access — restricted.',
  };

  return (
    <div id="auth-overlay" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(14, 19, 32, 0.96)', backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '410px', width: '92%', padding: '32px',
        border: '1px solid var(--border-glow)',
        boxShadow: '0 0 40px rgba(74, 120, 192, 0.2)'
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <i className="fas fa-city" style={{ fontSize: '32px', color: 'var(--accent-steel)', marginBottom: '8px', display: 'block' }} />
          <h2 style={{
            fontSize: '21px', fontWeight: '800', margin: 0,
            background: 'linear-gradient(135deg, var(--text-primary), var(--accent-steel))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
          }}>Civiverse</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {otpSent ? `OTP sent to +91 ${phone}` : subtitles[authMode]}
          </p>
        </div>

        {/* Tab switcher */}
        {!otpSent && (
          <div style={{
            display: 'flex', background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)', padding: '4px',
            marginBottom: '20px', border: '1px solid var(--border-color)', gap: '3px'
          }}>
            {tabs.map(({ id, icon, label }) => {
              const isActive = authMode === id;
              const isAdmin = id === 'admin';
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchMode(id)}
                  style={{
                    flex: 1, border: 'none', cursor: 'pointer',
                    padding: '8px 0', borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-primary)', fontSize: '12px', fontWeight: '600',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    transition: 'all var(--transition-fast)',
                    background: isActive
                      ? (isAdmin
                          ? 'linear-gradient(135deg, rgba(224,153,94,0.35), rgba(224,94,94,0.2))'
                          : 'linear-gradient(135deg, var(--accent-steel), #3a68b0)')
                      : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
                  }}
                >
                  <i className={`fas ${icon}`} style={{ fontSize: '11px' }} />
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Admin notice */}
        {authMode === 'admin' && !otpSent && (
          <div style={{
            background: 'rgba(224,153,94,0.08)', border: '1px solid rgba(224,153,94,0.25)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '12px',
            color: 'var(--color-open)', marginBottom: '16px', lineHeight: '1.5'
          }}>
            <i className="fas fa-triangle-exclamation" style={{ marginRight: '6px' }} />
            Restricted to authorized municipal officers.
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>

            {/* Register & Admin: need a name/username */}
            {(authMode === 'register' || authMode === 'admin') && (
              <div className="form-group">
                <label htmlFor="auth-username">
                  {authMode === 'admin' ? 'Admin Username' : 'Full Name'}
                </label>
                <input
                  type="text"
                  id="auth-username"
                  className="form-control"
                  placeholder={authMode === 'admin' ? 'e.g. officer.sharma' : 'e.g. Rohan Sharma'}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Register: email */}
            {authMode === 'register' && (
              <div className="form-group">
                <label htmlFor="auth-email">Email Address</label>
                <input
                  type="email"
                  id="auth-email"
                  className="form-control"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Phone — all modes */}
            <div className="form-group">
              <label htmlFor="auth-phone">Phone Number</label>
              <input
                type="tel"
                id="auth-phone"
                className="form-control"
                placeholder="10-digit mobile number"
                pattern="[0-9]{10}"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>

            {/* Register: ID proof */}
            {authMode === 'register' && (
              <>
                <div className="form-group">
                  <label htmlFor="auth-id-type">ID Proof Type</label>
                  <select
                    id="auth-id-type"
                    className="form-control"
                    value={idType}
                    onChange={e => setIdType(e.target.value)}
                    required
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Driving License">Driving License (DL)</option>
                    <option value="Voter ID">Voter ID Card</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="auth-id-number">ID Number</label>
                  <input
                    type="text"
                    id="auth-id-number"
                    className="form-control"
                    placeholder="e.g. 12-digit Aadhaar number"
                    value={idNumber}
                    onChange={e => setIdNumber(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn" style={{ width: '100%', marginTop: '4px' }} disabled={loading}>
              {loading
                ? <i className="fas fa-spinner fa-spin" />
                : <>
                    <i className={`fas ${authMode === 'register' ? 'fa-user-plus' : authMode === 'admin' ? 'fa-shield-check' : 'fa-arrow-right'}`} />
                    {authMode === 'register' ? 'Register & Send OTP' : 'Send OTP'}
                  </>
              }
            </button>
          </form>

        ) : (
          /* OTP screen */
          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="auth-otp" style={{ textAlign: 'center' }}>Enter 4-digit OTP</label>
              <input
                type="text"
                id="auth-otp"
                className="form-control"
                placeholder="••••"
                style={{ textAlign: 'center', fontSize: '26px', letterSpacing: '14px', fontFamily: 'var(--font-mono)' }}
                maxLength={4}
                value={otp}
                onChange={e => setOtp(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Simulated SMS */}
            <div style={{
              background: '#080d18', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)', padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <i className="fas fa-comment-sms" style={{ fontSize: '22px', color: '#ffc107', flexShrink: 0 }} />
              <div style={{ fontSize: '11px' }}>
                <div style={{ color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px' }}>Simulated SMS</div>
                <div style={{ color: 'var(--text-primary)' }}>
                  OTP: <strong style={{ color: 'var(--color-resolved)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>{simulatedOtp}</strong>
                </div>
              </div>
            </div>

            <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
              {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-shield-check" /> Verify & Enter</>}
            </button>
            <button type="button" className="btn btn-secondary" style={{ width: '100%', fontSize: '12px', padding: '8px 0' }} onClick={() => { setOtpSent(false); setOtp(''); }} disabled={loading}>
              ← Change Number
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default AuthOverlay;
