import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AuthOverlay from './components/AuthOverlay';

// Views
import DashboardView from './views/DashboardView';
import FeedView from './views/FeedView';
import ReportView from './views/ReportView';
import InsightsView from './views/InsightsView';
import RewardsView from './views/RewardsView';
import AdminView from './views/AdminView';
import ProfileView from './views/ProfileView';

const AppContent = () => {
  const { currentUser, userRole, toasts } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  // Auto-sync starting view when user logs in/changes role
  React.useEffect(() => {
    if (currentUser) {
      if (userRole === 'admin') {
        setActiveView('issues');
      } else {
        setActiveView('dashboard');
      }
    }
  }, [currentUser, userRole]);

  const handleSetView = (viewId) => {
    if (userRole === 'admin' && (viewId === 'report' || viewId === 'rewards' || viewId === 'dashboard')) {
      setActiveView('issues');
    } else {
      setActiveView(viewId);
    }
  };

  const renderActiveView = () => {
    // Profile is accessible to everyone
    if (activeView === 'profile') {
      return <ProfileView setActiveView={handleSetView} />;
    }

    // Admin users see the admin panel for all other views
    if (userRole === 'admin') {
      return <AdminView activeTab={activeView} setActiveTab={handleSetView} />;
    }

    switch (activeView) {
      case 'dashboard':
        return <DashboardView setActiveView={handleSetView} setSelectedIssueId={setSelectedIssueId} />;
      case 'feed':
        return <FeedView selectedIssueId={selectedIssueId} setSelectedIssueId={setSelectedIssueId} />;
      case 'report':
        return <ReportView setActiveView={handleSetView} setSelectedIssueId={setSelectedIssueId} />;
      case 'insights':
        return <InsightsView />;
      case 'rewards':
        return <RewardsView />;
      case 'profile':
        return <ProfileView setActiveView={handleSetView} />;
      default:
        return <DashboardView setActiveView={handleSetView} setSelectedIssueId={setSelectedIssueId} />;
    }
  };

  // Toast icon map
  const toastIcons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    warning: 'fa-triangle-exclamation',
    info: 'fa-info-circle'
  };
  const toastColors = {
    success: 'var(--color-resolved)',
    error: 'var(--color-critical)',
    warning: 'var(--color-open)',
    info: 'var(--accent-steel)'
  };

  return (
    <>
      {/* Auth lock screen */}
      {!currentUser && <AuthOverlay />}

      {/* Main app shell — flex row, full screen */}
      {currentUser && (
        <div className="app-shell">
          <Sidebar activeView={activeView} setActiveView={handleSetView} />

          <main className="main-content">
            <Header activeView={activeView} setActiveView={handleSetView} />
            <div className="page-content" style={
              (activeView === 'feed' || (userRole === 'admin' && activeView !== 'profile'))
                ? { padding: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }
                : {}
            }>
              {renderActiveView()}
            </div>
          </main>
        </div>
      )}

      {/* Global toasts */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <i
              className={`fas ${toastIcons[toast.type] || 'fa-info-circle'}`}
              style={{ color: toastColors[toast.type] || 'var(--accent-steel)', fontSize: '15px', flexShrink: 0 }}
            />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
