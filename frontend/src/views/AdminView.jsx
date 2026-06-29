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
  <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
    <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
      <i className={`fas ${icon}`} />
    </div>
    <div>
      <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  </div>
);

const getBadge = (issue) => {
  if (issue.status === 'Resolved') return 'badge-resolved';
  if (issue.status === 'In Progress') return 'badge-progress';
  if (issue.severity === 'Critical') return 'badge-critical';
  return 'badge-open';
};

const SEVERITY_COLORS = { Critical: 'var(--color-critical)', High: 'var(--color-open)', Medium: '#ffc107', Low: 'var(--color-resolved)' };

const AdminView = ({ activeTab: propActiveTab, setActiveTab: propSetActiveTab }) => {
  const { showToast, currentUser } = useAuth();

  const isMoAdmin = currentUser && currentUser.startsWith('mo-');
  const moCity = isMoAdmin ? currentUser.slice(3).replace(/-/g, ' ') : '';
  const moCityTitle = moCity.charAt(0).toUpperCase() + moCity.slice(1);

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

  // Overview map (issues tab) and detail mini-map
  const overviewMapRef = useRef(null);
  const overviewMapInstanceRef = useRef(null);
  const overviewMarkersRef = useRef([]);
  const detailMapRef = useRef(null);
  const detailMapInstanceRef = useRef(null);

  // ── DATA FETCH ────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [resIssues, resUsers] = await Promise.all([
        fetch(`/api/issues?username=${currentUser}`),
        fetch(`/api/admin/users?username=${currentUser}`)
      ]);
      const issueData = resIssues.ok ? await resIssues.json() : [];
      const userData = resUsers.ok ? await resUsers.json() : [];
      setIssues(issueData);
      setUsers(userData);

      if (currentUser.startsWith('mo-')) {
        const city = currentUser.slice(3);
        const resEmp = await fetch(`/api/admin/employees?municipalOffice=${city}`);
        if (resEmp.ok) setEmployees(await resEmp.json());
      }
    } catch (err) {
      console.error('Admin fetch error:', err);
      showToast('Error loading data — please refresh', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── OVERVIEW MAP ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!overviewMapRef.current || !window.L || issues.length === 0) return;
    if (overviewMapInstanceRef.current) {
      overviewMapInstanceRef.current.remove();
      overviewMapInstanceRef.current = null;
    }

    const issuesWithCoords = issues.filter(i => i.location?.lat && i.location?.lng);
    if (issuesWithCoords.length === 0) return;

    const defaultCenter = [issuesWithCoords[0].location.lat, issuesWithCoords[0].location.lng];
    const map = window.L.map(overviewMapRef.current, { zoomControl: true, attributionControl: false }).setView(defaultCenter, 12);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const markers = issuesWithCoords.map(issue => {
      const color = issue.status === 'Resolved' ? '#5ee09d' : issue.severity === 'Critical' ? '#e05e5e' : issue.status === 'In Progress' ? '#5ebce0' : '#e0995e';
      const icon = window.L.divIcon({
        html: `<div title="${issue.title}" style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.8);box-shadow:0 2px 6px rgba(0,0,0,0.5);cursor:pointer;transition:transform 0.15s"></div>`,
        iconSize: [12, 12], iconAnchor: [6, 6], className: '',
      });
      const marker = window.L.marker([issue.location.lat, issue.location.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:system-ui;min-width:180px;">
          <div style="font-weight:700;margin-bottom:4px;">${issue.title}</div>
          <div style="font-size:11px;color:#666;margin-bottom:4px;">${issue.category} · ${issue.city}</div>
          <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${color};color:#fff;">${issue.status}</span>
        </div>
      `, { maxWidth: 220 });
      marker.on('click', () => { setSelectedIssue(issue); setStatusSelect(issue.status); });
      return marker;
    });

    overviewMarkersRef.current = markers;
    overviewMapInstanceRef.current = map;

    // Fit bounds
    const group = window.L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.15));

    return () => {
      if (overviewMapInstanceRef.current) {
        overviewMapInstanceRef.current.remove();
        overviewMapInstanceRef.current = null;
      }
    };
  }, [issues, activeTab]);

  // Highlight selected marker on overview map
  useEffect(() => {
    if (!overviewMapInstanceRef.current || !selectedIssue) return;
    const lat = selectedIssue.location?.lat;
    const lng = selectedIssue.location?.lng;
    if (lat && lng) overviewMapInstanceRef.current.setView([lat, lng], 15, { animate: true });
  }, [selectedIssue]);

  // ── DETAIL MINI-MAP ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedIssue || !detailMapRef.current) return;
    const lat = selectedIssue.location?.lat || 28.77;
    const lng = selectedIssue.location?.lng || 77.47;

    if (detailMapInstanceRef.current) {
      detailMapInstanceRef.current.remove();
      detailMapInstanceRef.current = null;
    }

    const timer = setTimeout(() => {
      if (!detailMapRef.current || !window.L) return;
      const map = window.L.map(detailMapRef.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false }).setView([lat, lng], 15);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      const icon = window.L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:var(--color-critical);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8], className: '',
      });
      window.L.marker([lat, lng], { icon }).addTo(map);
      detailMapInstanceRef.current = map;
    }, 80);

    return () => {
      clearTimeout(timer);
      if (detailMapInstanceRef.current) { detailMapInstanceRef.current.remove(); detailMapInstanceRef.current = null; }
    };
  }, [selectedIssue]);

  // ── HANDLERS ─────────────────────────────────────────────────────────────
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
      showToast(`Status → ${statusSelect}`, 'success');
      setStatusNote('');
      await fetchAll();
    } catch { showToast('Failed to update status', 'error'); }
    finally { setUpdatingStatus(false); }
  };

  const handleDeleteIssue = async (id) => {
    if (!window.confirm('Delete this issue permanently?')) return;
    try {
      const res = await fetch(`/api/admin/issues/${id}?key=${ADMIN_KEY}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Issue deleted', 'success');
      if (selectedIssue?.id === id) setSelectedIssue(null);
      await fetchAll();
    } catch { showToast('Failed to delete issue', 'error'); }
  };

  const handleDeleteUser = async (phone, uname) => {
    if (!window.confirm(`Remove ${uname}?`)) return;
    try {
      await fetch(`/api/admin/users/${phone}?key=${ADMIN_KEY}`, { method: 'DELETE' });
      showToast('User removed', 'success');
      await fetchAll();
    } catch { showToast('Failed', 'error'); }
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
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
    finally { setAddingEmp(false); }
  };

  const handleDeleteEmployee = async (phone, uname) => {
    if (!window.confirm(`Remove ${uname}?`)) return;
    try {
      await fetch(`/api/admin/employees/${phone}?key=${ADMIN_KEY}`, { method: 'DELETE' });
      showToast('Employee removed', 'success');
      await fetchAll();
    } catch { showToast('Failed', 'error'); }
  };

  // ── COMPUTED ──────────────────────────────────────────────────────────────
  const total = issues.length;
  const resolved = issues.filter(i => i.status === 'Resolved').length;
  const critical = issues.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length;
  const inProgress = issues.filter(i => i.status === 'In Progress').length;

  const filteredIssues = issues
    .filter(i => !filterStatus || i.status === filterStatus)
    .filter(i => !filterCategory || i.category === filterCategory)
    .filter(i => !searchIssues || i.title.toLowerCase().includes(searchIssues.toLowerCase()) || (i.location?.address || '').toLowerCase().includes(searchIssues.toLowerCase()));

  const filteredUsers = users.filter(u =>
    !searchUsers || u.username.toLowerCase().includes(searchUsers.toLowerCase()) || (u.email || '').toLowerCase().includes(searchUsers.toLowerCase())
  );

  const tabs = [
    { id: 'issues', icon: 'fa-list-check', label: 'Issues' },
    { id: 'users', icon: isMoAdmin ? 'fa-hard-hat' : 'fa-users', label: isMoAdmin ? 'My Team' : 'Citizens' },
    { id: 'analytics', icon: 'fa-chart-pie', label: 'Analytics' },
  ];

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
        <STAT_CARD icon="fa-file-circle-check" label="Total Issues" value={total} color="var(--accent-steel)" bg="rgba(74,120,192,0.12)" />
        <STAT_CARD icon="fa-circle-check" label="Resolved" value={resolved} color="var(--color-resolved)" bg="rgba(94,224,157,0.12)" />
        <STAT_CARD icon="fa-spinner" label="In Progress" value={inProgress} color="var(--color-progress)" bg="rgba(94,188,224,0.12)" />
        <STAT_CARD icon="fa-triangle-exclamation" label="Critical" value={critical} color="var(--color-critical)" bg="rgba(224,94,94,0.12)" />
        <STAT_CARD icon={isMoAdmin ? 'fa-hard-hat' : 'fa-users'} label={isMoAdmin ? 'Employees' : 'Citizens'} value={isMoAdmin ? employees.length : users.filter(u => u.role === 'citizen').length} color="#ffc107" bg="rgba(255,193,7,0.12)" />
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid var(--border-color)', width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            background: activeTab === t.id ? 'linear-gradient(135deg, var(--accent-steel), #3a68b0)' : 'none',
            border: 'none', color: activeTab === t.id ? '#fff' : 'var(--text-secondary)',
            padding: '8px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-primary)',
            transition: 'all var(--transition-fast)', display: 'flex', alignItems: 'center', gap: '7px',
          }}>
            <i className={`fas ${t.icon}`} />{t.label}
          </button>
        ))}
      </div>

      {/* ── ISSUES TAB: 50/50 Map + List ── */}
      {activeTab === 'issues' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', height: 'calc(100vh - 300px)', minHeight: '460px' }}>

          {/* LEFT: Overview map */}
          <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
            <div ref={overviewMapRef} style={{ width: '100%', height: '100%' }} />
            {loading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,15,26,0.7)', zIndex: 10 }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--accent-steel)' }} />
              </div>
            )}
            {!loading && issues.filter(i => i.location?.lat).length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '8px' }}>
                <i className="fas fa-map" style={{ fontSize: '28px', opacity: 0.3 }} />
                <div style={{ fontSize: '12px' }}>No geo-tagged issues</div>
              </div>
            )}
            {/* Map legend */}
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(10,15,26,0.85)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: '10px', zIndex: 500 }}>
              {[['Critical', '#e05e5e'], ['Open', '#e0995e'], ['In Progress', '#5ebce0'], ['Resolved', '#5ee09d']].map(([l, c]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{l}</span>
                </div>
              ))}
            </div>
            <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(10,15,26,0.85)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: '11px', fontWeight: '700', color: '#fff', zIndex: 500 }}>
              <i className="fas fa-map-marker-alt" style={{ marginRight: '6px', color: 'var(--accent-steel)' }} />
              {issues.filter(i => i.location?.lat).length} issues mapped
              {selectedIssue && <span style={{ color: 'var(--accent-steel)', marginLeft: '8px' }}>· {selectedIssue.city}</span>}
            </div>
          </div>

          {/* RIGHT: Issue list or detail panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
            {/* Filters row */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '120px' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '11px' }} />
                <input className="form-control" style={{ paddingLeft: '28px', fontSize: '12px', padding: '7px 10px 7px 28px' }} placeholder="Search..." value={searchIssues} onChange={e => setSearchIssues(e.target.value)} />
              </div>
              <select className="form-control" style={{ fontSize: '11px', width: 'auto', padding: '7px 10px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
              <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '7px 10px' }} onClick={fetchAll} title="Refresh">
                <i className="fas fa-refresh" />
              </button>
              {selectedIssue && (
                <button style={{ fontSize: '11px', padding: '7px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setSelectedIssue(null)}>
                  <i className="fas fa-arrow-left" style={{ marginRight: '4px' }} />List
                </button>
              )}
            </div>

            {/* Issue list OR detail panel (toggling) */}
            {!selectedIssue ? (
              /* ─ Issue list ─ */
              <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}><i className="fas fa-spinner fa-spin" /></div>
                ) : filteredIssues.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No issues found.</div>
                ) : (
                  <div style={{ overflowY: 'auto', height: '100%' }}>
                    {filteredIssues.map(issue => (
                      <div
                        key={issue.id}
                        onClick={() => { setSelectedIssue(issue); setStatusSelect(issue.status); }}
                        style={{
                          padding: '10px 14px', borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer', transition: 'background var(--transition-fast)',
                          display: 'flex', gap: '10px', alignItems: 'flex-start',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: SEVERITY_COLORS[issue.severity] || 'var(--color-open)', marginTop: '5px', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</div>
                            <span className={`badge ${getBadge(issue)}`} style={{ fontSize: '9px', flexShrink: 0 }}>{issue.status}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                            <span>{issue.category}</span>
                            <span>·</span>
                            <span>{issue.city}</span>
                            <span>·</span>
                            <span style={{ color: '#ffc107' }}>▲ {issue.upvotes}</span>
                          </div>
                        </div>
                        <button className="btn btn-critical" style={{ padding: '3px 7px', fontSize: '10px', flexShrink: 0 }} onClick={e => { e.stopPropagation(); handleDeleteIssue(issue.id); }}>
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ─ Issue detail panel ─ */
              <div className="animate-fade-in" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Detail header */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className={`badge ${getBadge(selectedIssue)}`}>{selectedIssue.status}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-critical" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleDeleteIssue(selectedIssue.id)}><i className="fas fa-trash" /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{selectedIssue.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    <i className="fas fa-map-marker-alt" style={{ marginRight: '4px' }} />{selectedIssue.location?.address}
                  </div>
                </div>

                {/* Two-column below: map | metadata+form */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', overflow: 'hidden', minHeight: 0 }}>
                  {/* Mini-map */}
                  <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', background: 'var(--bg-primary)' }}>
                    <div ref={detailMapRef} style={{ width: '100%', height: '100%' }} />
                    <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(10,15,26,0.85)', padding: '3px 7px', borderRadius: '4px', fontSize: '9px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', pointerEvents: 'none', zIndex: 500 }}>
                      {selectedIssue.location?.lat?.toFixed(4)}, {selectedIssue.location?.lng?.toFixed(4)}
                    </div>
                  </div>

                  {/* Right side: metadata + form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
                    {/* Metadata grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                      {[
                        ['Reporter', selectedIssue.createdBy],
                        ['Category', selectedIssue.category],
                        ['Severity', selectedIssue.severity],
                        ['City', selectedIssue.city],
                        ['Upvotes', selectedIssue.upvotes],
                        ['Date', new Date(selectedIssue.createdAt).toLocaleDateString()],
                      ].map(([k, v]) => (
                        <div key={k} style={{ background: 'var(--bg-tertiary)', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{k}</div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    <div style={{ background: 'var(--bg-tertiary)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', maxHeight: '60px', overflowY: 'auto' }}>
                      {selectedIssue.description}
                    </div>

                    {/* Status update */}
                    <form onSubmit={handleStatusUpdate} style={{ background: 'rgba(224,153,94,0.05)', border: '1px dashed var(--color-open)', borderRadius: 'var(--radius-sm)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-open)' }}><i className="fas fa-user-shield" style={{ marginRight: '4px' }} />Update Status</div>
                      <select className="form-control" style={{ fontSize: '12px', padding: '6px 8px' }} value={statusSelect} onChange={e => setStatusSelect(e.target.value)}>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                      <textarea className="form-control" style={{ minHeight: '50px', fontSize: '12px', padding: '6px 8px', resize: 'none' }} placeholder="Notes..." value={statusNote} onChange={e => setStatusNote(e.target.value)} />
                      <button type="submit" className="btn" style={{ width: '100%', padding: '7px', fontSize: '12px' }} disabled={updatingStatus}>
                        {updatingStatus ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save" /> Save</>}
                      </button>
                    </form>

                    {/* Timeline (compact) */}
                    {(selectedIssue.timeline || []).length > 0 && (
                      <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: '8px', fontSize: '11px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '9px' }}>Timeline</div>
                        {(selectedIssue.timeline || []).slice(-3).map((n, i) => (
                          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-steel)', marginTop: '4px', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: '700', color: '#fff' }}>{n.status}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{n.note}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MY TEAM / CITIZENS TAB ── */}
      {activeTab === 'users' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isMoAdmin ? (
            <>
              {/* Add Employee Form */}
              <div className="glass-panel">
                <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-user-plus" style={{ color: 'var(--accent-steel)' }} /> Add New Employee — {moCityTitle} Office
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
                  <button type="submit" className="btn" style={{ padding: '10px 18px' }} disabled={addingEmp}>
                    {addingEmp ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus" /> Add</>}
                  </button>
                </form>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Team — {moCityTitle} Office</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{employees.length} members</span>
                </div>
                {employees.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <i className="fas fa-hard-hat" style={{ fontSize: '28px', display: 'block', marginBottom: '10px', opacity: 0.3 }} />No employees yet.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead><tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                      {['Name', 'Phone', 'Department', 'Assigned', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {employees.map((emp, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(74,120,192,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-steel)', fontSize: '12px', fontWeight: '700' }}>{emp.username[0]?.toUpperCase()}</div>
                              <div>
                                <div style={{ fontWeight: '700', color: '#fff' }}>{emp.username}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{emp.badge}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{emp.phone}</td>
                          <td style={{ padding: '10px 14px' }}><span className="badge badge-progress" style={{ fontSize: '10px' }}>{emp.department}</span></td>
                          <td style={{ padding: '10px 14px', color: '#ffc107', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{(emp.assignedIssues || []).length}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <button className="btn btn-critical" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleDeleteEmployee(emp.phone, emp.username)}><i className="fas fa-user-minus" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '12px' }} />
                  <input className="form-control" style={{ paddingLeft: '34px', fontSize: '13px' }} placeholder="Search users..." value={searchUsers} onChange={e => setSearchUsers(e.target.value)} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filteredUsers.length} users</span>
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                    {['Username', 'Email', 'Phone', 'Role', 'XP', 'Badge', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center' }}><i className="fas fa-spinner fa-spin" /></td></tr>
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
                        <td style={{ padding: '10px 14px' }}><span className={`badge ${user.role === 'admin' ? 'badge-open' : user.role === 'employee' ? 'badge-progress' : 'badge-secondary'}`}>{user.role}</span></td>
                        <td style={{ padding: '10px 14px', color: '#ffc107', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{user.xp || 0}</td>
                        <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-secondary)' }}>{user.badge}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {user.role !== 'admin' && <button className="btn btn-critical" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleDeleteUser(user.phone, user.username)}><i className="fas fa-user-minus" /></button>}
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
                      <div className="xp-bar-bg" style={{ height: '6px' }}><div className="xp-bar-fill" style={{ width: `${pct}%`, background: colors[i], transition: 'width 0.6s ease' }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel">
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>Status Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[['Open', issues.filter(i => i.status === 'Open').length, 'var(--color-open)'],
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
                      <div className="xp-bar-bg" style={{ height: '8px' }}><div className="xp-bar-fill" style={{ width: `${pct}%`, background: color, transition: 'width 0.6s ease' }} /></div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '34px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--color-resolved)' }}>{total > 0 ? Math.round((resolved / total) * 100) : 0}%</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Resolution Rate — {resolved}/{total}</div>
              </div>
            </div>
          </div>

          {!isMoAdmin && (
            <div className="glass-panel">
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px' }}>Issues by City</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                {[...new Set(issues.map(i => i.city).filter(Boolean))].map(city => {
                  const cc = issues.filter(i => i.city === city).length;
                  const crit = issues.filter(i => i.city === city && i.severity === 'Critical' && i.status !== 'Resolved').length;
                  return (
                    <div key={city} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                        <i className="fas fa-city" style={{ marginRight: '6px', color: 'var(--accent-steel)', fontSize: '11px' }} />{city}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--accent-steel)' }}>{cc}</div>
                      {crit > 0 && <div style={{ fontSize: '11px', color: 'var(--color-critical)' }}><i className="fas fa-triangle-exclamation" style={{ marginRight: '4px' }} />{crit} critical</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminView;
