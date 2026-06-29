import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const ADMIN_KEY = 'MUNI-ADMIN-2024';

const getParentCategory = (cat) => {
  const mapping = {
    "Potholes": "Roads", "Road damage": "Roads", "Missing road signs": "Roads", "Road obstruction": "Roads", "Pothole": "Roads",
    "Light not working": "Street Lighting", "Pole damaged": "Street Lighting", "Exposed wiring": "Street Lighting", "Damaged Streetlight": "Street Lighting",
    "Water leakage": "Water", "No water supply": "Water", "Low pressure": "Water", "Contaminated water": "Water", "Water Leakage": "Water",
    "Drain blockage": "Sewerage", "Sewer overflow": "Sewerage", "Open manhole": "Sewerage",
    "Garbage not collected": "Waste Management", "Overflowing bin": "Waste Management", "Illegal dumping": "Waste Management",
    "Fallen tree": "Parks & Greenery", "Tree pruning": "Parks & Greenery", "Park maintenance": "Parks & Greenery",
    "Signal malfunction": "Traffic", "Illegal parking": "Traffic", "Missing signage": "Traffic",
    "Stray dogs": "Animal Control", "Dead animal": "Animal Control", "Cattle on road": "Animal Control",
    "Air pollution": "Environment", "Noise pollution": "Environment", "Water pollution": "Environment",
    "Bus stop damage": "Public Infrastructure", "Footpath damage": "Public Infrastructure", "Public toilet issue": "Public Infrastructure", "Government building maintenance": "Public Infrastructure",
  };
  return mapping[cat] || cat;
};

const CATEGORIES_STRUCTURE = {
  "Roads": ["Potholes", "Road damage", "Missing road signs", "Road obstruction"],
  "Street Lighting": ["Light not working", "Pole damaged", "Exposed wiring"],
  "Water": ["Water leakage", "No water supply", "Low pressure", "Contaminated water"],
  "Sewerage": ["Drain blockage", "Sewer overflow", "Open manhole"],
  "Waste Management": ["Garbage not collected", "Overflowing bin", "Illegal dumping"],
  "Parks & Greenery": ["Fallen tree", "Tree pruning", "Park maintenance"],
  "Traffic": ["Signal malfunction", "Illegal parking", "Missing signage"],
  "Animal Control": ["Stray dogs", "Dead animal", "Cattle on road"],
  "Environment": ["Air pollution", "Noise pollution", "Water pollution"],
  "Public Infrastructure": ["Bus stop damage", "Footpath damage", "Public toilet issue", "Government building maintenance"],
};

const STAT_CARD = ({ icon, label, value, color, bg }) => (
  <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
    <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
      <i className={`fas ${icon}`} />
    </div>
    <div>
      <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-mono)', color }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  </div>
);

