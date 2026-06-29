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

const SEVERITY_COLORS = { Critical: '#e05e5e', High: '#e0995e', Medium: '#ffc107', Low: '#5ee09d' };
const STATUS_COLORS = { Resolved: '#5ee09d', 'In Progress': '#5ebce0', Open: '#e0995e' };

const getBadgeClass = (issue) => {
  if (issue.status === 'Resolved') return 'badge-resolved';
  if (issue.status === 'In Progress') return 'badge-progress';
  if (issue.severity === 'Critical') return 'badge-critical';
  return 'badge-open';
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

// ─────────────────────────────────────────────────────────────────────────────
// ISSUE DETAIL OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
const IssueOverlay = ({ issue, employees, isMoAdmin, onClose, onStatusUpdate, onDelete, onAssign }) => {
  const [statusSelect, setStatusSelect] = useState(issue.status);
  const [statusNote, setStatusNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [assigning, setAssigning] = useState(false);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onStatusUpdate(issue.id, statusSelect, statusNote);
    setStatusNote('');
    setSaving(false);
  };

  const handleAssign = async () => {
    if (!assignTo) return;
    setAssigning(true);
    await onAssign(issue.id, assignTo);
    setAssigning(false);
  };

  const assignedEmp = employees.find(e => (e.assignedIssues || []).includes(issue.id));

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(5, 8, 18, 0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', animation: 'fadeIn 0.2s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg, 16px)', width: '100%', maxWidth: '900px',
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        {/* ── Overlay Header ── */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          background: 'linear-gradient(135deg, rgba(74,120,192,0.08), rgba(10,15,26,0))',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span className={`badge ${getBadgeClass(issue)}`}>{issue.status}</span>
              <span style={{ fontSize: '10px', fontWeight: '700', color: SEVERITY_COLORS[issue.severity] || '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: '4px' }} />{issue.severity}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>#{issue.id}</span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0, lineHeight: '1.3' }}>{issue.title}</h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span><i className="fas fa-map-marker-alt" style={{ marginRight: '5px', color: 'var(--accent-steel)' }} />{issue.location?.address}</span>
              <span><i className="fas fa-city" style={{ marginRight: '5px' }} />{issue.city}</span>
              <span><i className="fas fa-calendar" style={{ marginRight: '5px' }} />{new Date(issue.createdAt).toLocaleDateString()}</span>
              <span style={{ color: '#ffc107' }}><i className="fas fa-arrow-up" style={{ marginRight: '5px' }} />{issue.upvotes} upvotes</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => onDelete(issue.id)}
              style={{ background: 'rgba(224,94,94,0.1)', border: '1px solid rgba(224,94,94,0.3)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', cursor: 'pointer', color: 'var(--color-critical)', fontSize: '12px', fontWeight: '700' }}
            >
              <i className="fas fa-trash" />
            </button>
            <button
              onClick={onClose}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        {/* ── Overlay Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>

          {/* Left: Details + Timeline */}
          <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Description */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Description</div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7', margin: 0, background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                {issue.description}
              </p>
            </div>

            {/* Metadata grid */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  ['Reporter', issue.createdBy, 'fa-user'],
                  ['Category', issue.category, 'fa-tag'],
                  ['Parent Category', getParentCategory(issue.category), 'fa-layer-group'],
                  ['Location', issue.location?.address, 'fa-map-pin'],
                  ['Coordinates', `${issue.location?.lat?.toFixed(4)}, ${issue.location?.lng?.toFixed(4)}`, 'fa-crosshairs'],
                  ['Reported On', new Date(issue.createdAt).toLocaleString(), 'fa-calendar-alt'],
                ].map(([k, v, ic]) => (
                  <div key={k} style={{ background: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>
                      <i className={`fas ${ic}`} style={{ fontSize: '9px' }} />{k}
                    </div>
                    <div style={{ color: '#fff', fontWeight: '600', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            {(issue.timeline || []).length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Timeline ({issue.timeline.length})
                </div>
                <div style={{ position: 'relative', paddingLeft: '18px' }}>
                  <div style={{ position: 'absolute', left: '5px', top: '4px', bottom: '4px', width: '2px', background: 'var(--border-color)' }} />
                  {issue.timeline.map((node, i) => (
                    <div key={i} style={{ position: 'relative', marginBottom: i < issue.timeline.length - 1 ? '12px' : 0 }}>
                      <div style={{ position: 'absolute', left: '-17px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: i === issue.timeline.length - 1 ? 'var(--accent-steel)' : 'var(--border-color)', border: '2px solid var(--bg-secondary)' }} />
                      <div style={{ fontSize: '12px', fontWeight: '700', color: i === issue.timeline.length - 1 ? '#fff' : 'var(--text-secondary)' }}>{node.status}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0' }}>{node.note}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(node.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Update Status */}
            <div style={{ background: 'rgba(224,153,94,0.05)', border: '1px solid rgba(224,153,94,0.25)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-open)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-user-shield" /> Update Status
              </div>
              <form onSubmit={handleStatusUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  {['Open', 'In Progress', 'Resolved'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusSelect(s)}
                      style={{
                        padding: '8px 6px', border: '1px solid', borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer', fontSize: '11px', fontWeight: '700', transition: 'all 0.15s',
                        background: statusSelect === s ? STATUS_COLORS[s] + '22' : 'var(--bg-tertiary)',
                        borderColor: statusSelect === s ? STATUS_COLORS[s] : 'var(--border-color)',
                        color: statusSelect === s ? STATUS_COLORS[s] : 'var(--text-secondary)',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Crew Notes</label>
                  <textarea className="form-control" style={{ minHeight: '80px', resize: 'none' }} placeholder="Action taken, updates for the citizen..." value={statusNote} onChange={e => setStatusNote(e.target.value)} />
                </div>
                <button type="submit" className="btn" style={{ width: '100%' }} disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> Saving...</> : <><i className="fas fa-save" /> Save Status Update</>}
                </button>
              </form>
            </div>

            {/* Assign to Employee (MO admins only) */}
            {isMoAdmin && (
              <div style={{ background: 'rgba(74,120,192,0.05)', border: '1px solid rgba(74,120,192,0.25)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-steel)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-hard-hat" /> Assign to Employee
                </div>

                {assignedEmp && (
                  <div style={{ background: 'rgba(74,120,192,0.08)', border: '1px solid rgba(74,120,192,0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(74,120,192,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-steel)', fontSize: '12px', fontWeight: '800' }}>
                      {assignedEmp.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{assignedEmp.username}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Currently assigned · {assignedEmp.department}</div>
                    </div>
                    <i className="fas fa-check-circle" style={{ marginLeft: 'auto', color: 'var(--color-resolved)', fontSize: '16px' }} />
                  </div>
                )}

                {employees.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '6px' }} />No employees in your team yet
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="form-control" style={{ flex: 1, fontSize: '12px' }} value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                      <option value="">Select employee...</option>
                      {employees.map(emp => (
                        <option key={emp.phone} value={emp.phone}>{emp.username} — {emp.department}</option>
                      ))}
                    </select>
                    <button className="btn" style={{ whiteSpace: 'nowrap', padding: '8px 14px', fontSize: '12px' }} onClick={handleAssign} disabled={!assignTo || assigning}>
                      {assigning ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-user-check" /> Assign</>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Photo evidence */}
            {issue.imageUrl && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  <i className="fas fa-image" style={{ marginRight: '5px' }} />Photo Evidence
                </div>
                <img src={issue.imageUrl} alt="Issue" style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', objectFit: 'cover', maxHeight: '180px' }} onError={e => { e.target.style.display = 'none'; }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN VIEW
// ─────────────────────────────────────────────────────────────────────────────
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

  // Issues tab state
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchIssues, setSearchIssues] = useState('');
  const [overlayIssue, setOverlayIssue] = useState(null);

  // Employee form
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empDept, setEmpDept] = useState('General');
  const [addingEmp, setAddingEmp] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');

  // Map
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // ── FETCH ─────────────────────────────────────────────────────────────────
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
      console.error('[Admin] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── MAP ───────────────────────────────────────────────────────────────────
  const filteredIssues = issues
    .filter(i => !filterStatus || i.status === filterStatus)
    .filter(i => !filterCategory || i.category === filterCategory)
    .filter(i => !searchIssues || i.title.toLowerCase().includes(searchIssues.toLowerCase()) || (i.location?.address || '').toLowerCase().includes(searchIssues.toLowerCase()));

  const buildMap = useCallback(() => {
    if (!mapRef.current || !window.L) return;

    // Destroy old instance
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    markersRef.current = [];

    const issuesWithCoords = filteredIssues.filter(i => i.location?.lat && i.location?.lng);
    if (issuesWithCoords.length === 0) return;

    const center = [issuesWithCoords[0].location.lat, issuesWithCoords[0].location.lng];
    const map = window.L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView(center, 12);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    issuesWithCoords.forEach(issue => {
      const c = issue.severity === 'Critical' ? '#e05e5e' : issue.status === 'Resolved' ? '#5ee09d' : issue.status === 'In Progress' ? '#5ebce0' : '#e0995e';
      const size = issue.severity === 'Critical' ? 16 : 12;
      const icon = window.L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${c};border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:pointer;transition:transform 0.15s ease;"></div>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2], className: '',
      });

      const marker = window.L.marker([issue.location.lat, issue.location.lng], { icon })
        .bindTooltip(`<b>${issue.title}</b><br/>${issue.category} · ${issue.city}`, { direction: 'top', offset: [0, -8] })
        .addTo(map);

      marker.on('click', () => { setOverlayIssue(issue); });
      markersRef.current.push(marker);
    });

    // Fit all markers
    if (markersRef.current.length > 0) {
      const group = window.L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.12));
    }

    mapInstanceRef.current = map;
  }, [filteredIssues]);

  useEffect(() => {
    if (activeTab === 'issues' && viewMode === 'map') {
      const timer = setTimeout(buildMap, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, [activeTab, viewMode, buildMap]);

  // ── HANDLERS ─────────────────────────────────────────────────────────────
  const handleStatusUpdate = async (issueId, status, note) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note, adminKey: ADMIN_KEY }),
      });
      if (!res.ok) throw new Error();
      showToast(`Status updated to ${status}`, 'success');
      await fetchAll();
      // Refresh overlay issue
      setOverlayIssue(prev => prev?.id === issueId ? { ...prev, status, timeline: [...(prev.timeline || []), { status, note, timestamp: new Date().toISOString() }] } : prev);
    } catch { showToast('Failed to update status', 'error'); }
  };

  const handleDeleteIssue = async (id) => {
    if (!window.confirm('Delete this issue permanently?')) return;
    try {
      await fetch(`/api/admin/issues/${id}?key=${ADMIN_KEY}`, { method: 'DELETE' });
      showToast('Issue deleted', 'success');
      setOverlayIssue(null);
      await fetchAll();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleAssign = async (issueId, employeePhone) => {
    try {
      const res = await fetch(`/api/admin/employees/${employeePhone}/assign/${issueId}`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const emp = employees.find(e => e.phone === employeePhone);
      showToast(`Assigned to ${emp?.username || 'employee'}`, 'success');
      await fetchAll();
    } catch { showToast('Failed to assign', 'error'); }
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

  // ── COMPUTED STATS ────────────────────────────────────────────────────────
  const total = issues.length;
  const resolved = issues.filter(i => i.status === 'Resolved').length;
  const critical = issues.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length;
  const inProgress = issues.filter(i => i.status === 'In Progress').length;
  const citizenCount = users.filter(u => u.role === 'citizen').length;

  const tabs = [
    { id: 'issues', icon: 'fa-list-check', label: 'Issues' },
    { id: 'users', icon: isMoAdmin ? 'fa-hard-hat' : 'fa-users', label: isMoAdmin ? 'My Team' : 'Citizens' },
    { id: 'analytics', icon: 'fa-chart-pie', label: 'Analytics' },
  ];

  const filteredUsers = users.filter(u =>
    !searchUsers || u.username.toLowerCase().includes(searchUsers.toLowerCase()) || (u.email || '').toLowerCase().includes(searchUsers.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
        <STAT_CARD icon="fa-file-circle-check" label="Total Issues" value={total} color="var(--accent-steel)" bg="rgba(74,120,192,0.12)" />
        <STAT_CARD icon="fa-circle-check" label="Resolved" value={resolved} color="var(--color-resolved)" bg="rgba(94,224,157,0.12)" />
        <STAT_CARD icon="fa-spinner" label="In Progress" value={inProgress} color="var(--color-progress)" bg="rgba(94,188,224,0.12)" />
        <STAT_CARD icon="fa-triangle-exclamation" label="Critical" value={critical} color="var(--color-critical)" bg="rgba(224,94,94,0.12)" />
        <STAT_CARD icon={isMoAdmin ? 'fa-hard-hat' : 'fa-users'} label={isMoAdmin ? 'Employees' : 'Citizens'} value={isMoAdmin ? employees.length : citizenCount} color="#ffc107" bg="rgba(255,193,7,0.12)" />
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

      {/* ── ISSUES TAB ── */}
      {activeTab === 'issues' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
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
                  {subcats.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </optgroup>
              ))}
            </select>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filteredIssues.length} issues</span>
            <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '8px 12px' }} onClick={fetchAll} title="Refresh"><i className="fas fa-refresh" /></button>
            {/* Map / List toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {[['map', 'fa-map', 'Map'], ['list', 'fa-list', 'List']].map(([id, icon, label]) => (
                <button key={id} onClick={() => setViewMode(id)} style={{
                  padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                  background: viewMode === id ? 'var(--accent-steel)' : 'transparent',
                  color: viewMode === id ? '#fff' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
                }}>
                  <i className={`fas ${icon}`} />{label}
                </button>
              ))}
            </div>
          </div>

          {/* Map view */}
          {viewMode === 'map' && (
            <div style={{ position: 'relative', height: 'calc(100vh - 300px)', minHeight: '480px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
              <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
              {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,15,26,0.7)', zIndex: 10 }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: 'var(--accent-steel)' }} />
                </div>
              )}
              {!loading && filteredIssues.filter(i => i.location?.lat).length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '10px' }}>
                  <i className="fas fa-map" style={{ fontSize: '36px', opacity: 0.2 }} />
                  <div style={{ fontSize: '14px' }}>No geo-tagged issues to display</div>
                </div>
              )}
              {/* Legend */}
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(10,15,26,0.9)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '11px', zIndex: 500, border: '1px solid var(--border-color)' }}>
                {[['Critical', '#e05e5e'], ['Open', '#e0995e'], ['In Progress', '#5ebce0'], ['Resolved', '#5ee09d']].map(([l, c]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: c, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{l}</span>
                  </div>
                ))}
              </div>
              {/* Tip */}
              <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(10,15,26,0.9)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: '11px', zIndex: 500, border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <i className="fas fa-hand-pointer" style={{ marginRight: '6px', color: 'var(--accent-steel)' }} />Click any pin to view details
              </div>
            </div>
          )}

          {/* List view */}
          {viewMode === 'list' && (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '22px' }} /></div>
              ) : filteredIssues.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No issues match filters.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                      {['#', 'Title', 'Category', 'Severity', 'Status', 'City', 'Votes', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssues.map(issue => (
                      <tr key={issue.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                        onClick={() => setOverlayIssue(issue)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>#{issue.id}</td>
                        <td style={{ padding: '10px 14px', fontWeight: '700', color: '#fff', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{issue.category}</td>
                        <td style={{ padding: '10px 14px' }}><span className={`badge ${issue.severity === 'Critical' ? 'badge-critical' : issue.severity === 'High' ? 'badge-open' : 'badge-secondary'}`}>{issue.severity}</span></td>
                        <td style={{ padding: '10px 14px' }}><span className={`badge ${getBadgeClass(issue)}`}>{issue.status}</span></td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{issue.city}</td>
                        <td style={{ padding: '10px 14px', color: '#ffc107', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{issue.upvotes}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '11px', marginRight: '6px' }} onClick={e => { e.stopPropagation(); setOverlayIssue(issue); }}>
                            <i className="fas fa-eye" />
                          </button>
                          <button className="btn btn-critical" style={{ padding: '5px 10px', fontSize: '11px' }} onClick={e => { e.stopPropagation(); handleDeleteIssue(issue.id); }}>
                            <i className="fas fa-trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── USERS / MY TEAM TAB ── */}
      {activeTab === 'users' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isMoAdmin ? (
            <>
              <div className="glass-panel">
                <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-user-plus" style={{ color: 'var(--accent-steel)' }} /> Add New Employee — {moCityTitle} Office
                </h3>
                <form onSubmit={handleAddEmployee} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                  <div className="form-group" style={{ margin: 0 }}><label>Full Name</label><input className="form-control" placeholder="Rahul Sharma" value={empName} onChange={e => setEmpName(e.target.value)} required /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>Phone</label><input className="form-control" placeholder="9XXXXXXXXX" value={empPhone} onChange={e => setEmpPhone(e.target.value)} required /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>Email (optional)</label><input className="form-control" placeholder="name@city.gov.in" value={empEmail} onChange={e => setEmpEmail(e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>Department</label>
                    <select className="form-control" value={empDept} onChange={e => setEmpDept(e.target.value)}>
                      <option>Roads & Infrastructure</option><option>Water & Sewerage</option><option>Street Lighting</option><option>Waste Management</option><option>Parks & Greenery</option><option>General</option>
                    </select>
                  </div>
                  <button type="submit" className="btn" style={{ padding: '10px 18px' }} disabled={addingEmp}>{addingEmp ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus" /> Add</>}</button>
                </form>
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Team — {moCityTitle} Office</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{employees.length} members</span>
                </div>
                {employees.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}><i className="fas fa-hard-hat" style={{ fontSize: '28px', display: 'block', marginBottom: '10px', opacity: 0.3 }} />No employees yet.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead><tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                      {['Name', 'Phone', 'Department', 'Assigned Issues', 'Actions'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>{employees.map((emp, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(74,120,192,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-steel)', fontWeight: '700' }}>{emp.username[0]?.toUpperCase()}</div>
                            <div><div style={{ fontWeight: '700', color: '#fff' }}>{emp.username}</div><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{emp.badge}</div></div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{emp.phone}</td>
                        <td style={{ padding: '10px 14px' }}><span className="badge badge-progress" style={{ fontSize: '10px' }}>{emp.department}</span></td>
                        <td style={{ padding: '10px 14px', color: '#ffc107', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{(emp.assignedIssues || []).length}</td>
                        <td style={{ padding: '10px 14px' }}><button className="btn btn-critical" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleDeleteEmployee(emp.phone, emp.username)}><i className="fas fa-user-minus" /></button></td>
                      </tr>
                    ))}</tbody>
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
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{filteredUsers.length} users</span>
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                    {['Username', 'Email', 'Phone', 'Role', 'XP', 'Badge', 'Actions'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {loading ? <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center' }}><i className="fas fa-spinner fa-spin" /></td></tr>
                      : filteredUsers.map((user, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '700', color: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: user.role === 'admin' ? 'rgba(224,153,94,0.2)' : 'var(--accent-steel-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: user.role === 'admin' ? 'var(--color-open)' : 'var(--accent-steel)' }}>
                                <i className={user.role === 'admin' ? 'fas fa-user-shield' : 'fas fa-user'} />
                              </div>{user.username}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{user.email}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{user.phone}</td>
                          <td style={{ padding: '10px 14px' }}><span className={`badge ${user.role === 'admin' ? 'badge-open' : user.role === 'employee' ? 'badge-progress' : 'badge-secondary'}`}>{user.role}</span></td>
                          <td style={{ padding: '10px 14px', color: '#ffc107', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{user.xp || 0}</td>
                          <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-secondary)' }}>{user.badge}</td>
                          <td style={{ padding: '10px 14px' }}>{user.role !== 'admin' && <button className="btn btn-critical" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleDeleteUser(user.phone, user.username)}><i className="fas fa-user-minus" /></button>}</td>
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
              {[['Open', issues.filter(i => i.status === 'Open').length, 'var(--color-open)'],
                ['In Progress', issues.filter(i => i.status === 'In Progress').length, 'var(--color-progress)'],
                ['Resolved', issues.filter(i => i.status === 'Resolved').length, 'var(--color-resolved)'],
              ].map(([label, count, color]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={label} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ color, fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{count} ({pct}%)</span>
                    </div>
                    <div className="xp-bar-bg" style={{ height: '8px' }}><div className="xp-bar-fill" style={{ width: `${pct}%`, background: color, transition: 'width 0.6s ease' }} /></div>
                  </div>
                );
              })}
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
                      <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}><i className="fas fa-city" style={{ marginRight: '6px', color: 'var(--accent-steel)', fontSize: '11px' }} />{city}</div>
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

      {/* ── ISSUE DETAIL OVERLAY ── */}
      {overlayIssue && (
        <IssueOverlay
          issue={overlayIssue}
          employees={employees}
          isMoAdmin={isMoAdmin}
          onClose={() => setOverlayIssue(null)}
          onStatusUpdate={handleStatusUpdate}
          onDelete={handleDeleteIssue}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
};

export default AdminView;
