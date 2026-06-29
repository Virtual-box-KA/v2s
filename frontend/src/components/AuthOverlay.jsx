import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL SELECTOR — two big tiles: Citizen / Official
// ─────────────────────────────────────────────────────────────────────────────
const PortalSelector = ({ onSelect }) => (
  <div style={{
    position: 'fixed', inset: 0,
    background: 'linear-gradient(135deg, #050812 0%, #0a0f1a 50%, #0d1526 100%)',
    backdropFilter: 'blur(18px)',
    zIndex: 2000,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
  }}>
    {/* Animated background blobs */}
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,120,192,0.08) 0%, transparent 70%)', top: '-100px', left: '-100px' }} />
      <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(46,196,182,0.06) 0%, transparent 70%)', bottom: '-80px', right: '-80px' }} />
    </div>

    {/* Logo */}
    <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
      <div style={{ fontSize: '42px', marginBottom: '10px' }}>
        <i className="fas fa-city" style={{ color: 'var(--accent-steel)' }} />
      </div>
      <h1 style={{
        fontSize: '28px', fontWeight: '900', margin: 0,
        background: 'linear-gradient(135deg, #fff 30%, var(--accent-steel))',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>Civiverse</h1>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
        Smart Civic Issue Management Platform
      </p>
    </div>

    {/* Portal tiles */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '560px' }}>

      {/* Citizen portal */}
      <button
        onClick={() => onSelect('citizen')}
        style={{
          background: 'linear-gradient(135deg, rgba(74,120,192,0.12) 0%, rgba(74,120,192,0.04) 100%)',
          border: '1px solid rgba(74,120,192,0.35)',
          borderRadius: '16px', padding: '28px 20px', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
          transition: 'all 0.25s ease', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(74,120,192,0.22) 0%, rgba(74,120,192,0.08) 100%)';
          e.currentTarget.style.borderColor = 'rgba(74,120,192,0.7)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 16px 40px rgba(74,120,192,0.2)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(74,120,192,0.12) 0%, rgba(74,120,192,0.04) 100%)';
          e.currentTarget.style.borderColor = 'rgba(74,120,192,0.35)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(74,120,192,0.15)', border: '1px solid rgba(74,120,192,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-user" style={{ fontSize: '22px', color: 'var(--accent-steel)' }} />
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>Citizen Portal</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Report issues, track resolutions &amp; earn civic rewards
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--accent-steel)', background: 'rgba(74,120,192,0.15)', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(74,120,192,0.25)' }}>Login</span>
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '3px 10px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>Register</span>
        </div>
      </button>

      {/* Official portal */}
      <button
        onClick={() => onSelect('official')}
        style={{
          background: 'linear-gradient(135deg, rgba(224,153,94,0.1) 0%, rgba(224,94,94,0.04) 100%)',
          border: '1px solid rgba(224,153,94,0.3)',
          borderRadius: '16px', padding: '28px 20px', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
          transition: 'all 0.25s ease', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(224,153,94,0.2) 0%, rgba(224,94,94,0.08) 100%)';
          e.currentTarget.style.borderColor = 'rgba(224,153,94,0.6)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 16px 40px rgba(224,153,94,0.15)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(224,153,94,0.1) 0%, rgba(224,94,94,0.04) 100%)';
          e.currentTarget.style.borderColor = 'rgba(224,153,94,0.3)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(224,153,94,0.12)', border: '1px solid rgba(224,153,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-shield-halved" style={{ fontSize: '22px', color: '#e0995e' }} />
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>Official Portal</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Municipal admin &amp; field employee access
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#e0995e', background: 'rgba(224,153,94,0.12)', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(224,153,94,0.25)' }}>Admin</span>
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '3px 10px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>Employee</span>
        </div>
      </button>
    </div>

    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '28px' }}>
      Select the portal that applies to you
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// OTP SCREEN (shared)
// ─────────────────────────────────────────────────────────────────────────────
const OtpScreen = ({ phone, simulatedOtp, onVerify, onBack, loading }) => {
  const [otp, setOtp] = useState('');
  return (
    <form onSubmit={e => { e.preventDefault(); onVerify(phone, otp); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="form-group">
        <label style={{ textAlign: 'center', display: 'block' }}>Enter 4-digit OTP</label>
        <input
          type="text" id="auth-otp" className="form-control"
          placeholder="••••"
          style={{ textAlign: 'center', fontSize: '26px', letterSpacing: '14px', fontFamily: 'var(--font-mono)' }}
          maxLength={4} value={otp} onChange={e => setOtp(e.target.value)} autoFocus required
        />
      </div>
      <div style={{ background: '#080d18', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <i className="fas fa-comment-sms" style={{ fontSize: '22px', color: '#ffc107', flexShrink: 0 }} />
        <div style={{ fontSize: '11px' }}>
          <div style={{ color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px' }}>Simulated SMS</div>
          <div style={{ color: 'var(--text-primary)' }}>
            OTP: <strong style={{ color: 'var(--color-resolved)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>{simulatedOtp}</strong>
          </div>
        </div>
      </div>
      <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
        {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-shield-check" /> Verify &amp; Enter</>}
      </button>
      <button type="button" className="btn btn-secondary" style={{ width: '100%', fontSize: '12px', padding: '8px 0' }} onClick={onBack} disabled={loading}>
        ← Go Back
      </button>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CITIZEN FORM (Login or Register)
// ─────────────────────────────────────────────────────────────────────────────
const CitizenForm = ({ onSentOtp, onBack, showToast }) => {
  const [tab, setTab]           = useState('login'); // 'login' | 'register'
  const [phone, setPhone]       = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [idType, setIdType]     = useState('Aadhaar Card');
  const [idNumber, setIdNumber] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = tab === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = tab === 'register'
        ? { username, email, phone, idType, idNumber, role: 'citizen' }
        : { phone };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      const data = await res.json();
      showToast('OTP sent!', 'success');
      setTimeout(() => showToast(`💬 SMS: Your OTP is ${data.simulatedOtp}`, 'info'), 900);
      onSentOtp(phone, data.simulatedOtp);
    } catch (err) { showToast(err.message || 'Error', 'error'); }
    finally { setLoading(false); }
  };

  const TABS = [
    { id: 'login',    icon: 'fa-arrow-right-to-bracket', label: 'Log In' },
    { id: 'register', icon: 'fa-user-plus',               label: 'Register' },
  ];

  return (
    <div>
      {/* Citizen sub-tabs */}
      <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '20px', border: '1px solid var(--border-color)', gap: '4px' }}>
        {TABS.map(({ id, icon, label }) => (
          <button key={id} type="button" onClick={() => setTab(id)} style={{
            flex: 1, border: 'none', cursor: 'pointer', padding: '9px 0', borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-primary)', fontSize: '13px', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            transition: 'all 0.2s',
            background: tab === id ? 'linear-gradient(135deg, var(--accent-steel), #3a68b0)' : 'transparent',
            color: tab === id ? '#fff' : 'var(--text-muted)',
            boxShadow: tab === id ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
          }}>
            <i className={`fas ${icon}`} style={{ fontSize: '12px' }} />{label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
        {tab === 'register' && (
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" className="form-control" placeholder="e.g. Priya Sharma" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
        )}
        {tab === 'register' && (
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" className="form-control" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
        )}
        <div className="form-group">
          <label>Phone Number</label>
          <input type="tel" id="auth-phone" className="form-control" placeholder="10-digit mobile number" pattern="[0-9]{10}" value={phone} onChange={e => setPhone(e.target.value)} required />
        </div>
        {tab === 'register' && (
          <>
            <div className="form-group">
              <label>ID Proof Type</label>
              <select className="form-control" value={idType} onChange={e => setIdType(e.target.value)} required>
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="Driving License">Driving License (DL)</option>
                <option value="Voter ID">Voter ID Card</option>
                <option value="Passport">Passport</option>
              </select>
            </div>
            <div className="form-group">
              <label>ID Number</label>
              <input type="text" className="form-control" placeholder="e.g. 12-digit Aadhaar number" value={idNumber} onChange={e => setIdNumber(e.target.value)} required />
            </div>
          </>
        )}
        <button type="submit" className="btn" style={{ width: '100%', marginTop: '4px' }} disabled={loading}>
          {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className={`fas ${tab === 'register' ? 'fa-user-plus' : 'fa-arrow-right'}`} /> {tab === 'register' ? 'Register & Send OTP' : 'Send OTP'}</>}
        </button>
      </form>

      <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', marginTop: '16px', display: 'block', textAlign: 'center', width: '100%' }}>
        ← Back to portal selection
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OFFICIAL FORM (Admin or Employee)
// ─────────────────────────────────────────────────────────────────────────────
const OfficialForm = ({ onSentOtp, onBack, showToast }) => {
  const [tab, setTab]           = useState('admin'); // 'admin' | 'employee'
  const [username, setUsername] = useState('');
  const [phone, setPhone]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, phone }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Access denied'); }
      const data = await res.json();
      showToast('OTP sent!', 'success');
      setTimeout(() => showToast(`💬 SMS: Your OTP is ${data.simulatedOtp}`, 'info'), 900);
      onSentOtp(phone, data.simulatedOtp);
    } catch (err) { showToast(err.message || 'Error', 'error'); }
    finally { setLoading(false); }
  };

  const TABS = [
    { id: 'admin',    icon: 'fa-shield-halved',  label: 'Admin',    color: '#e0995e' },
    { id: 'employee', icon: 'fa-hard-hat',        label: 'Employee', color: '#5ebce0' },
  ];

  const PLACEHOLDER = {
    admin:    { username: 'mo-ghaziabad / mo-noida…', phone: 'Registered phone' },
    employee: { username: 'Employee username',          phone: 'Registered phone' },
  };

  return (
    <div>
      {/* Official restriction banner */}
      <div style={{ background: 'rgba(224,153,94,0.08)', border: '1px solid rgba(224,153,94,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '12px', color: '#e0995e', marginBottom: '16px', lineHeight: '1.5' }}>
        <i className="fas fa-triangle-exclamation" style={{ marginRight: '6px' }} />
        Restricted to authorised municipal personnel only.
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '20px', border: '1px solid var(--border-color)', gap: '4px' }}>
        {TABS.map(({ id, icon, label, color }) => (
          <button key={id} type="button" onClick={() => setTab(id)} style={{
            flex: 1, border: 'none', cursor: 'pointer', padding: '9px 0', borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-primary)', fontSize: '13px', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            transition: 'all 0.2s',
            background: tab === id ? `rgba(${id === 'admin' ? '224,153,94' : '94,188,224'},0.15)` : 'transparent',
            color: tab === id ? color : 'var(--text-muted)',
            borderBottom: tab === id ? `2px solid ${color}` : '2px solid transparent',
          }}>
            <i className={`fas ${icon}`} style={{ fontSize: '12px' }} />{label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
        <div className="form-group">
          <label>{tab === 'admin' ? 'Admin Username' : 'Employee Username'}</label>
          <input
            type="text" className="form-control"
            placeholder={PLACEHOLDER[tab].username}
            value={username} onChange={e => setUsername(e.target.value)} required
          />
          {tab === 'admin' && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
              <i className="fas fa-info-circle" style={{ marginRight: '4px' }} />
              Format: <code style={{ color: 'var(--accent-steel)' }}>mo-ghaziabad</code>, <code style={{ color: 'var(--accent-steel)' }}>mo-noida</code>, etc.
            </div>
          )}
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input type="tel" className="form-control" placeholder="Registered phone number" pattern="[0-9]{10}" value={phone} onChange={e => setPhone(e.target.value)} required />
        </div>
        <button type="submit" className="btn" style={{ width: '100%', marginTop: '4px', background: tab === 'admin' ? 'linear-gradient(135deg, #c0784a, #a0582a)' : undefined }} disabled={loading}>
          {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className={`fas ${tab === 'admin' ? 'fa-shield-check' : 'fa-hard-hat'}`} /> {tab === 'admin' ? 'Admin Login' : 'Employee Login'}</>}
        </button>
      </form>

      <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', marginTop: '16px', display: 'block', textAlign: 'center', width: '100%' }}>
        ← Back to portal selection
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ROOT AUTH OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
const AuthOverlay = () => {
  const { loginUser, showToast } = useAuth();

  // 'portal' → 'citizen' | 'official'
  const [portal, setPortal]             = useState(null);
  const [otpSent, setOtpSent]           = useState(false);
  const [activePhone, setActivePhone]   = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [loading, setLoading]           = useState(false);

  const handleSentOtp = (phone, sim) => {
    setActivePhone(phone);
    setSimulatedOtp(sim);
    setOtpSent(true);
  };

  const handleVerify = async (phone, otp) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Verification failed'); }
      const data = await res.json();
      showToast('Welcome to Civiverse!', 'success');
      loginUser(data.user);
    } catch (err) { showToast(err.message || 'Verification failed', 'error'); }
    finally { setLoading(false); }
  };

  const handleBack = () => {
    setOtpSent(false);
    setActivePhone('');
    setSimulatedOtp('');
  };

  // Show portal selector
  if (!portal) return <PortalSelector onSelect={setPortal} />;

  const accentColor   = portal === 'citizen' ? 'var(--accent-steel)' : '#e0995e';
  const accentBg      = portal === 'citizen' ? 'rgba(74,120,192,0.08)' : 'rgba(224,153,94,0.06)';
  const accentBorder  = portal === 'citizen' ? 'rgba(74,120,192,0.25)' : 'rgba(224,153,94,0.25)';
  const portalLabel   = portal === 'citizen' ? 'Citizen Portal' : 'Official Portal';
  const portalIcon    = portal === 'citizen' ? 'fa-user' : 'fa-shield-halved';

  return (
    <div id="auth-overlay" style={{
      position: 'fixed', inset: 0,
      background: 'rgba(14,19,32,0.96)', backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div className="glass-panel" style={{
        maxWidth: '420px', width: '100%', padding: '32px',
        border: `1px solid ${accentBorder}`,
        boxShadow: `0 0 60px ${accentColor}22`,
        animation: 'slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        {/* Logo + portal badge */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <i className="fas fa-city" style={{ fontSize: '30px', color: accentColor, marginBottom: '8px', display: 'block' }} />
          <h2 style={{
            fontSize: '20px', fontWeight: '800', margin: 0,
            background: `linear-gradient(135deg, #fff, ${accentColor})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Civiverse</h2>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: '20px', padding: '4px 12px' }}>
            <i className={`fas ${portalIcon}`} style={{ fontSize: '11px', color: accentColor }} />
            <span style={{ fontSize: '11px', fontWeight: '700', color: accentColor }}>{portalLabel}</span>
          </div>
          {otpSent && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>OTP sent to +91 {activePhone}</p>
          )}
        </div>

        {/* Form content */}
        {otpSent ? (
          <OtpScreen
            phone={activePhone}
            simulatedOtp={simulatedOtp}
            onVerify={handleVerify}
            onBack={handleBack}
            loading={loading}
          />
        ) : portal === 'citizen' ? (
          <CitizenForm onSentOtp={handleSentOtp} onBack={() => setPortal(null)} showToast={showToast} />
        ) : (
          <OfficialForm onSentOtp={handleSentOtp} onBack={() => setPortal(null)} showToast={showToast} />
        )}
      </div>
    </div>
  );
};

export default AuthOverlay;
