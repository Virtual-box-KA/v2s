import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const InsightsView = () => {
  const { showToast, currentUser } = useAuth();
  
  // Local state
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);

  useEffect(() => {
    const fetchInsightsData = async () => {
      try {
        const response = await fetch(`/api/stats?username=${currentUser || ''}`);

        if (!response.ok) throw new Error();
        const data = await response.json();
        
        setPredictions(data.predictiveInsights);

        // Load Chart.js Resolution Speed
        renderResolutionSpeedChart(data.resolutionTimes);

      } catch (error) {
        showToast('Error loading predictive insights', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchInsightsData();
  }, []);

  const renderResolutionSpeedChart = (times) => {
    if (!chartRef.current || !window.Chart) return;

    const ctx = chartRef.current.getContext('2d');
    new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(times),
        datasets: [{
          label: 'Average Hours to Resolve',
          data: Object.values(times),
          backgroundColor: [
            'rgba(231, 29, 54, 0.65)',   // Pothole - Red
            'rgba(46, 196, 182, 0.65)',  // Water - Green
            'rgba(255, 159, 28, 0.65)',  // Streetlight - Orange
            'rgba(155, 93, 229, 0.65)',  // Waste - Purple
            'rgba(74, 120, 192, 0.65)'   // Infrastructure - Blue
          ],
          borderColor: [
            '#e71d36', '#2ec4b6', '#ff9f1c', '#9b5de5', 'var(--accent-steel)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.6)' } },
          y: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)' } }
        }
      }
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 6px 0' }}>AI Predictive Risk Diagnostics</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Automated intelligence analyzes local rainfall patterns, pipeline vibrations, and historical datasets to optimize civic resources.
        </p>
      </div>

      {/* Grid listing predictive diagnostic cards */}
      <div id="insights-predictions-list" className="predictions-grid">
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '40px 0', textAlign: 'center', gridColumn: '1 / -1' }}>
            <i className="fas fa-spinner fa-spin"></i> Calculating heuristics...
          </div>
        ) : (
          predictions.map((insight, index) => {
            const isHigh = insight.severity === 'High';
            return (
              <div key={index} className="glass-panel prediction-card animate-slide-up">
                <div className="prediction-header">
                  <span className={`badge ${isHigh ? 'badge-critical' : 'badge-progress'}`}>
                    Risk: {insight.severity}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-steel)' }}>
                    {insight.confidence} Conf.
                  </span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: '8px 0 6px 0' }}>
                  {insight.title}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 12px 0' }}>
                  {insight.description}
                </p>
                <div className="prediction-recommendation">
                  <strong>Recommended Crew Action:</strong> {insight.recommendation}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resolution Times horizontal bar chart */}
      <div className="resolution-perf-section">
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>Average Municipal Resolution Speed</h3>
          <div className="perf-chart-wrapper" style={{ height: '220px', position: 'relative' }}>
            <canvas ref={chartRef}></canvas>
          </div>
        </div>
        
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '380px', width: '100%' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>
            <i className="fas fa-lightbulb" style={{ color: '#ffc107' }}></i> Infrastructure Recommendations
          </h3>
          <div className="insights-summary-list">
            <div className="insights-summary-item">
              <div className="insights-summary-icon"><i className="fas fa-truck"></i></div>
              <div className="insights-summary-text">
                <span className="insights-summary-title">Waste Collection Optimization</span>
                <span className="insights-summary-desc">Shift weekend dumpster sweep routes to Sunday evening runs.</span>
              </div>
            </div>
            <div className="insights-summary-item">
              <div className="insights-summary-icon"><i className="fas fa-tint"></i></div>
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
