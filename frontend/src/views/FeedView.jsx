import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const getParentCategory = (cat) => {
  const mapping = {
    // Roads
    "Potholes": "Roads", "Road damage": "Roads", "Missing road signs": "Roads", "Road obstruction": "Roads",
    "Pothole": "Roads",
    // Street Lighting
    "Light not working": "Street Lighting", "Pole damaged": "Street Lighting", "Exposed wiring": "Street Lighting",
    "Damaged Streetlight": "Street Lighting",
    // Water
    "Water leakage": "Water", "No water supply": "Water", "Low pressure": "Water", "Contaminated water": "Water",
    "Water Leakage": "Water",
    // Sewerage
    "Drain blockage": "Sewerage", "Sewer overflow": "Sewerage", "Open manhole": "Sewerage",
    // Waste Management
    "Garbage not collected": "Waste Management", "Overflowing bin": "Waste Management", "Illegal dumping": "Waste Management",
    "Waste Management": "Waste Management",
    // Parks & Greenery
    "Fallen tree": "Parks & Greenery", "Tree pruning": "Parks & Greenery", "Park maintenance": "Parks & Greenery",
    // Traffic
    "Signal malfunction": "Traffic", "Illegal parking": "Traffic", "Missing signage": "Traffic",
    // Animal Control
    "Stray dogs": "Animal Control", "Dead animal": "Animal Control", "Cattle on road": "Animal Control",
    // Environment
    "Air pollution": "Environment", "Noise pollution": "Environment", "Water pollution": "Environment",
    // Public Infrastructure
    "Bus stop damage": "Public Infrastructure", "Footpath damage": "Public Infrastructure", "Public toilet issue": "Public Infrastructure", "Government building maintenance": "Public Infrastructure",
    "Public Infrastructure": "Public Infrastructure"
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
  "Public Infrastructure": ["Bus stop damage", "Footpath damage", "Public toilet issue", "Government building maintenance"]
};

const FeedView = ({ selectedIssueId, setSelectedIssueId }) => {
  const { currentUser, userRole, awardXP, showToast } = useAuth();

  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [commentText, setCommentText] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusSelect, setStatusSelect] = useState('Open');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const isAgent = userRole === 'admin';

  const fetchIssues = async (autoSelectId = null) => {
    try {
      const response = await fetch('/api/issues');
      if (!response.ok) throw new Error();
      const list = await response.json();
      setIssues(list);
      const activeId = autoSelectId || selectedIssueId;
      if (activeId) {
        const found = list.find(i => i.id === activeId);
        if (found) { setSelectedIssue(found); setStatusSelect(found.status); }
      }
    } catch { showToast('Error loading issues feed', 'error'); }
  };

  useEffect(() => { fetchIssues(); }, [selectedIssueId]);

  const uniqueCities = useMemo(() =>
    [...new Set(issues.map(i => i.city).filter(Boolean))].sort(), [issues]);

  const filteredIssues = useMemo(() => {
    let result = [...issues];
    if (filterCity) result = result.filter(i => i.city === filterCity);
    if (filterCategory) result = result.filter(i => i.category === filterCategory);
    if (filterStatus) {
      if (filterStatus === 'Critical') result = result.filter(i => i.severity === 'Critical' && i.status !== 'Resolved');
      else result = result.filter(i => i.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location.address.toLowerCase().includes(q) ||
        (i.city && i.city.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sortBy === 'votes') result.sort((a, b) => b.upvotes - a.upvotes);
    else if (sortBy === 'severity') {
      const w = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      result.sort((a, b) => (w[b.severity] || 0) - (w[a.severity] || 0));
    }
    return result;
  }, [issues, search, filterCity, filterStatus, filterCategory, sortBy]);

  const handleCardClick = (issue) => {
    setSelectedIssueId(issue.id);
    setSelectedIssue(issue);
    setStatusSelect(issue.status);
  };

  const handleCloseDetails = () => {
    setSelectedIssueId(null);
    setSelectedIssue(null);
  };

  const handleUpvoteClick = async (e, id) => {
    e.stopPropagation();
    if (!currentUser) { showToast('Please sign in to upvote', 'warning'); return; }
    try {
      const res = await fetch(`/api/issues/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const isNowUpvoted = data.issue.upvotedBy.includes(currentUser);
      showToast(isNowUpvoted ? 'Issue upvoted!' : 'Upvote retracted', 'success');
      setIssues(prev => prev.map(i => i.id === id ? data.issue : i));
      if (selectedIssue?.id === id) setSelectedIssue(data.issue);
      if (isNowUpvoted) awardXP(10, 'upvoting a community issue');
    } catch { showToast('Error upvoting issue', 'error'); }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await fetch(`/api/issues/${selectedIssue.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser, text: commentText })
      });
      if (!res.ok) throw new Error();
      setCommentText('');
      showToast('Comment posted', 'success');
      await fetchIssues(selectedIssue.id);
      awardXP(5, 'posting a comment');
    } catch { showToast('Failed to post comment', 'error'); }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setSubmittingStatus(true);
    try {
      const res = await fetch(`/api/issues/${selectedIssue.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusSelect,
          note: statusNote || `Status updated to ${statusSelect}.`,
          image: statusSelect === 'Resolved' ? 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=400&q=80' : null
        })
      });
      if (!res.ok) throw new Error();
      setStatusNote('');
      showToast(`Status → ${statusSelect}`, 'success');
      await fetchIssues(selectedIssue.id);
    } catch { showToast('Failed to update status', 'error'); }
    finally { setSubmittingStatus(false); }
  };

  const fallbacks = {
    'Roads': 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80',
    'Street Lighting': 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=600&q=80',
    'Water': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
    'Sewerage': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
    'Waste Management': 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80',
    'Parks & Greenery': 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80',
    'Traffic': 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=600&q=80',
    'Animal Control': 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80',
    'Environment': 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=600&q=80',
    'Public Infrastructure': 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80'
  };

  const getBadge = (issue) => {
    if (issue.status === 'Resolved') return 'badge-resolved';
    if (issue.status === 'In Progress') return 'badge-progress';
    if (issue.severity === 'Critical') return 'badge-critical';
    return 'badge-open';
  };

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div id="feed-layout" className={`feed-layout ${selectedIssue ? 'split-active' : ''}`} style={{ flex: 1 }}>

        {/* ── Left panel: toolbar + cards ── */}
        <div className="feed-list-panel">
          {/* Toolbar */}
          <div className="feed-toolbar">
            <div className="search-box">
              <i className="fas fa-search" />
              <input
                type="text"
                className="form-control"
                placeholder="Search issues, address, city..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
            <select className="filter-select" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
              <option value="">All Cities</option>
              {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Critical">🔴 Critical</option>
              <option value="Open">🟡 Open</option>
              <option value="In Progress">🔵 In Progress</option>
              <option value="Resolved">🟢 Resolved</option>
            </select>
            <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {Object.entries(CATEGORIES_STRUCTURE).map(([group, subcats]) => (
                <optgroup key={group} label={group}>
                  {subcats.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="votes">Top Voted</option>
              <option value="severity">Severity</option>
            </select>
          </div>

          {/* Cards */}
          <div id="feed-cards-container" className="feed-cards-container">
            {filteredIssues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                <i className="fas fa-search" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }} />
                No issues match the current filters.
              </div>
            ) : filteredIssues.map(issue => {
              const isUpvoted = issue.upvotedBy.includes(currentUser);
              const isVerified = issue.upvotes >= 3;
              return (
                <div
                  key={issue.id}
                  className={`issue-card ${selectedIssue?.id === issue.id ? 'selected' : ''}`}
                  onClick={() => handleCardClick(issue)}
                >
                  <div className="card-header">
                    <span className={`badge ${getBadge(issue)}`}>{issue.status}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="card-title">{issue.title}</div>
                  <div className="card-loc"><i className="fas fa-map-marker-alt" /> {issue.location.address}</div>
                  <p className="card-desc">{issue.description}</p>
                  <div className="ai-tags-row">
                    {issue.aiTags.map(tag => <span key={tag} className="ai-tag">{tag}</span>)}
                  </div>
                  <div className="card-footer">
                    <button className={`upvote-action-btn ${isUpvoted ? 'active' : ''}`} onClick={e => handleUpvoteClick(e, issue.id)}>
                      <i className="fas fa-arrow-up" /> {issue.upvotes}
                    </button>
                    <div className={`verification-status ${isVerified ? 'verified' : 'pending'}`}>
                      <i className={`fas ${isVerified ? 'fa-check-circle' : 'fa-hourglass-half'}`} />
                      {isVerified ? 'Verified' : 'Pending'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right panel: details ── */}
        {selectedIssue && (
          <div className="feed-detail-panel">
            {/* Detail header */}
            <div className="detail-panel-header">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className={`badge ${getBadge(selectedIssue)}`}>{selectedIssue.status}</span>
                  <span className="badge badge-secondary">Severity: {selectedIssue.severity}</span>
                </div>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.3, margin: 0 }}>
                  {selectedIssue.title}
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  <i className="fas fa-map-marker-alt" /> {selectedIssue.location.address}
                </div>
              </div>
              <button className="close-panel-btn" onClick={handleCloseDetails}>
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="detail-scroll-body">
              {/* Evidence image */}
              <div className="detail-image-box">
                <img
                  src={selectedIssue.image || fallbacks[getParentCategory(selectedIssue.category)] || fallbacks['Roads']}
                  alt="Evidence"
                />
              </div>

              {/* AI confidence meter */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>AI Confidence</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="xp-bar-bg" style={{ width: '80px' }}>
                    <div className="xp-bar-fill" style={{ width: `${selectedIssue.aiConfidence * 100}%` }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-resolved)', fontFamily: 'var(--font-mono)' }}>
                    {Math.round(selectedIssue.aiConfidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Description */}
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {selectedIssue.description}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Reported by: <strong style={{ color: 'var(--text-secondary)' }}>{selectedIssue.createdBy}</strong>
              </div>

              {/* Municipal agent console */}
              {isAgent && (
                <div className="admin-action-box">
                  <h4><i className="fas fa-user-shield" /> Municipal Operations</h4>
                  <form onSubmit={handleStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="form-group">
                      <label>Update Status</label>
                      <select className="form-control" value={statusSelect} onChange={e => setStatusSelect(e.target.value)}>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Crew Notes</label>
                      <textarea className="form-control" style={{ minHeight: '70px' }} placeholder="Action logs or repair notes..." value={statusNote} onChange={e => setStatusNote(e.target.value)} />
                    </div>
                    <button type="submit" className="btn" disabled={submittingStatus} style={{ width: '100%' }}>
                      {submittingStatus ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save" /> Submit Update</>}
                    </button>
                  </form>
                </div>
              )}

              {/* Timeline */}
              <div>
                <div className="detail-timeline-title" style={{ marginBottom: '12px' }}>
                  <i className="fas fa-route" style={{ marginRight: '8px', color: 'var(--accent-steel)' }} />
                  Incident Timeline
                </div>
                <div className="tracking-timeline">
                  {selectedIssue.timeline.map((node, i) => {
                    const isActive = i === selectedIssue.timeline.length - 1;
                    const isResolved = node.status === 'Resolved';
                    return (
                      <div key={i} className={`timeline-node ${isActive ? 'active' : ''} ${isResolved ? 'resolved-node' : ''}`}>
                        <div className="timeline-circle" />
                        <div className="timeline-status" style={{ color: isResolved ? 'var(--color-resolved)' : isActive ? 'var(--accent-steel)' : 'var(--text-muted)' }}>
                          {node.status}
                        </div>
                        <div className="timeline-note">{node.note}</div>
                        <div className="timeline-time">{new Date(node.timestamp).toLocaleString()}</div>
                        {node.image && <img src={node.image} className="timeline-evidence-img" alt="Evidence" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comments */}
              <div className="detail-comments-section">
                <div className="detail-timeline-title">
                  <i className="far fa-comments" style={{ marginRight: '8px', color: 'var(--accent-steel)' }} />
                  Discussion
                </div>
                <div className="comments-list">
                  {selectedIssue.comments.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                      No discussion yet.
                    </div>
                  ) : selectedIssue.comments.map(c => (
                    <div key={c.id} className="comment-item">
                      <div className="comment-header">
                        <span className="comment-author">{c.user}</span>
                        <span className="comment-date">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="comment-text">{c.text}</div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleCommentSubmit} className="comment-form">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn" style={{ padding: '10px 14px' }}>
                    <i className="fas fa-paper-plane" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedView;
