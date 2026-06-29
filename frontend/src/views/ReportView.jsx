import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const SCANNER_LOGS = [
  { text: 'Establishing secure uplink to Civiverse Scanner...', success: false },
  { text: 'Uplink verified. Commencing rasterization checks...', success: false },
  { text: 'Running computer vision convolutional diagnostics...', success: false },
  { text: 'Detecting edge coordinates and surface displacements...', success: true },
  { text: 'Filtering visual noise. Generating telemetry descriptors...', success: false },
];

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

const ReportView = ({ setActiveView, setSelectedIssueId }) => {
  const { currentUser, awardXP, showToast } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);

  // Webcam stream states
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const videoRef = useRef(null);
  const webcamStreamRef = useRef(null);

  const startWebcam = async () => {
    try {
      setIsWebcamActive(true);
      // Wait brief moment so element renders in DOM
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          webcamStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (innerErr) {
          showToast('Could not access camera. Please check permissions.', 'error');
          setIsWebcamActive(false);
        }
      }, 100);
    } catch (err) {
      showToast('Could not access camera.', 'error');
      setIsWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    
    stopWebcam();
    
    imageRef.current = dataUrl;
    setImage(dataUrl);
    setCurrentStep(2);
    startScanner(dataUrl);
  };

  // Step 2 scanner state
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [scanDone, setScanDone] = useState(false);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [manualEditorVisible, setManualEditorVisible] = useState(false);

  // Form fields
  const [category, setCategory] = useState('Potholes');
  const [severity, setSeverity] = useState('Medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // AI suggestions cache
  const [aiSuggestions, setAiSuggestions] = useState(null);

  // Location
  const [lat, setLat] = useState(28.7712);
  const [lng, setLng] = useState(77.4725);
  const [address, setAddress] = useState('Resolving GPS location...');
  const [city, setCity] = useState('');

  // Map refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Interval ref for cleanup
  const intervalRef = useRef(null);
  const imageRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // ── File handling ──
  const handleFile = useCallback((file) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('Please upload an image or video file', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => showToast('Failed to read file', 'error');
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      imageRef.current = dataUrl;
      setImage(dataUrl);
      setCurrentStep(2);
      startScanner(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  };

  // ── Scanner: sequential setTimeout instead of setInterval ──
  const startScanner = useCallback((imgData) => {
    setConsoleLogs([]);
    setScanDone(false);
    setSuggestionsVisible(false);
    setManualEditorVisible(false);

    const runLog = (idx) => {
      if (idx >= SCANNER_LOGS.length) {
        // All logs done — call AI endpoint
        setConsoleLogs(prev => [...prev, { text: 'Calling image categorization service...', success: false }]);
        callAI(imgData);
        return;
      }
      setConsoleLogs(prev => [...prev, SCANNER_LOGS[idx]]);
      setTimeout(() => runLog(idx + 1), 450);
    };

    setTimeout(() => runLog(0), 200);
  }, []);

  const callAI = async (imgData) => {
    try {
      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imgData })
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const aiRes = await res.json();

      // AI couldn't identify a civic issue in this image
      if (aiRes.unclear === true) {
        setConsoleLogs(prev => [...prev, {
          text: '⚠ Image does not show a recognizable civic issue. Please describe the problem manually.',
          success: false
        }]);
        setScanDone(true);
        setManualEditorVisible(true);
        return;
      }

      setConsoleLogs(prev => [...prev, {
        text: `✓ Issue identified — ${aiRes.category} · ${Math.round((aiRes.confidence || 0.9) * 100)}% confidence`,
        success: true
      }]);

      // Pre-fill fields from AI
      setAiSuggestions(aiRes);
      setCategory(aiRes.category || 'Pothole');
      setSeverity(aiRes.severity || 'Medium');
      setTitle(aiRes.title || '');
      setDescription(aiRes.description || '');

      setScanDone(true);
      setSuggestionsVisible(true);

    } catch (err) {
      console.error('AI categorize error:', err);
      setConsoleLogs(prev => [...prev, {
        text: 'AI analysis unavailable. Please fill in details manually.',
        success: false
      }]);
      setScanDone(true);
      setManualEditorVisible(true);
    }
  };

  // ── Map init on step 3 ──
  useEffect(() => {
    if (currentStep !== 3 || !mapContainerRef.current || !window.L) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = window.L.map(mapContainerRef.current).setView([lat, lng], 13);
    mapInstanceRef.current = map;

    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO', maxZoom: 20
    }).addTo(map);

    const marker = window.L.marker([lat, lng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    const reverseGeocode = async (latVal, lngVal) => {
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latVal}&lon=${lngVal}`);
        const data = await resp.json();
        setAddress(data.display_name || `${latVal}, ${lngVal}`);
        const addr = data.address || {};
        setCity(addr.city || addr.town || addr.village || addr.suburb || addr.county || 'Unknown');
      } catch {
        setAddress(`${latVal}, ${lngVal}`);
      }
    };

    marker.on('dragend', (e) => {
      const { lat: la, lng: ln } = e.target.getLatLng();
      setLat(parseFloat(la.toFixed(6)));
      setLng(parseFloat(ln.toFixed(6)));
      reverseGeocode(la, ln);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      const { lat: la, lng: ln } = e.latlng;
      setLat(parseFloat(la.toFixed(6)));
      setLng(parseFloat(ln.toFixed(6)));
      reverseGeocode(la, ln);
    });

    // Request GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const la = pos.coords.latitude;
          const ln = pos.coords.longitude;
          map.setView([la, ln], 15);
          marker.setLatLng([la, ln]);
          setLat(parseFloat(la.toFixed(6)));
          setLng(parseFloat(ln.toFixed(6)));
          await reverseGeocode(la, ln);
        },
        () => reverseGeocode(lat, lng)
      );
    } else {
      reverseGeocode(lat, lng);
    }
  }, [currentStep]);

  // ── Handlers ──
  const handleApproveSuggestions = () => {
    setCurrentStep(3);
  };

  const handleSaveManual = () => {
    if (!title.trim() || !description.trim()) {
      showToast('Please fill in Title and Description', 'warning');
      return;
    }
    setCurrentStep(3);
  };

  const handleNavBack = () => {
    if (currentStep === 2) {
      // Re-entering step 1: reset scanner state
      setScanDone(false);
      setSuggestionsVisible(false);
      setManualEditorVisible(false);
      setConsoleLogs([]);
    }
    setCurrentStep(p => Math.max(1, p - 1));
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Title and description are required', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, category, severity,
          location: { address, lat, lng },
          image: imageRef.current,
          createdBy: currentUser,
          city
        })
      });
      if (!res.ok) throw new Error('Submission failed');
      const newIssue = await res.json();

      showToast('Issue reported successfully! 🎉', 'success');
      awardXP(25, 'reporting a new community issue');

      // Reset wizard
      setCurrentStep(1);
      setImage(null);
      imageRef.current = null;
      setTitle('');
      setDescription('');
      setConsoleLogs([]);
      setSuggestionsVisible(false);
      setManualEditorVisible(false);

      setSelectedIssueId(newIssue.id);
      setActiveView('feed');
    } catch (err) {
      showToast(err.message || 'Submission failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Stepper progress ──
  const stepPercent = ((currentStep - 1) / 3) * 100;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '760px', margin: '0 auto', width: '100%' }}>
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Stepper header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            {['Upload Photo', 'AI Analysis', 'Set Location', 'Confirm & Submit'].map((label, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: currentStep > i + 1 ? 'var(--color-resolved)' : currentStep === i + 1 ? 'var(--accent-steel)' : 'var(--bg-tertiary)',
                  border: `2px solid ${currentStep > i + 1 ? 'var(--color-resolved)' : currentStep === i + 1 ? 'var(--accent-steel)' : 'var(--border-color)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '800', color: '#fff', transition: 'all 0.3s ease'
                }}>
                  {currentStep > i + 1 ? <i className="fas fa-check" style={{ fontSize: '10px' }} /> : i + 1}
                </div>
                <span style={{ fontSize: '10px', color: currentStep === i + 1 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: currentStep === i + 1 ? '600' : '400', textAlign: 'center' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ height: '3px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${stepPercent}%`, background: 'linear-gradient(90deg, var(--accent-steel), var(--color-progress))', borderRadius: '2px', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <div style={{ padding: '24px' }}>

          {/* ── STEP 1: Upload ── */}
          {currentStep === 1 && (
            <div className="animate-fade-in">
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Upload Evidence Photo</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Drop a photo of the civic issue or capture one using your camera. Our AI will analyze and categorize it.
              </p>

              {isWebcamActive ? (
                <div style={{ 
                  position: 'relative', 
                  borderRadius: 'var(--radius-md)', 
                  overflow: 'hidden', 
                  border: '2px solid var(--border-color)', 
                  background: '#0a0f1a', 
                  paddingBottom: '75%', 
                  height: 0,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                }}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  
                  {/* Viewfinder scanner overlays */}
                  <div style={{
                    position: 'absolute',
                    top: '10%', left: '10%', right: '10%', bottom: '25%',
                    border: '1px dashed rgba(255,255,255,0.4)',
                    pointerEvents: 'none',
                    borderRadius: '4px'
                  }}>
                    <span style={{ position: 'absolute', top: 8, left: 8, color: 'rgba(255,255,255,0.6)', fontSize: '9px', fontFamily: 'var(--font-mono)' }}>CAM VIEWPORT</span>
                  </div>

                  <div style={{ 
                    position: 'absolute', 
                    bottom: '16px', 
                    left: 0, 
                    right: 0, 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '12px', 
                    zIndex: 10 
                  }}>
                    <button 
                      type="button"
                      className="btn btn-secondary" 
                      style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={stopWebcam}
                    >
                      <i className="fas fa-times" /> Cancel
                    </button>
                    <button 
                      type="button"
                      className="btn btn-primary" 
                      style={{ 
                        padding: '8px 20px', 
                        borderRadius: '20px', 
                        fontSize: '12px', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        background: 'var(--color-progress)',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(74,120,192,0.3)'
                      }}
                      onClick={capturePhoto}
                    >
                      <i className="fas fa-camera" /> Capture Photo
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('report-file-input').click()}
                    style={{
                      border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)',
                      padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
                      background: 'var(--bg-tertiary)', transition: 'all var(--transition-fast)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-steel)'; e.currentTarget.style.background = 'rgba(74,120,192,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  >
                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: '40px', color: 'var(--accent-steel)', marginBottom: '14px', display: 'block' }} />
                    <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      Drag & drop or click to browse
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Supports JPG, PNG, MP4 · Max 10MB</div>
                    <input
                      type="file"
                      id="report-file-input"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px' }}
                      onClick={(e) => { e.stopPropagation(); document.getElementById('report-file-input').click(); }}
                    >
                      <i className="fas fa-image" /> Browse Gallery
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px' }}
                      onClick={(e) => { e.stopPropagation(); startWebcam(); }}
                    >
                      <i className="fas fa-camera" /> Use Camera
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 2: AI Scanner ── */}
          {currentStep === 2 && (
            <div className="animate-fade-in">
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>AI Image Analysis</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Image preview */}
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', minHeight: '180px', background: 'var(--bg-primary)' }}>
                  {image && <img src={image} alt="Upload" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  {!scanDone && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      background: 'linear-gradient(transparent 45%, rgba(74,120,192,0.35) 50%, transparent 55%)',
                      backgroundSize: '100% 200%',
                      animation: 'scanLine 1.8s linear infinite'
                    }} />
                  )}
                </div>

                {/* Console */}
                <div style={{
                  background: '#0a0f1a', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                  padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px',
                  minHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                  {consoleLogs.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)' }}>Initializing scanner...</span>
                  ) : consoleLogs.map((log, i) => (
                    <div key={i} style={{ color: log.success ? 'var(--color-resolved)' : 'var(--text-secondary)', lineHeight: '1.5' }}>
                      <span style={{ color: 'var(--accent-steel)' }}>❯ </span>{log.text}
                    </div>
                  ))}
                  {!scanDone && (
                    <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <i className="fas fa-spinner fa-spin" style={{ fontSize: '10px' }} /> Processing...
                    </div>
                  )}
                </div>
              </div>

              {/* AI Suggestions box */}
              {suggestionsVisible && aiSuggestions && (
                <div className="animate-slide-up" style={{
                  border: '1px solid rgba(74,120,192,0.4)', borderRadius: 'var(--radius-md)',
                  padding: '16px', background: 'rgba(74,120,192,0.06)', marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <i className="fas fa-robot" style={{ color: 'var(--accent-steel)' }} />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-steel)' }}>AI Suggestions</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-resolved)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                      {Math.round((aiSuggestions.confidence || 0.9) * 100)}% confidence
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                    {[
                      ['Category', aiSuggestions.category],
                      ['Title', aiSuggestions.title],
                      ['Description', aiSuggestions.description],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn" style={{ flex: 1 }} onClick={handleApproveSuggestions}>
                      <i className="fas fa-check" /> Use these suggestions
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setSuggestionsVisible(false); setManualEditorVisible(true); }}>
                      <i className="fas fa-pen" /> Edit manually
                    </button>
                  </div>
                </div>
              )}

              {/* Manual editor */}
              {manualEditorVisible && (
                <div className="animate-slide-up" style={{
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                    <i className="fas fa-pen" style={{ marginRight: '8px', color: 'var(--accent-steel)' }} />
                    Describe the issue manually
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Category</label>
                      <select className="form-control" value={category} onChange={e => setCategory(e.target.value)}>
                        {Object.entries(CATEGORIES_STRUCTURE).map(([group, subcats]) => (
                          <optgroup key={group} label={group}>
                            {subcats.map(sub => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Severity</label>
                      <select className="form-control" value={severity} onChange={e => setSeverity(e.target.value)}>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Issue Title</label>
                    <input type="text" className="form-control" placeholder="Brief title of the problem" value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea className="form-control" style={{ minHeight: '80px' }} placeholder="Describe the issue and its impact..." value={description} onChange={e => setDescription(e.target.value)} />
                  </div>
                  <button type="button" className="btn" onClick={handleSaveManual} style={{ alignSelf: 'flex-start' }}>
                    <i className="fas fa-arrow-right" /> Continue to Location
                  </button>
                </div>
              )}

              {/* Back button */}
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button type="button" className="btn btn-secondary" onClick={handleNavBack}>
                  <i className="fas fa-arrow-left" /> Back
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Location ── */}
          {currentStep === 3 && (
            <div className="animate-fade-in">
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Confirm Location</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                We've detected your GPS location. Drag the pin or click the map to adjust it precisely.
              </p>

              <div ref={mapContainerRef} style={{ height: '280px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '14px' }} />

              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '12px 16px', border: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
                <i className="fas fa-location-crosshairs" style={{ color: 'var(--accent-steel)', fontSize: '18px', marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                    {lat.toFixed(6)}, {lng.toFixed(6)}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{address}</div>
                  {city && <div style={{ fontSize: '12px', color: 'var(--color-resolved)', marginTop: '4px', fontWeight: '600' }}>
                    <i className="fas fa-city" style={{ marginRight: '4px' }} />{city}
                  </div>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleNavBack}>
                  <i className="fas fa-arrow-left" /> Back
                </button>
                <button type="button" className="btn" onClick={() => setCurrentStep(4)}>
                  Confirm Location <i className="fas fa-arrow-right" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Submit ── */}
          {currentStep === 4 && (
            <div className="animate-fade-in">
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Review & Submit</h3>

              {/* XP bonus card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(74,120,192,0.15), rgba(46,196,182,0.1))',
                border: '1px solid rgba(74,120,192,0.3)', borderRadius: 'var(--radius-md)',
                padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="fas fa-gift" style={{ fontSize: '22px', color: '#ffc107' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Civic Action Reward</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Submitting this report earns you XP</div>
                  </div>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-resolved)', fontFamily: 'var(--font-mono)' }}>+25 XP</div>
              </div>

              {/* Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {[
                  ['Category', category, 'fa-tag'],
                  ['Severity', severity, 'fa-exclamation-circle'],
                  ['Title', title, 'fa-heading'],
                  ['Location', city || address.split(',')[0], 'fa-map-marker-alt'],
                ].map(([label, val, icon]) => (
                  <div key={label} style={{ display: 'flex', gap: '12px', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <i className={`fas ${icon}`} style={{ color: 'var(--accent-steel)', width: '16px', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '2px' }}>{label}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{val}</div>
                    </div>
                  </div>
                ))}
                {description && (
                  <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {description}
                  </div>
                )}
              </div>

              <form onSubmit={handleFinalSubmit}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleNavBack}>
                    <i className="fas fa-arrow-left" /> Back
                  </button>
                  <button type="submit" className="btn" style={{ flex: 1 }} disabled={loading}>
                    {loading ? <><i className="fas fa-spinner fa-spin" /> Submitting...</> : <><i className="fas fa-paper-plane" /> Submit Report</>}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* Scan line animation */}
      <style>{`
        @keyframes scanLine {
          0%   { background-position: 0 -100%; }
          100% { background-position: 0 200%; }
        }
      `}</style>
    </div>
  );
};

export default ReportView;
