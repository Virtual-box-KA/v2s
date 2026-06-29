import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const getBadgeClass = (issue) => {
  if (issue.status === "Resolved") return "badge-resolved";
  if (issue.status === "In Progress") return "badge-progress";
  if (issue.severity === "Critical") return "badge-critical";
  return "badge-open";
};

const SEV_COLORS = { Critical: "#e05e5e", High: "#e0995e", Medium: "#ffc107", Low: "#5ee09d" };
const STATUS_DOT = { Resolved: "#5ee09d", "In Progress": "#5ebce0", Open: "#e0995e" };

const WorkOverlay = ({ issue, currentUser, onClose, onUpdate }) => {
  const [status, setStatus] = useState(issue.status === "Resolved" ? "In Progress" : issue.status);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setPhoto(reader.result); setPreview(reader.result); };
    reader.readAsDataURL(file);
  };

  const openPicker = (useCamera) => {
    if (!fileRef.current) return;
    if (useCamera) fileRef.current.setAttribute("capture", "environment");
    else fileRef.current.removeAttribute("capture");
    fileRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    await onUpdate(issue.id, status, note, photo);
    setSaving(false);
    setNote(""); setPhoto(null); setPreview(null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,8,18,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "16px", width: "100%", maxWidth: "860px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.7)", animation: "slideUp 0.25s cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "flex-start", gap: "12px", background: "linear-gradient(135deg,rgba(74,120,192,0.08),transparent)", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
              <span className={"badge " + getBadgeClass(issue)}>{issue.status}</span>
              <span style={{ fontSize: "10px", fontWeight: "700", color: SEV_COLORS[issue.severity] || "#aaa", textTransform: "uppercase" }}><i className="fas fa-exclamation-triangle" style={{ marginRight: "4px" }} />{issue.severity}</span>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>#{issue.id}</span>
              {issue.assignedTo && (<span style={{ fontSize: "10px", background: "rgba(74,120,192,0.15)", border: "1px solid rgba(74,120,192,0.3)", borderRadius: "20px", padding: "2px 10px", color: "var(--accent-steel)", fontWeight: "700" }}><i className="fas fa-hard-hat" style={{ marginRight: "4px" }} />{issue.assignedTo}</span>)}
            </div>
            <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#fff", margin: "0 0 5px 0" }}>{issue.title}</h2>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <span><i className="fas fa-map-marker-alt" style={{ marginRight: "5px", color: "var(--accent-steel)" }} />{issue.location?.address}</span>
              <span><i className="fas fa-city" style={{ marginRight: "5px" }} />{issue.city}</span>
              <span><i className="fas fa-calendar" style={{ marginRight: "5px" }} />{new Date(issue.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", color: "var(--text-muted)", fontSize: "14px", flexShrink: 0 }}><i className="fas fa-times" /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ padding: "20px 24px", borderRight: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Description</div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.7", margin: 0, background: "var(--bg-tertiary)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>{issue.description}</p>
            </div>
            {issue.image && (<div><div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}><i className="fas fa-image" style={{ marginRight: "5px" }} />Original Photo</div><img src={issue.image} alt="Issue" style={{ width: "100%", borderRadius: "8px", border: "1px solid var(--border-color)", objectFit: "cover", maxHeight: "150px" }} /></div>)}
            {(issue.timeline || []).length > 0 && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Activity Timeline ({issue.timeline.length})</div>
                <div style={{ position: "relative", paddingLeft: "18px" }}>
                  <div style={{ position: "absolute", left: "5px", top: "4px", bottom: "4px", width: "2px", background: "var(--border-color)" }} />
                  {issue.timeline.map((node, i) => (
                    <div key={i} style={{ position: "relative", marginBottom: i < issue.timeline.length - 1 ? "14px" : 0 }}>
                      <div style={{ position: "absolute", left: "-17px", top: "4px", width: "8px", height: "8px", borderRadius: "50%", background: i === issue.timeline.length - 1 ? "var(--accent-steel)" : "var(--border-color)", border: "2px solid var(--bg-secondary)" }} />
                      <div style={{ fontSize: "12px", fontWeight: "700", color: i === issue.timeline.length - 1 ? "#fff" : "var(--text-secondary)" }}>{node.status}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "2px 0", lineHeight: "1.5" }}>{node.note}</div>
                      {node.image && <img src={node.image} alt="Work photo" style={{ marginTop: "6px", width: "100%", maxHeight: "120px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border-color)" }} />}
                      <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{new Date(node.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "rgba(74,120,192,0.05)", border: "1px solid rgba(74,120,192,0.25)", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: "800", color: "var(--accent-steel)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}><i className="fas fa-hard-hat" /> Field Work Update</div>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Update Status</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "6px" }}>
                    {["Open", "In Progress"].map(s => (
                      <button key={s} type="button" onClick={() => setStatus(s)} style={{ padding: "9px 6px", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700", transition: "all 0.15s", background: status === s ? "rgba(74,120,192,0.18)" : "var(--bg-tertiary)", borderColor: status === s ? "var(--accent-steel)" : "var(--border-color)", color: status === s ? "var(--accent-steel)" : "var(--text-secondary)" }}>{s}</button>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", padding: "7px 12px", background: "rgba(224,94,94,0.06)", border: "1px solid rgba(224,94,94,0.18)", borderRadius: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
                    <i className="fas fa-lock" style={{ marginRight: "5px", color: "#e05e5e" }} />Only <strong>MO Admin</strong> can mark as <strong>Resolved</strong>
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Field Notes <span style={{ color: "#e05e5e" }}>*</span></label>
                  <textarea className="form-control" style={{ minHeight: "90px", resize: "none", marginTop: "6px" }} placeholder="Describe the work done, progress, obstacles..." value={note} onChange={e => setNote(e.target.value)} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Work Photo (optional)</label>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
                  <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                    <button type="button" onClick={() => openPicker(false)} style={{ flex: 1, padding: "10px", background: "var(--bg-tertiary)", border: "1px dashed var(--border-color)", borderRadius: "8px", cursor: "pointer", color: "var(--text-muted)", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}><i className="fas fa-images" /> Gallery</button>
                    <button type="button" onClick={() => openPicker(true)} style={{ flex: 1, padding: "10px", background: "var(--bg-tertiary)", border: "1px dashed var(--border-color)", borderRadius: "8px", cursor: "pointer", color: "var(--text-muted)", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}><i className="fas fa-camera" /> Camera</button>
                  </div>
                  {preview && (
                    <div style={{ position: "relative", marginTop: "8px" }}>
                      <img src={preview} alt="Preview" style={{ width: "100%", maxHeight: "140px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border-color)" }} />
                      <button type="button" onClick={() => { setPhoto(null); setPreview(null); }} style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", color: "#fff", fontSize: "11px" }}><i className="fas fa-times" /></button>
                    </div>
                  )}
                </div>
                <button type="submit" className="btn" style={{ width: "100%", padding: "11px" }} disabled={saving || !note.trim()}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> Submitting...</> : <><i className="fas fa-paper-plane" /> Submit Work Update</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmployeeView = () => {
  const { currentUser, showToast } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overlayIssue, setOverlay] = useState(null);
  const [filter, setFilter] = useState("all");
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/issues");
      const data = res.ok ? await res.json() : [];
      setIssues(data.filter(i => i.assignedTo === currentUser));
    } catch { showToast("Error loading assignments", "error"); }
    finally { setLoading(false); }
  }, [currentUser, showToast]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  const buildMap = useCallback(() => {
    if (!mapRef.current || !window.L) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    markersRef.current = [];
    const withCoords = issues.filter(i => i.location && i.location.lat && i.location.lng);
    if (withCoords.length === 0) return;
    const center = [withCoords[0].location.lat, withCoords[0].location.lng];
    const map = window.L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView(center, 13);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    withCoords.forEach(issue => {
      const c = STATUS_DOT[issue.status] || "#e0995e";
      const size = issue.severity === "Critical" ? 16 : 12;
      const html = "<div style='width:" + size + "px;height:" + size + "px;border-radius:50%;background:" + c + ";border:3px solid rgba(255,255,255,0.9);box-shadow:0 2px 10px rgba(0,0,0,0.5);cursor:pointer;'></div>";
      const icon = window.L.divIcon({ html: html, iconSize: [size, size], iconAnchor: [size/2, size/2], className: "" });
      const tooltip = "<b>" + issue.title + "</b><br/>" + issue.category + " - " + issue.status;
      const marker = window.L.marker([issue.location.lat, issue.location.lng], { icon })
        .bindTooltip(tooltip, { direction: "top", offset: [0, -8] })
        .addTo(map);
      marker.on("click", () => setOverlay(issue));
      markersRef.current.push(marker);
    });
    if (markersRef.current.length > 0) map.fitBounds(window.L.featureGroup(markersRef.current).getBounds().pad(0.2));
    mapInstanceRef.current = map;
  }, [issues]);

  useEffect(() => {
    const timer = setTimeout(buildMap, 150);
    return () => { clearTimeout(timer); if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [buildMap]);

  const handleWorkUpdate = async (issueId, status, note, image) => {
    try {
      const res = await fetch("/api/issues/" + issueId + "/work-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: currentUser, status: status, note: note, image: image }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed"); }
      const updated = await res.json();
      showToast("Work update submitted!", "success");
      setOverlay(updated);
      await fetchIssues();
    } catch (err) { showToast(err.message || "Failed to submit", "error"); }
  };

  const filtered = issues.filter(i => {
    if (filter === "open") return i.status === "Open";
    if (filter === "in-progress") return i.status === "In Progress";
    if (filter === "resolved") return i.status === "Resolved";
    return true;
  });

  const inProgress = issues.filter(i => i.status === "In Progress").length;
  const done = issues.filter(i => i.status === "Resolved").length;

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 4px 0" }}><i className="fas fa-hard-hat" style={{ color: "#ffc107", marginRight: "10px" }} />My Assignments</h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>Issues assigned to you — submit progress notes and work photos</p>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "8px 14px" }} onClick={fetchIssues}><i className="fas fa-sync" /> Refresh</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px" }}>
        {[
          { label: "Total Assigned", value: issues.length, color: "var(--accent-steel)", bg: "rgba(74,120,192,0.12)", icon: "fa-list-check" },
          { label: "In Progress", value: inProgress, color: "#5ebce0", bg: "rgba(94,188,224,0.12)", icon: "fa-spinner" },
          { label: "Completed", value: done, color: "var(--color-resolved)", bg: "rgba(94,224,157,0.12)", icon: "fa-circle-check" },
        ].map(card => (
          <div key={card.label} className="glass-panel" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}><i className={"fas " + card.icon} /></div>
            <div><div style={{ fontSize: "22px", fontWeight: "800", fontFamily: "var(--font-mono)", color: card.color }}>{card.value}</div><div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{card.label}</div></div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", flex: 1, minHeight: 0 }}>
        <div className="glass-panel" style={{ padding: 0, position: "relative", overflow: "hidden", minHeight: "380px" }}>
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
          {loading && (<div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,15,26,0.7)", zIndex: 10 }}><i className="fas fa-spinner fa-spin" style={{ fontSize: "28px", color: "var(--accent-steel)" }} /></div>)}
          {!loading && issues.filter(i => i.location && i.location.lat).length === 0 && (<div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: "10px" }}><i className="fas fa-map" style={{ fontSize: "36px", opacity: 0.2 }} /><div style={{ fontSize: "13px" }}>No geo-tagged assignments</div></div>)}
          <div style={{ position: "absolute", bottom: "12px", left: "12px", background: "rgba(10,15,26,0.9)", borderRadius: "8px", padding: "8px 12px", fontSize: "11px", zIndex: 500, border: "1px solid var(--border-color)" }}>
            {[["Open","#e0995e"],["In Progress","#5ebce0"],["Resolved","#5ee09d"]].map(pair => (<div key={pair[0]} style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "3px" }}><div style={{ width: "8px", height: "8px", borderRadius: "50%", background: pair[1], flexShrink: 0 }} /><span style={{ color: "var(--text-secondary)" }}>{pair[0]}</span></div>))}
          </div>
          <div style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(10,15,26,0.9)", borderRadius: "8px", padding: "7px 12px", fontSize: "11px", zIndex: 500, border: "1px solid var(--border-color)", color: "var(--text-muted)" }}><i className="fas fa-hand-pointer" style={{ marginRight: "6px", color: "var(--accent-steel)" }} />Click pin to update</div>
        </div>
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", display: "flex", gap: "6px", flexWrap: "wrap", flexShrink: 0 }}>
            {[["all","All"],["open","Open"],["in-progress","In Progress"],["resolved","Done"]].map(pair => (
              <button key={pair[0]} onClick={() => setFilter(pair[0])} style={{ padding: "5px 12px", borderRadius: "20px", border: "1px solid", cursor: "pointer", fontSize: "11px", fontWeight: "700", transition: "all 0.15s", background: filter === pair[0] ? "var(--accent-steel)" : "var(--bg-tertiary)", borderColor: filter === pair[0] ? "var(--accent-steel)" : "var(--border-color)", color: filter === pair[0] ? "#fff" : "var(--text-secondary)" }}>{pair[1]}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (<div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}><i className="fas fa-spinner fa-spin" style={{ fontSize: "22px" }} /></div>)
            : filtered.length === 0 ? (<div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}><i className="fas fa-check-circle" style={{ fontSize: "32px", opacity: 0.15, display: "block", marginBottom: "12px" }} />{issues.length === 0 ? "No issues assigned to you yet" : "No issues match this filter"}</div>)
            : filtered.map(issue => (
              <div key={issue.id} onClick={() => setOverlay(issue)} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-color)", cursor: "pointer", transition: "background 0.15s", display: "flex", gap: "12px", alignItems: "flex-start" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-tertiary)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, marginTop: "5px", background: STATUS_DOT[issue.status] || "#e0995e" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{issue.title}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", gap: "10px" }}><span>{issue.category}</span><span><i className="fas fa-map-marker-alt" style={{ marginRight: "3px" }} />{((issue.location && issue.location.address) || "").substring(0,28)}{((issue.location && issue.location.address) || "").length > 28 ? "..." : ""}</span></div>
                </div>
                <span className={"badge " + getBadgeClass(issue)} style={{ fontSize: "10px", flexShrink: 0 }}>{issue.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {overlayIssue && (<WorkOverlay issue={overlayIssue} currentUser={currentUser} onClose={() => setOverlay(null)} onUpdate={handleWorkUpdate} />)}
    </div>
  );
};

export default EmployeeView;