const AdminView = ({ activeTab: propActiveTab, setActiveTab: propSetActiveTab }) => {
  const { showToast, logoutUser, currentUser } = useAuth();

  const isMoAdmin = currentUser && currentUser.startsWith('mo-');
  const moCity = isMoAdmin ? currentUser.slice(3).replace(/-/g, ' ') : '';

  const [localActiveTab, setLocalActiveTab] = useState('issues');
  const activeTab = propActiveTab || localActiveTab;
  const setActiveTab = propSetActiveTab || setLocalActiveTab;

  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [statusSelect, setStatusSelect] = useState('Open');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [searchIssues, setSearchIssues] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchUsers, setSearchUsers] = useState('');

  // Employee form state
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empDept, setEmpDept] = useState('General');
  const [addingEmp, setAddingEmp] = useState(false);

  // Map ref for issue detail mini-map
  const detailMapRef = useRef(null);
  const detailMapInstanceRef = useRef(null);

  const fetchAll = useCallback(async () => {
    let username = '';
    try {
      const stored = localStorage.getItem('civiverse_user');
      if (stored) username = JSON.parse(stored).username || '';
    } catch {}
    setLoading(true);
    try {
      const [resIssues, resUsers] = await Promise.all([
        fetch(`/api/issues?username=${username}`),
        fetch(`/api/admin/users?key=${ADMIN_KEY}&username=${username}`)
      ]);
      if (!resIssues.ok || !resUsers.ok) throw new Error();
      const [issueData, userData] = await Promise.all([resIssues.json(), resUsers.json()]);
      setIssues(issueData);
      setUsers(userData);

      // Fetch employees if MO admin
      if (username.startsWith('mo-')) {
        const city = username.slice(3);
        const resEmp = await fetch(`/api/admin/employees?municipalOffice=${city}&key=${ADMIN_KEY}`);
        if (resEmp.ok) setEmployees(await resEmp.json());
      }
    } catch {
      showToast('Error loading admin data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Render mini-map when issue is selected
  useEffect(() => {
    if (!selectedIssue || !detailMapRef.current) return;
    const lat = selectedIssue.location?.lat || 28.77;
    const lng = selectedIssue.location?.lng || 77.47;

    if (detailMapInstanceRef.current) {
      detailMapInstanceRef.current.remove();
      detailMapInstanceRef.current = null;
    }

    setTimeout(() => {
      if (!detailMapRef.current || !window.L) return;
      const map = window.L.map(detailMapRef.current, { zoomControl: true, attributionControl: false }).setView([lat, lng], 15);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      const icon = window.L.divIcon({
        html: `<div style="width:18px;height:18px;border-radius:50%;background:var(--color-critical);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
        iconSize: [18, 18], iconAnchor: [9, 9], className: ''
      });
      window.L.marker([lat, lng], { icon }).addTo(map);
      detailMapInstanceRef.current = map;
    }, 100);

    return () => {
      if (detailMapInstanceRef.current) {
        detailMapInstanceRef.current.remove();
        detailMapInstanceRef.current = null;
      }
    };
  }, [selectedIssue]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/issues/${selectedIssue.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusSelect, note: statusNote, adminKey: ADMIN_KEY }),
      });
      if (!res.ok) throw new Error();
      showToast(`Status updated to ${statusSelect}`, 'success');
      setStatusNote('');
      await fetchAll();
      const updated = issues.find(i => i.id === selectedIssue.id);
      if (updated) { setSelectedIssue(updated); setStatusSelect(updated.status); }
    } catch {
      showToast('Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteIssue = async (id) => {
    if (!window.confirm('Delete this issue permanently?')) return;
    try {
      const res = await fetch(`/api/admin/issues/${id}?key=${ADMIN_KEY}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Issue deleted', 'success');
      if (selectedIssue?.id === id) setSelectedIssue(null);
      await fetchAll();
    } catch {
      showToast('Failed to delete issue', 'error');
    }
  };

  const handleDeleteUser = async (phone, uname) => {
    if (!window.confirm(`Remove ${uname}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${phone}?key=${ADMIN_KEY}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('User removed', 'success');
      await fetchAll();
    } catch {
      showToast('Failed to remove user', 'error');
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!empName.trim() || !empPhone.trim()) return showToast('Name and phone required', 'warning');
    setAddingEmp(true);
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: empName, phone: empPhone, email: empEmail, department: empDept, municipalOffice: moCity }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Error'); }
      showToast(`Employee ${empName} added`, 'success');
      setEmpName(''); setEmpPhone(''); setEmpEmail(''); setEmpDept('General');
      await fetchAll();
    } catch (err) {
      showToast(err.message || 'Failed to add employee', 'error');
    } finally {
      setAddingEmp(false);
    }
  };

  const handleDeleteEmployee = async (phone, uname) => {
    if (!window.confirm(`Remove employee ${uname}?`)) return;
    try {
      const res = await fetch(`/api/admin/employees/${phone}?key=${ADMIN_KEY}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Employee removed', 'success');
      await fetchAll();
    } catch {
      showToast('Failed to remove employee', 'error');
    }
  };

  // Computed stats
  const total = issues.length;
  const resolved = issues.filter(i => i.status === 'Resolved').length;
  const critical = issues.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length;
  const inProgress = issues.filter(i => i.status === 'In Progress').length;
  const citizenCount = users.filter(u => u.role === 'citizen').length;

  const filteredIssues = issues
    .filter(i => !filterStatus || i.status === filterStatus)
    .filter(i => !filterCategory || i.category === filterCategory)
    .filter(i => !searchIssues || i.title.toLowerCase().includes(searchIssues.toLowerCase()) || (i.location?.address || '').toLowerCase().includes(searchIssues.toLowerCase()));

  const filteredUsers = users.filter(u =>
    !searchUsers ||
    u.username.toLowerCase().includes(searchUsers.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchUsers.toLowerCase())
  );

  const getBadge = (issue) => {
    if (issue.status === 'Resolved') return 'badge-resolved';
    if (issue.status === 'In Progress') return 'badge-progress';
    if (issue.severity === 'Critical') return 'badge-critical';
    return 'badge-open';
  };

  const tabs = [
    { id: 'issues', icon: 'fa-list-check', label: 'Issues' },
    { id: 'users', icon: isMoAdmin ? 'fa-hard-hat' : 'fa-users', label: isMoAdmin ? 'My Team' : 'Citizens' },
    { id: 'analytics', icon: 'fa-chart-pie', label: 'Analytics' },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Admin Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(224,153,94,0.1), rgba(224,94,94,0.08))',
        border: '1px solid rgba(224,153,94,0.3)', borderRadius: 'var(--radius-md)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(224,153,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-open)' }}>
            <i className="fas fa-user-shield" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Municipal Operations Console</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Logged in as: <strong style={{ color: 'var(--color-open)' }}>{currentUser}</strong>{isMoAdmin && <span style={{ marginLeft: '8px', color: 'var(--accent-steel)' }}>— {moCity.charAt(0).toUpperCase() + moCity.slice(1)} Office</span>}</div>
          </div>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '7px 14px' }} onClick={logoutUser}>
          <i className="fas fa-sign-out-alt" /> Sign Out
        </button>
      </div>

      {/* Stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        <STAT_CARD icon="fa-file-circle-check" label="Total Issues" value={total} color="var(--accent-steel)" bg="rgba(74,120,192,0.12)" />
        <STAT_CARD icon="fa-circle-check" label="Resolved" value={resolved} color="var(--color-resolved)" bg="rgba(94,224,157,0.12)" />
        <STAT_CARD icon="fa-spinner" label="In Progress" value={inProgress} color="var(--color-progress)" bg="rgba(94,188,224,0.12)" />
        <STAT_CARD icon="fa-triangle-exclamation" label="Critical" value={critical} color="var(--color-critical)" bg="rgba(224,94,94,0.12)" />
        <STAT_CARD icon={isMoAdmin ? 'fa-hard-hat' : 'fa-users'} label={isMoAdmin ? 'Employees' : 'Citizens'} value={isMoAdmin ? employees.length : citizenCount} color="#ffc107" bg="rgba(255,193,7,0.12)" />
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid var(--border-color)', width: 'fit-content' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: activeTab === t.id ? 'linear-gradient(135deg, var(--accent-steel), #3a68b0)' : 'none',
              border: 'none', color: activeTab === t.id ? '#fff' : 'var(--text-secondary)',
              padding: '8px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-primary)',
              transition: 'all var(--transition-fast)', display: 'flex', alignItems: 'center', gap: '7px'
            }}
          >
            <i className={`fas ${t.icon}`} />{t.label}
          </button>
        ))}
      </div>

      {/* ── ISSUES TAB ── */}
      {activeTab === 'issues' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: selectedIssue ? '1fr 420px' : '1fr', gap: '16px', alignItems: 'start' }}>

          {/* Left: Issue list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 14px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '12px' }} />
                <input className="form-control" style={{ paddingLeft: '34px', fontSize: '13px' }} placeholder="Search issues..." value={searchIssues} onChange={e => setSearchIssues(e.target.value)} />
              </div>
              <select className="form-control" style={{ fontSize: '12px', width: 'auto', padding: '8px 12px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
              <select className="form-control" style={{ fontSize: '12px', width: 'auto', padding: '8px 12px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="">All Categories</option>
                {Object.entries(CATEGORIES_STRUCTURE).map(([group, subcats]) => (
                  <optgroup key={group} label={group}>
                    {subcats.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filteredIssues.length} of {total}</span>
              <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '7px 12px' }} onClick={fetchAll}>
                <i className="fas fa-refresh" />
              </button>
            </div>

            {/* Issues table */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '22px', marginBottom: '8px', display: 'block' }} />Loading...
                </div>
              ) : filteredIssues.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No issues match filters.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                      {['#', 'Title', 'Category', 'Sev.', 'Status', 'City', 'Votes', ''].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssues.map(issue => (
                      <tr
                        key={issue.id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          background: selectedIssue?.id === issue.id ? 'rgba(74,120,192,0.12)' : 'transparent',
                          transition: 'background var(--transition-fast)',
                          borderLeft: selectedIssue?.id === issue.id ? '3px solid var(--accent-steel)' : '3px solid transparent',
                        }}
                        onClick={() => { setSelectedIssue(issue); setStatusSelect(issue.status); }}
                        onMouseEnter={e => { if (selectedIssue?.id !== issue.id) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                        onMouseLeave={e => { if (selectedIssue?.id !== issue.id) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>#{issue.id}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '600', color: 'var(--text-primary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.category}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`badge ${issue.severity === 'Critical' ? 'badge-critical' : issue.severity === 'High' ? 'badge-open' : 'badge-secondary'}`}>{issue.severity}</span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`badge ${getBadge(issue)}`}>{issue.status}</span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '12px' }}>{issue.city}</td>
                        <td style={{ padding: '10px 12px', color: '#ffc107', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{issue.upvotes}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <button className="btn btn-critical" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={e => { e.stopPropagation(); handleDeleteIssue(issue.id); }}>
                            <i className="fas fa-trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right: Issue detail side panel */}
          {selectedIssue && (
            <div className="animate-fade-in glass-panel" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: '16px', maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
              {/* Panel header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexShrink: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <span className={`badge ${getBadge(selectedIssue)}`} style={{ marginBottom: '6px', display: 'inline-flex' }}>{selectedIssue.status}</span>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', lineHeight: '1.3' }}>{selectedIssue.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    <i className="fas fa-map-marker-alt" style={{ marginRight: '4px' }} />{selectedIssue.location?.address}
                  </div>
                </div>
                <button onClick={() => setSelectedIssue(null)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', padding: '6px 8px', cursor: 'pointer', flexShrink: 0 }}>
                  <i className="fas fa-times" />
                </button>
              </div>

              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Mini-map */}
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', height: '180px', position: 'relative', background: 'var(--bg-primary)' }}>
                  <div ref={detailMapRef} style={{ width: '100%', height: '100%' }} />
                  <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(10,15,26,0.85)', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>
                    {selectedIssue.location?.lat?.toFixed(4)}, {selectedIssue.location?.lng?.toFixed(4)}
                  </div>
                </div>

                {/* Metadata grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                  {[
                    ['Reporter', selectedIssue.createdBy],
                    ['Category', selectedIssue.category],
                    ['Severity', selectedIssue.severity],
                    ['City', selectedIssue.city],
                    ['Upvotes', selectedIssue.upvotes],
                    ['Date', new Date(selectedIssue.createdAt).toLocaleDateString()]
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--bg-tertiary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>{k}</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{v}</div>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{selectedIssue.description}</p>

                {/* Status update form */}
                <div style={{ background: 'rgba(224,153,94,0.05)', border: '1px dashed var(--color-open)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-open)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-user-shield" /> Update Status
                  </h4>
                  <form onSubmit={handleStatusUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="form-group">
                      <label>New Status</label>
                      <select className="form-control" value={statusSelect} onChange={e => setStatusSelect(e.target.value)}>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Crew Notes</label>
                      <textarea className="form-control" style={{ minHeight: '60px' }} placeholder="Action taken or notes..." value={statusNote} onChange={e => setStatusNote(e.target.value)} />
                    </div>
                    <button type="submit" className="btn" style={{ width: '100%' }} disabled={updatingStatus}>
                      {updatingStatus ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save" /> Save Update</>}
                    </button>
                  </form>
                </div>

                {/* Timeline */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Timeline ({selectedIssue.timeline?.length || 0})
                  </div>
                  <div className="tracking-timeline" style={{ paddingLeft: '18px' }}>
                    {(selectedIssue.timeline || []).map((node, i) => (
                      <div key={i} className={`timeline-node ${i === (selectedIssue.timeline.length - 1) ? 'active' : ''}`}>
                        <div className="timeline-circle" />
                        <div className="timeline-status" style={{ fontSize: '11px' }}>{node.status}</div>
                        <div className="timeline-note" style={{ fontSize: '12px' }}>{node.note}</div>
                        <div className="timeline-time">{new Date(node.timestamp).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MY TEAM / CITIZENS TAB ── */}
      {activeTab === 'users' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {isMoAdmin ? (
            /* ── MO Admin: My Team (Employees) ── */
            <>
              {/* Add Employee Form */}
              <div className="glass-panel">
                <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-user-plus" style={{ color: 'var(--accent-steel)' }} /> Add New Employee
                </h3>
                <form onSubmit={handleAddEmployee} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Full Name</label>
                    <input className="form-control" placeholder="Rahul Sharma" value={empName} onChange={e => setEmpName(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Phone</label>
                    <input className="form-control" placeholder="9XXXXXXXXX" value={empPhone} onChange={e => setEmpPhone(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Email (optional)</label>
                    <input className="form-control" placeholder="name@city.gov.in" value={empEmail} onChange={e => setEmpEmail(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Department</label>
                    <select className="form-control" value={empDept} onChange={e => setEmpDept(e.target.value)}>
                      <option>Roads & Infrastructure</option>
                      <option>Water & Sewerage</option>
                      <option>Street Lighting</option>
                      <option>Waste Management</option>
                      <option>Parks & Greenery</option>
                      <option>General</option>
                    </select>
                  </div>
                  <button type="submit" className="btn" style={{ padding: '10px 18px', whiteSpace: 'nowrap' }} disabled={addingEmp}>
                    {addingEmp ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus" /> Add</>}
                  </button>
                </form>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', marginBottom: 0 }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '4px' }} />
                  Employee will use their phone number to log in. Login password: their phone number (they can change it later).
                </p>
              </div>

              {/* Employee list */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Team — {moCity.charAt(0).toUpperCase() + moCity.slice(1)} Office
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{employees.length} members</span>
                </div>
                {employees.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <i className="fas fa-hard-hat" style={{ fontSize: '28px', display: 'block', marginBottom: '10px', opacity: 0.3 }} />
                    No employees yet. Add your first team member above.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                        {['Name', 'Phone', 'Email', 'Department', 'Assigned Issues', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(74,120,192,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-steel)', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                                {emp.username[0]?.toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: '700', color: '#fff' }}>{emp.username}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{emp.badge}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{emp.phone}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{emp.email}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className="badge badge-progress" style={{ fontSize: '10px' }}>{emp.department}</span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#ffc107', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{(emp.assignedIssues || []).length}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <button className="btn btn-critical" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleDeleteEmployee(emp.phone, emp.username)}>
                              <i className="fas fa-user-minus" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            /* ── Global Admin: Citizens ── */
            <>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '12px' }} />
                  <input className="form-control" style={{ paddingLeft: '34px', fontSize: '13px' }} placeholder="Search users by name or email..." value={searchUsers} onChange={e => setSearchUsers(e.target.value)} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filteredUsers.length} users</span>
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                      {['Username', 'Email', 'Phone', 'Role', 'XP', 'Badge', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}><i className="fas fa-spinner fa-spin" /></td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No users found.</td></tr>
                    ) : filteredUsers.map((user, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: '700', color: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: user.role === 'admin' ? 'rgba(224,153,94,0.2)' : 'var(--accent-steel-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: user.role === 'admin' ? 'var(--color-open)' : 'var(--accent-steel)' }}>
                              <i className={user.role === 'admin' ? 'fas fa-user-shield' : 'fas fa-user'} />
                            </div>
                            {user.username}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{user.email}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{user.phone}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className={`badge ${user.role === 'admin' ? 'badge-open' : user.role === 'employee' ? 'badge-progress' : 'badge-secondary'}`}>{user.role}</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#ffc107', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{user.xp || 0}</td>
                        <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-secondary)' }}>{user.badge}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {user.role !== 'admin' && (
                            <button className="btn btn-critical" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleDeleteUser(user.phone, user.username)}>
                              <i className="fas fa-user-minus" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {activeTab === 'analytics' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="glass-panel">
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>Issues by Category</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.keys(CATEGORIES_STRUCTURE).map((cat, i) => {
                  const count = issues.filter(iss => getParentCategory(iss.category) === cat).length;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const colors = ['var(--accent-steel)', '#2ec4b6', '#ff9f1c', 'var(--color-critical)', '#9b5de5', '#2a9d8f', '#e76f51', '#f4a261', '#457b9d', '#e63946'];
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{cat}</span>
                        <span style={{ color: colors[i], fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{count} ({pct}%)</span>
                      </div>
                      <div className="xp-bar-bg" style={{ height: '6px' }}>
                        <div className="xp-bar-fill" style={{ width: `${pct}%`, background: colors[i], transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel">
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>Status Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  ['Open', issues.filter(i => i.status === 'Open').length, 'var(--color-open)'],
                  ['In Progress', issues.filter(i => i.status === 'In Progress').length, 'var(--color-progress)'],
                  ['Resolved', issues.filter(i => i.status === 'Resolved').length, 'var(--color-resolved)'],
                ].map(([label, count, color]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                        <span style={{ color, fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{count} ({pct}%)</span>
                      </div>
                      <div className="xp-bar-bg" style={{ height: '8px' }}>
                        <div className="xp-bar-fill" style={{ width: `${pct}%`, background: color, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resolution Rate</h4>
                <div style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--color-resolved)' }}>
                  {total > 0 ? Math.round((resolved / total) * 100) : 0}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{resolved} of {total} issues resolved</div>
              </div>
            </div>
          </div>

          {/* City breakdown — only for global admin */}
          {!isMoAdmin && (
            <div className="glass-panel">
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px' }}>Issues by City</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                {[...new Set(issues.map(i => i.city).filter(Boolean))].map(city => {
                  const cityCount = issues.filter(i => i.city === city).length;
                  const cityCritical = issues.filter(i => i.city === city && i.severity === 'Critical' && i.status !== 'Resolved').length;
                  return (
                    <div key={city} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                        <i className="fas fa-city" style={{ marginRight: '6px', color: 'var(--accent-steel)', fontSize: '11px' }} />{city}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--accent-steel)', marginBottom: '4px' }}>{cityCount}</div>
                      {cityCritical > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--color-critical)' }}>
                          <i className="fas fa-triangle-exclamation" style={{ marginRight: '4px' }} />{cityCritical} critical
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top citizens */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px' }}>Top Citizens by XP</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {users.filter(u => u.role === 'citizen').sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 8).map((u, i) => (
                <div key={u.username} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderBottom: i < 7 ? '1px solid var(--border-color)' : 'none' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: i < 3 ? 'rgba(255,193,7,0.2)' : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: i < 3 ? '#ffc107' : 'var(--text-muted)', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{u.username}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.badge}</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#ffc107' }}>{u.xp || 0} XP</div>
                </div>
              ))}
              {users.filter(u => u.role === 'citizen').length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No citizens registered yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
