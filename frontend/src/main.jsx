import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Import CSS stylesheets dynamically
import './css/variables.css';
import './css/main.css';
import './css/dashboard.css';
import './css/feed.css';
import './css/reporting.css';
import './css/rewards.css';
import './css/insights.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
