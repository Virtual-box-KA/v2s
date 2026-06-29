import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const CITIES = ['Ghaziabad', 'Noida', 'Delhi', 'Gurugram', 'Faridabad'];

const InsightsView = () => {
  const { showToast, currentUser } = useAuth();

  const [predictions, setPredictions]   = useState([]);
  const [resolutionTimes, setResolutionTimes] = useState({});
  const [loading, setLoading]           = useState(true);
  const [selectedCity, setSelectedCity] = useState('');
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const fetchInsightsData = useCallback(async (city) => {
    setLoading(true);
    try {
      const url = city
        ? `/api/stats?city=${encodeURIComponent(city)}`
        : `/api/stats?username=${currentUser || ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setPredictions(data.predictiveInsights || []);
      setResolutionTimes(data.resolutionTimes || {});
    } catch {
      showToast('Error loading insights', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchInsightsData(selectedCity);
  }, [selectedCity, fetchInsightsData]);

  useEffect(() => {
    if (!chartRef.current || !window.Chart || loading) return;
    if (chartInstanceRef.current) { chartInstanceRef.current.destroy(); chartInstanceRef.current = null; }
    const ctx = chartRef.current.getContext('2d');
    chartInstanceRef.current = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(resolutionTimes),
        datasets: [{
          label: 'Avg Hours to Resolve',
          data: Object.values(resolutionTimes),
          backgroundColor: [
            'rgba(231,29,54,0.65)', 'rgba(46,196,182,0.65)',
            'rgba(255,159,28,0.65)', 'rgba(155,93,229,0.65)', 'rgba(74,120,192,0.65)'
          ],
          borderColor: ['#e71d36','#2ec4b6','#ff9f1c','#9b5de5','var(--accent-steel)'],
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.6)' } },
          y: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)' } }
        }
      }
    });
  }, [resolutionTimes, loading]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header + city selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 6px 0' }}>City Pulse — Predictive Risk Diagnostics</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            AI analysis of local patterns, pipeline conditions, and crowd-sourced data to optimise civic resources.
          </p>
        </div>

        {/* City selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <i className="fas fa-city" style={{ color: 'var(--accent-steel)', fontSize: '14px' }} />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedCity('')}
              style={{
                padding: '7px 14px', borderRadius: '20px', border: '1px solid',
                cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s',
                background: selectedCity === '' ? 'var(--accent-steel)' : 'var(--bg-secondary)',
                borderColor: selectedCity === '' ? 'var(--accent-steel)' : 'var(--border-color)',
                color: selectedCity === '' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              All Cities
            </button>
            {CITIES.map(city => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                style={{
                  padding: '7px 14px', borderRadius: '20px', border: '1px solid',
                  cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s',
                  background: selectedCity === city ? 'var(--accent-steel)' : 'var(--bg-secondary)',
                  borderColor: selectedCity === city ? 'var(--accent-steel)' : 'var(--border-color)',
                  color: selectedCity === city ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active city pill */}
      {selectedCity && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(74,120,192,0.1)', border: '1px solid rgba(74,120,192,0.25)', borderRadius: '20px', padding: '5px 14px' }}>
            <i className="fas fa-map-marker-alt" style={{ color: 'var(--accent-steel)', fontSize: '11px' }} />
            Showing insights for <strong style={{ color: '#fff', marginLeft: '4px' }}>{selectedCity}</strong>
            <button onClick={() => setSelectedCity('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: '6px', fontSize: '12px', padding: 0 }}>
              <i className="fas fa-times" />
            </button>
          </div>
        </div>
      )}

      {/* Predictive insight cards */}
      <div id="insights-predictions-list" className="predictions-grid">
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '40px 0', textAlign: 'center', gridColumn: '1 / -1' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '20px', marginBottom: '10px', display: 'block' }} />
            {selectedCity ? `Analysing ${selectedCity}...` : 'Calculating heuristics...'}
          </div>
        ) : predictions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '40px 0', textAlign: 'center', gridColumn: '1 / -1' }}>
            <i className="fas fa-chart-line" style={{ fontSize: '28px', opacity: 0.2, display: 'block', marginBottom: '10px' }} />
            No predictive data available{selectedCity ? ` for ${selectedCity}` : ''}.
          </div>
        ) : predictions.map((insight, index) => {
          const isHigh = insight.severity === 'High';
          return (
            <div key={index} className="glass-panel prediction-card animate-slide-up">
              <div className="prediction-header">
                <span className={`badge ${isHigh ? 'badge-critical' : 'badge-progress'}`}>Risk: {insight.severity}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-steel)' }}>{insight.confidence} Conf.</span>
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: '8px 0 6px 0' }}>{insight.title}</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 12px 0' }}>{insight.description}</p>
              <div className="prediction-recommendation">
                <strong>Recommended Crew Action:</strong> {insight.recommendation}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resolution speed chart + infrastructure tips */}
      <div className="resolution-perf-section">
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>
            Average Municipal Resolution Speed
            {selectedCity && <span style={{ color: 'var(--accent-steel)', fontWeight: '400', fontSize: '13px', marginLeft: '8px' }}>— {selectedCity}</span>}
          </h3>
          <div className="perf-chart-wrapper" style={{ height: '220px', position: 'relative' }}>
            <canvas ref={chartRef} />
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '380px', width: '100%' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>
            <i className="fas fa-lightbulb" style={{ color: '#ffc107' }} /> Infrastructure Recommendations
          </h3>
          <div className="insights-summary-list">
            <div className="insights-summary-item">
              <div className="insights-summary-icon"><i className="fas fa-truck" /></div>
              <div className="insights-summary-text">
                <span className="insights-summary-title">Waste Collection Optimization</span>
                <span className="insights-summary-desc">Shift weekend dumpster sweep routes to Sunday evening runs.</span>
              </div>
            </div>
            <div className="insights-summary-item">
              <div className="insights-summary-icon"><i className="fas fa-tint" /></div>
              <div className="insights-summary-text">
                <span className="insights-summary-title">Supply Line Reinforcement</span>
                <span className="insights-summary-desc">Pre-emptively secure supply distributions in high vibration zones.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default InsightsView;
