import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  Resolved:    { cls: 'badge-resolved', color: 'var(--color-resolved)' },
  'In Progress':{ cls: 'badge-progress',  color: 'var(--color-progress)' },
  Critical:    { cls: 'badge-critical',   color: 'var(--color-critical)' },
  Open:        { cls: 'badge-open',       color: 'var(--color-open)' },
};

const getBadge = (issue) => {
  if (issue.status === 'Resolved') return 'badge-resolved';
  if (issue.status === 'In Progress') return 'badge-progress';
  if (issue.severity === 'Critical') return 'badge-critical';
  return 'badge-open';
};

const DashboardView = ({ setActiveView, setSelectedIssueId }) => {
  const { showToast, currentUser } = useAuth();

  const [metrics, setMetrics]       = useState({ total: 0, resolved: 0, resolutionRate: 0, critical: 0, communityVotes: 0 });
  const [myIssues, setMyIssues]     = useState([]);
  const [allIssues, setAllIssues]   = useState([]);

  const mapContainerRef  = useRef(null);
  const mapInitialized   = useRef(false);
  const categoryChartRef = useRef(null);

  useEffect(() => {
    window.jumpToIssueInReact = (id) => {
      setSelectedIssueId(id);
      setActiveView('feed');
    };
    return () => { delete window.jumpToIssueInReact; };
  }, [setActiveView, setSelectedIssueId]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [resStats, resAllIssues, resMyIssues] = await Promise.all([
          fetch(`/api/stats?username=${currentUser || ''}`),
          fetch(`/api/issues`),                                   // all issues for map
          fetch(`/api/issues?createdBy=${currentUser || ''}`)    // only user's issues
        ]);
        if (!resStats.ok || !resAllIssues.ok) throw new Error();

        const dataStats   = await resStats.json();
        const issuesList  = await resAllIssues.json();
        const myList      = resMyIssues.ok ? await resMyIssues.json() : [];

        setMetrics(dataStats.metrics);
        setAllIssues(issuesList);

        // Filter my issues client-side as a fallback (in case API doesn't filter by createdBy)
        const mine = issuesList.filter(i => i.createdBy === currentUser);
        setMyIssues(mine.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

        setTimeout(() => {
          renderCategoryChart(dataStats.categoryBreakdown);
          renderLeafletMap(issuesList);
        }, 100);
      } catch {
        showToast('Error loading dashboard', 'error');
      }
    };
    fetchStats();
  }, [currentUser]);

  const renderCategoryChart = (breakdown) => {
    if (!categoryChartRef.current || !window.Chart) return;
    if (categoryChartRef.current._chartInstance) {
      categoryChartRef.current._chartInstance.destroy();
    }
    const ctx = categoryChartRef.current.getContext('2d');
    const instance = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(breakdown),
        datasets: [{
          data: Object.values(breakdown),
          backgroundColor: ['#4a78c0', '#2ec4b6', '#ff9f1c', '#e71d36', '#9b5de5'],
          borderWidth: 2,
          borderColor: 'rgba(22,30,49,0.8)'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.65)', font: { family: 'Outfit', size: 11 }, padding: 14 } }
        }
      }
    });
    categoryChartRef.current._chartInstance = instance;
  };

  const renderLeafletMap = (issues) => {
    if (!mapContainerRef.current || !window.L || mapInitialized.current) return;
    mapInitialized.current = true;

    const valid = issues.filter(i => i.location.lat && i.location.lng);
    const center = valid.length > 0 ? [valid[0].location.lat, valid[0].location.lng] : [28.7712, 77.4725];

    const map = window.L.map(mapContainerRef.current).setView(center, 11);
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO', maxZoom: 20
    }).addTo(map);

    valid.forEach(issue => {
      let cls = 'marker-open';
      if (issue.status === 'Resolved') cls = 'marker-resolved';
      else if (issue.status === 'In Progress') cls = 'marker-progress';
      else if (issue.severity === 'Critical') cls = 'marker-critical';

      const icon = window.L.divIcon({
        className: 'custom-map-marker',
        html: `<div class="map-marker-dot ${cls}" title="${issue.title}"></div>`,
        iconSize: [13, 13], iconAnchor: [6, 6]
      });
      const marker = window.L.marker([issue.location.lat, issue.location.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:var(--font-primary);padding:4px">
          <h4 style="margin:0 0 4px;font-size:12px;font-weight:700;color:#fff">${issue.title}</h4>
          <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.55)"><i class="fas fa-map-marker-alt"></i> ${issue.location.address}</p>
          <button onclick="window.jumpToIssueInReact(${issue.id})" style="background:var(--accent-steel);border:none;color:#fff;padding:4px 10px;font-size:10px;border-radius:4px;cursor:pointer;font-weight:600">Details →</button>
        </div>
      `);
    });
  };

  const metricCards = [
    { label: 'Total Reports', value: metrics.total, icon: 'fa-file-invoice', color: 'var(--accent-steel)', bg: 'rgba(74,120,192,0.12)' },
    { label: 'Resolution Rate', value: `${metrics.resolutionRate}%`, icon: 'fa-clipboard-check', color: '#2ec4b6', bg: 'rgba(46,196,182,0.12)' },
    { label: 'Active Critical', value: metrics.critical, icon: 'fa-exclamation-triangle', color: 'var(--color-critical)', bg: 'rgba(224,94,94,0.12)' },
    { label: 'Community Votes', value: metrics.communityVotes, icon: 'fa-thumbs-up', color: '#ffc107', bg: 'rgba(255,193,7,0.12)' },
    { label: 'My Reports', value: myIssues.length, icon: 'fa-flag', color: '#9b5de5', bg: 'rgba(155,93,229,0.12)' },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Metric cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        {metricCards.map(m => (
          <div key={m.label} className="glass-panel metric-card">
            <div className="metric-icon" style={{ backgroundColor: m.bg, color: m.color }}>
              <i className={`fas ${m.icon}`} />
            </div>
            <div>
              <div className="metric-label">{m.label}</div>
              <div className="metric-value">{m.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Map + My Reports split */}
      <div className="dashboard-center-grid">
        {/* Live map */}
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>Live Telemetry Map</h3>
            <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-resolved)' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-resolved)', display: 'inline-block', animation: 'pulseDot 1.5s infinite' }} />
              Live
            </span>
          </div>
          <div ref={mapContainerRef} style={{ height: '380px' }} />
        </div>

        {/* My Reports panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>
              <i className="fas fa-flag" style={{ marginRight: '8px', color: '#9b5de5' }} />
              My Reports
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{myIssues.length} total</span>
              <button
                onClick={() => setActiveView('report')}
                style={{ padding: '5px 12px', fontSize: '11px', background: 'var(--accent-steel)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <i className="fas fa-plus" /> New
              </button>
            </div>
          </div>

          {myIssues.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-muted)', padding: '32px' }}>
              <i className="fas fa-flag" style={{ fontSize: '32px', opacity: 0.2 }} />
              <div style={{ fontSize: '13px', textAlign: 'center' }}>You haven't reported any issues yet.</div>
              <button
                onClick={() => setActiveView('report')}
                className="btn"
                style={{ fontSize: '12px', padding: '8px 18px' }}
              >
                <i className="fas fa-plus" style={{ marginRight: '6px' }} />Report an Issue
              </button>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {myIssues.map(issue => {
                const cfg = issue.status === 'Resolved' ? STATUS_CONFIG.Resolved
                  : issue.status === 'In Progress' ? STATUS_CONFIG['In Progress']
                  : issue.severity === 'Critical' ? STATUS_CONFIG.Critical
                  : STATUS_CONFIG.Open;
                return (
                  <div
                    key={issue.id}
                    onClick={() => { setSelectedIssueId(issue.id); setActiveView('feed'); }}
                    style={{
                      padding: '12px 18px', borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer', transition: 'background 0.15s',
                      display: 'flex', gap: '12px', alignItems: 'flex-start',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Status dot */}
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.color, marginTop: '5px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</div>
                        <span className={`badge ${getBadge(issue)}`} style={{ fontSize: '9px', flexShrink: 0 }}>{issue.status}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span><i className="fas fa-tag" style={{ marginRight: '3px' }} />{issue.category}</span>
                        <span><i className="fas fa-city" style={{ marginRight: '3px' }} />{issue.city}</span>
                        <span style={{ color: '#ffc107' }}><i className="fas fa-arrow-up" style={{ marginRight: '3px' }} />{issue.upvotes}</span>
                        <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Category chart + AI Forecast */}
      <div className="charts-grid">
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>Issues by Category</h3>
          <div style={{ height: '220px', position: 'relative' }}>
            <canvas ref={categoryChartRef} />
          </div>
        </div>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>
            <i className="fas fa-brain" style={{ color: 'var(--accent-steel)', marginRight: '8px' }} />
            AI Community Forecast
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
            Seasonal prediction heuristics analyze rainfall, moisture indicators, and crowd-sourced upvotes to forecast municipal service bottlenecks up to 30 days ahead.
          </p>
          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--accent-steel)', fontSize: '12px', lineHeight: '1.5' }}>
            <strong style={{ color: '#ffc107' }}><i className="fas fa-lightbulb" style={{ marginRight: '6px' }} />Supply Warning:</strong>
            {' '}Water pressure oscillations suggest joint stress in sector 4. Maintenance alerts dispatched.
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
            {[['fa-road', 'Pothole Risk', 'High'], ['fa-tint', 'Pipe Stress', 'Medium'], ['fa-trash', 'Waste Load', 'Low']].map(([icon, label, risk]) => (
              <div key={label} style={{ flex: 1, background: 'var(--bg-tertiary)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <i className={`fas ${icon}`} style={{ color: 'var(--accent-steel)', marginBottom: '4px', display: 'block' }} />
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontSize: '10px', color: risk === 'High' ? 'var(--color-critical)' : risk === 'Medium' ? 'var(--color-open)' : 'var(--color-resolved)' }}>{risk}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
