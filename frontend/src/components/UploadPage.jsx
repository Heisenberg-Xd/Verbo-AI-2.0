import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { IoDocumentTextOutline } from "react-icons/io5";
import { MdArrowBack } from "react-icons/md";

const BASE = "http://127.0.0.1:8000";

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [fileThumbnails, setFileThumbnails] = useState([]);
  const [clusters, setClusters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [elbowGraph, setElbowGraph] = useState("");
  const [silhouetteGraph, setSilhouetteGraph] = useState("");
  const [modalFile, setModalFile] = useState(null);
  const [showResults, setShowResults] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [translatedFiles, setTranslatedFiles] = useState({});
  const [viewingTranslated, setViewingTranslated] = useState(false);
  const [activeFileName, setActiveFileName] = useState(null);
  const [fileLangs, setFileLangs] = useState({});
  const fileInputRef = useRef(null);

  const [summaries, setSummaries] = useState({});
  const [sentiment, setSentiment] = useState({});
  const [keywords, setKeywords] = useState({});
  const [representativeDocs, setRepresentativeDocs] = useState({});
  const [insightData, setInsightData] = useState([]);
  const [vizData, setVizData] = useState([]);
  const [langDistribution, setLangDistribution] = useState({});
  const [overallLangDist, setOverallLangDist] = useState({});
  const [intelligenceReport, setIntelligenceReport] = useState(null);

  const [activeInsightCluster, setActiveInsightCluster] = useState(null);
  const [activeTab, setActiveTab] = useState("clusters");
  const [expandedSummaries, setExpandedSummaries] = useState({});

  const [ragReady, setRagReady] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [chatClusterFilter, setChatClusterFilter] = useState("");
  const [chatTopK, setChatTopK] = useState(6);
  const [expandedSources, setExpandedSources] = useState({});
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setError(null);
    const thumbnails = selectedFiles.map(file =>
      file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    );
    setFileThumbnails(thumbnails);
  };

  const handleUpload = async () => {
    if (files.length === 0) { setError("Please select at least one file."); return; }
    setLoading(true);
    setError(null);
    const formData = new FormData();
    for (let file of files) formData.append("files", file);
    try {
      const uploadRes = await axios.post(`${BASE}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const filePaths = uploadRes.data.file_paths;
      const processRes = await axios.post(`${BASE}/process`, { file_paths: filePaths });
      const d = processRes.data;

      setClusters(d.clusters);
      setTranslatedFiles(d.translated_files || {});
      setFileLangs(d.file_languages || {});
      setElbowGraph(`${BASE}${d.elbow_graph}`);
      setSilhouetteGraph(`${BASE}${d.silhouette_graph}`);
      setSummaries(d.summaries || {});
      setSentiment(d.sentiment || {});
      setKeywords(d.keywords || {});
      setRepresentativeDocs(d.representative_docs || {});
      setInsightData(d.insight_data || []);
      setVizData(d.cluster_visualization_data || []);
      setLangDistribution(d.language_distribution || {});
      setOverallLangDist(d.overall_language_distribution || {});
      setIntelligenceReport(d.intelligence_report || null);
      setRagReady(d.rag_ready || false);

      if (d.insight_data && d.insight_data.length > 0) {
        setActiveInsightCluster(d.insight_data[0].cluster_name);
      }
      if (d.rag_ready) {
        setChatMessages([{
          role: "assistant",
          content: `Knowledge base indexed with **${d.rag_chunks_indexed || "?"}** chunks across **${Object.keys(d.clusters || {}).length}** clusters. Ask me anything about your documents.`,
          sources: [],
          isWelcome: true,
        }]);
      }
    } catch (err) {
      setError("Error uploading or processing files. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = async () => {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput("");
    setChatError(null);
    setChatMessages(prev => [...prev, { role: "user", content: q }]);
    setChatLoading(true);
    try {
      const res = await axios.post(`${BASE}/rag/chat`, {
        query: q,
        cluster_filter: chatClusterFilter || null,
        top_k: chatTopK,
      });
      const d = res.data;
      const sources = d.sources || [];

      let answer = d.answer || "";
      const isRawFallback =
        answer.startsWith("[RAG Retrieval") ||
        answer.includes("LLM offline") ||
        answer.startsWith("__no_llm__") ||
        answer.trim() === "";

      if (isRawFallback && sources.length > 0) {
        const genRes = await axios.post(`${BASE}/rag/generate`, {
          query: q,
          chunks: sources,
        });
        answer = genRes.data.answer || answer;
      }

      if (answer.startsWith("__no_llm__") || answer.includes("ANTHROPIC_API_KEY")) {
        answer = "⚠️ Gemini API key not detected by the server. Please check that your `.env` file contains `GEMINI_API_KEY=your-key` and restart the backend.";
      }

      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: answer,
        sources,
        cluster_scope: d.cluster_scope,
      }]);
    } catch (err) {
      console.error(err);
      setChatError("Something went wrong — check the browser console for details.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  };

  const handleRefresh = () => window.location.reload();
  const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const openFile = (fileName) => {
    setActiveFileName(fileName);
    setViewingTranslated(false);
    setModalFile(`${BASE}/files/${fileName}`);
    setShowResults(false);
  };

  const closeModal = () => {
    setModalFile(null);
    setActiveFileName(null);
    setViewingTranslated(false);
    setShowResults(true);
  };

  const switchToTranslated = () => {
    if (!activeFileName || !translatedFiles[activeFileName]) return;
    setModalFile(`${BASE}/translated/${translatedFiles[activeFileName]}`);
    setViewingTranslated(true);
  };

  const switchToOriginal = () => {
    if (!activeFileName) return;
    setModalFile(`${BASE}/files/${activeFileName}`);
    setViewingTranslated(false);
  };

  const hasTranslation = (fileName) => !!translatedFiles[fileName];

  const downloadOriginal = (e, fileName) => {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = `${BASE}/files/${fileName}`;
    a.download = fileName;
    a.click();
  };

  const downloadTranslated = (e, fileName) => {
    e.stopPropagation();
    if (!translatedFiles[fileName]) return;
    const a = document.createElement("a");
    a.href = `${BASE}/translated/${translatedFiles[fileName]}`;
    a.download = translatedFiles[fileName];
    a.click();
  };

  const downloadReport = () => {
    const a = document.createElement("a");
    a.href = `${BASE}/report`;
    a.download = "intelligence_report.json";
    a.click();
  };

  const getLangTag = (fileName) => {
    if (fileLangs[fileName]) {
      const { source, target } = fileLangs[fileName];
      return `${source.toUpperCase()}→${(target || "EN").toUpperCase()}`;
    }
    if (hasTranslation(fileName)) return "→EN";
    return null;
  };

  const getSentimentColor = (s) => {
    if (!s) return "#8888aa";
    if (s.compound >= 0.05) return "#34d399";
    if (s.compound <= -0.05) return "#f87171";
    return "#94a3b8";
  };

  const getSentimentLabel = (s) => {
    if (!s) return "Unknown";
    if (s.compound >= 0.05) return "Positive";
    if (s.compound <= -0.05) return "Negative";
    return "Neutral";
  };

  const clusterColors = [
    { bg: "rgba(139,92,246,0.05)", border: "rgba(139,92,246,0.15)", accent: "#a78bfa", dot: "#8b5cf6", glow: "rgba(139,92,246,0.4)" },
    { bg: "rgba(16,185,129,0.05)", border: "rgba(16,185,129,0.15)", accent: "#34d399", dot: "#10b981", glow: "rgba(16,185,129,0.4)" },
    { bg: "rgba(245,158,11,0.05)", border: "rgba(245,158,11,0.15)", accent: "#fbbf24", dot: "#f59e0b", glow: "rgba(245,158,11,0.4)" },
    { bg: "rgba(236,72,153,0.05)", border: "rgba(236,72,153,0.15)", accent: "#f472b6", dot: "#ec4899", glow: "rgba(236,72,153,0.4)" },
    { bg: "rgba(59,130,246,0.05)", border: "rgba(59,130,246,0.15)", accent: "#60a5fa", dot: "#3b82f6", glow: "rgba(59,130,246,0.4)" },
  ];

  const totalFiles = clusters ? Object.values(clusters).reduce((a, b) => a + b.length, 0) : 0;
  const avgClusterSize = clusters ? Math.round(totalFiles / Object.keys(clusters).length) : 0;

  const canvasRef = useRef(null);
  useEffect(() => {
    if (!vizData.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const xs = vizData.map(d => d.x), ys = vizData.map(d => d.y);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const pad = 40;
    const toX = v => pad + ((v - xMin) / (xMax - xMin || 1)) * (W - 2 * pad);
    const toY = v => H - pad - ((v - yMin) / (yMax - yMin || 1)) * (H - 2 * pad);
    const colors = ["#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#ef4444", "#06b6d4"];
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const x = pad + (i / 6) * (W - 2 * pad);
      const y = pad + (i / 6) * (H - 2 * pad);
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, H - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    }
    const clusterGroups = {};
    vizData.forEach(d => {
      if (!clusterGroups[d.cluster_id]) clusterGroups[d.cluster_id] = [];
      clusterGroups[d.cluster_id].push(d);
    });
    Object.entries(clusterGroups).forEach(([cid, pts]) => {
      const color = colors[parseInt(cid) % colors.length];
      const cx = pts.reduce((s, p) => s + toX(p.x), 0) / pts.length;
      const cy = pts.reduce((s, p) => s + toY(p.y), 0) / pts.length;
      const maxR = Math.max(...pts.map(p => Math.sqrt((toX(p.x) - cx) ** 2 + (toY(p.y) - cy) ** 2))) + 16;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      grad.addColorStop(0, color + "1a");
      grad.addColorStop(1, color + "00");
      ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();
    });
    vizData.forEach(d => {
      const x = toX(d.x), y = toY(d.y);
      const color = colors[d.cluster_id % colors.length];
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color + "cc"; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "8.5px 'JetBrains Mono', monospace";
      const label = d.filename.length > 12 ? d.filename.slice(0, 11) + "…" : d.filename;
      ctx.fillText(label, x + 8, y + 3);
    });
  }, [vizData]);

  const activeInsight = insightData.find(i => i.cluster_name === activeInsightCluster);

  const renderMsgContent = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=JetBrains+Mono:wght@300;400;500;600&family=Syne:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:          #080b14;
          --bg2:         #0d1117;
          --surface:     #111520;
          --surface2:    #161b27;
          --surface3:    #1c2233;
          --border:      rgba(255,255,255,0.055);
          --border-md:   rgba(255,255,255,0.09);
          --border-hi:   rgba(255,255,255,0.14);
          --text:        #e8eaf4;
          --text-2:      #8892a4;
          --text-3:      #4a5568;
          --violet:      #7c6df0;
          --violet-light:#a89af5;
          --violet-glow: rgba(124,109,240,0.35);
          --teal:        #2dd4bf;
          --teal-dim:    rgba(45,212,191,0.5);
          --green:       #22d3a0;
          --amber:       #f6c35a;
          --rose:        #f87171;
          --font:        'DM Sans', sans-serif;
          --font-display:'Syne', sans-serif;
          --font-mono:   'JetBrains Mono', monospace;
          --r-sm:  6px;
          --r-md:  10px;
          --r-lg:  16px;
          --r-xl:  22px;
          --r-2xl: 28px;
        }

        html, body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font);
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── Scrollbar ─────────────────────────────────────── */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }

        /* ─── App wrapper ───────────────────────────────────── */
        .app { min-height: 100vh; position: relative; overflow-x: hidden; }

        /* ─── Ambient background ────────────────────────────── */
        .bg-noise {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
          background-size: 200px 200px;
          opacity: 0.4;
        }

        .bg-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(124,109,240,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,109,240,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, black 20%, transparent 100%);
        }

        .bg-orb {
          position: fixed; border-radius: 50%; filter: blur(120px); pointer-events: none; z-index: 0;
        }
        .orb-1 {
          width: 600px; height: 600px; top: -200px; left: -100px;
          background: radial-gradient(circle, rgba(100,80,220,0.12) 0%, transparent 70%);
          animation: orbFloat 20s ease-in-out infinite alternate;
        }
        .orb-2 {
          width: 480px; height: 480px; bottom: -120px; right: -80px;
          background: radial-gradient(circle, rgba(20,140,120,0.08) 0%, transparent 70%);
          animation: orbFloat 28s ease-in-out infinite alternate-reverse;
        }
        .orb-3 {
          width: 300px; height: 300px; top: 40%; right: 20%;
          background: radial-gradient(circle, rgba(100,80,220,0.05) 0%, transparent 70%);
          animation: orbFloat 35s ease-in-out infinite alternate;
        }
        @keyframes orbFloat {
          0% { transform: translate(0,0) scale(1); }
          100% { transform: translate(40px, 30px) scale(1.05); }
        }

        /* ─── Shell ─────────────────────────────────────────── */
        .shell {
          position: relative; z-index: 1;
          max-width: 1520px; margin: 0 auto;
          padding: 0 36px 100px;
        }

        /* ─── Topbar ─────────────────────────────────────────── */
        .topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px 0 0; margin-bottom: 44px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 20px;
        }

        .logo-area { display: flex; align-items: center; gap: 14px; }

        .logo-mark {
          width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
          background: linear-gradient(140deg, #6d5ce7 0%, #9b8bf4 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 1px rgba(168,154,245,0.2), 0 8px 24px rgba(109,92,231,0.4);
          position: relative; overflow: hidden;
        }
        .logo-mark::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%);
        }
        .logo-mark svg { width: 18px; height: 18px; fill: white; position: relative; z-index: 1; }

        .logo-text { font-family: var(--font-display); font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
        .logo-text em { font-style: normal; color: var(--violet-light); }

        .logo-divider { width: 1px; height: 18px; background: var(--border-md); }

        .logo-sub {
          font-family: var(--font-mono); font-size: 10.5px;
          color: var(--text-3); letter-spacing: 0.3px;
        }

        .topbar-right { display: flex; align-items: center; gap: 8px; }

        .badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 100px;
          font-family: var(--font-mono); font-size: 10px; font-weight: 500;
          border: 1px solid; letter-spacing: 0.2px;
          transition: all 0.2s;
        }
        .badge-violet { background: rgba(124,109,240,0.08); border-color: rgba(124,109,240,0.2); color: var(--violet-light); }
        .badge-teal   { background: rgba(45,212,191,0.07); border-color: rgba(45,212,191,0.18); color: var(--teal); }
        .badge-green  { background: rgba(34,211,160,0.08); border-color: rgba(34,211,160,0.2); color: var(--green); }
        .badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
        .badge-dot-pulse { animation: dotPulse 2s ease-in-out infinite; }
        @keyframes dotPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }

        /* ─── Stats strip ───────────────────────────────────── */
        .stats-row {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 12px; margin-bottom: 24px;
          animation: slideUp 0.4s ease both;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r-lg);
          padding: 18px 22px;
          position: relative; overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
        }
        .stat-card::before {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--c, rgba(124,109,240,0.3)), transparent);
        }
        .stat-card:hover { border-color: var(--border-md); transform: translateY(-1px); }

        .stat-card.c-violet { --c: rgba(124,109,240,0.4); }
        .stat-card.c-teal   { --c: rgba(45,212,191,0.4); }
        .stat-card.c-green  { --c: rgba(34,211,160,0.4); }
        .stat-card.c-amber  { --c: rgba(246,195,90,0.4); }

        .stat-label {
          font-family: var(--font-mono); font-size: 9px;
          font-weight: 600; letter-spacing: 1.8px;
          text-transform: uppercase; color: var(--text-3);
          margin-bottom: 8px;
        }
        .stat-label.v { color: rgba(168,154,245,0.5); }
        .stat-label.t { color: rgba(45,212,191,0.45); }
        .stat-label.g { color: rgba(34,211,160,0.45); }
        .stat-label.a { color: rgba(246,195,90,0.45); }

        .stat-value {
          font-family: var(--font-display); font-size: 36px;
          font-weight: 800; line-height: 1; letter-spacing: -2px;
          color: var(--text);
        }
        .stat-value.v { color: var(--violet-light); }
        .stat-value.t { color: var(--teal); }
        .stat-value.g { color: var(--green); }
        .stat-value.a { color: var(--amber); }

        .stat-sub {
          font-size: 11px; color: var(--text-3); margin-top: 4px; font-weight: 500;
        }

        /* ─── Layout ─────────────────────────────────────────── */
        .workspace {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 20px; align-items: start;
        }

        /* ─── Panel base ─────────────────────────────────────── */
        .panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r-xl);
          overflow: hidden;
          transition: border-color 0.25s;
        }
        .panel:hover { border-color: var(--border-md); }

        .panel-header {
          padding: 22px 24px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: flex-start; gap: 14px;
          background: linear-gradient(180deg, var(--surface2) 0%, transparent 100%);
        }

        .step-chip {
          font-family: var(--font-mono); font-size: 9px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase;
          padding: 4px 9px; border-radius: 6px;
          background: rgba(124,109,240,0.1); border: 1px solid rgba(124,109,240,0.2);
          color: rgba(168,154,245,0.65); flex-shrink: 0; margin-top: 3px;
        }

        .panel-title {
          font-family: var(--font-display); font-size: 16px;
          font-weight: 700; color: var(--text); letter-spacing: -0.3px;
        }
        .panel-sub { font-size: 12px; color: var(--text-2); margin-top: 3px; }
        .panel-body { padding: 20px 24px 24px; }

        /* ─── Drop zone ──────────────────────────────────────── */
        .drop-zone {
          border: 1.5px dashed rgba(255,255,255,0.08);
          border-radius: var(--r-lg); padding: 36px 20px;
          text-align: center; cursor: pointer;
          transition: all 0.25s ease;
          background: rgba(255,255,255,0.01);
          position: relative; overflow: hidden;
        }
        .drop-zone::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse 65% 55% at 50% 0%, rgba(124,109,240,0.07) 0%, transparent 70%);
          opacity: 0; transition: opacity 0.3s;
        }
        .drop-zone:hover::after, .drop-zone.active::after { opacity: 1; }
        .drop-zone:hover, .drop-zone.active {
          border-color: rgba(124,109,240,0.4);
          background: rgba(124,109,240,0.03);
        }

        .drop-icon {
          width: 52px; height: 52px; border-radius: 14px; margin: 0 auto 16px;
          background: rgba(124,109,240,0.09); border: 1px solid rgba(124,109,240,0.18);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.3s;
        }
        .drop-zone:hover .drop-icon {
          background: rgba(124,109,240,0.16); border-color: rgba(124,109,240,0.38);
          transform: scale(1.07); box-shadow: 0 0 32px rgba(124,109,240,0.25);
        }
        .drop-icon svg { width: 22px; height: 22px; stroke: var(--violet-light); fill: none; stroke-width: 1.6; }

        .drop-headline { font-size: 14px; font-weight: 600; color: var(--text-2); }
        .drop-hint {
          font-family: var(--font-mono); font-size: 10.5px;
          color: var(--text-3); margin-top: 6px; line-height: 1.8;
        }

        .file-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
        .file-chip {
          display: flex; align-items: center; gap: 7px;
          background: rgba(124,109,240,0.09); border: 1px solid rgba(124,109,240,0.18);
          border-radius: 8px; padding: 6px 11px; max-width: 148px;
        }
        .file-chip img { width: 30px; height: 30px; object-fit: cover; border-radius: 5px; }
        .file-chip-name {
          font-family: var(--font-mono); font-size: 10.5px; color: var(--violet-light);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* ─── Actions ────────────────────────────────────────── */
        .actions { display: flex; gap: 10px; margin-top: 14px; }

        .btn-primary {
          flex: 1; padding: 13px 20px;
          background: linear-gradient(135deg, #6d5ce7 0%, #9880f0 60%, #7c6df0 100%);
          color: white; border: none; border-radius: var(--r-md);
          font-family: var(--font); font-size: 13.5px; font-weight: 700;
          cursor: pointer; position: relative; overflow: hidden;
          transition: all 0.22s;
          box-shadow: 0 4px 20px rgba(109,92,231,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .btn-primary::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 55%);
          opacity: 0; transition: opacity 0.2s;
        }
        .btn-primary:hover:not(:disabled)::before { opacity: 1; }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(109,92,231,0.55), inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn-ghost {
          padding: 13px 16px;
          background: transparent; color: var(--text-3);
          border: 1px solid var(--border); border-radius: var(--r-md);
          font-family: var(--font); font-size: 12.5px; font-weight: 600;
          cursor: pointer; transition: all 0.18s;
          display: flex; align-items: center; gap: 6px;
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,0.04); color: var(--text-2);
          border-color: var(--border-md);
        }
        .btn-ghost svg { width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2; }

        /* ─── Progress ───────────────────────────────────────── */
        .progress-wrap { margin-top: 14px; }
        .progress-track {
          height: 2px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6d5ce7, #a89af5, #6d5ce7);
          background-size: 300% 100%;
          animation: shimmer 1.6s ease-in-out infinite;
          border-radius: 2px;
        }
        @keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }

        .progress-status {
          display: flex; align-items: center; gap: 10px;
          margin-top: 12px; padding: 10px 14px;
          background: rgba(124,109,240,0.06); border: 1px solid rgba(124,109,240,0.12);
          border-radius: var(--r-sm);
        }
        .spinner {
          width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
          border: 1.5px solid rgba(124,109,240,0.25);
          border-top-color: var(--violet-light);
          animation: spin 0.65s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .progress-text { font-family: var(--font-mono); font-size: 10.5px; color: var(--violet-light); }

        .error-box {
          margin-top: 12px; padding: 10px 14px;
          background: rgba(248,113,113,0.06); border: 1px solid rgba(248,113,113,0.16);
          border-radius: var(--r-sm); color: #fca5a5;
          font-size: 11.5px; font-family: var(--font-mono);
          display: flex; align-items: center; gap: 8px;
        }
        .error-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--rose); flex-shrink: 0; }

        /* ─── Cluster panel ──────────────────────────────────── */
        .cluster-panel {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--r-xl); overflow: hidden;
          margin-top: 16px; animation: slideUp 0.3s ease both;
        }

        .cluster-topbar {
          padding: 14px 20px; display: flex; align-items: center; gap: 9px;
          border-bottom: 1px solid var(--border);
          background: linear-gradient(180deg, var(--surface2) 0%, transparent 100%);
        }
        .cluster-topbar-title {
          font-family: var(--font-display); font-size: 14px; font-weight: 700; flex: 1; color: var(--text);
        }

        .chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: var(--font-mono); font-size: 9.5px; font-weight: 600;
          padding: 3px 9px; border-radius: 100px;
        }
        .chip-violet { background: rgba(124,109,240,0.1); border: 1px solid rgba(124,109,240,0.2); color: var(--violet-light); }
        .chip-teal   { background: rgba(45,212,191,0.08); border: 1px solid rgba(45,212,191,0.18); color: var(--teal); }
        .chip-dot    { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

        .cluster-body { padding: 10px; }

        .cluster-card {
          border-radius: var(--r-md); padding: 13px 15px;
          margin-bottom: 8px; border: 1px solid;
          animation: slideUp 0.4s ease both;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .cluster-card:last-child { margin-bottom: 0; }
        .cluster-card:hover { transform: translateX(2px); }

        .cluster-head { display: flex; align-items: center; gap: 9px; margin-bottom: 9px; }
        .cluster-dot-wrap {
          width: 24px; height: 24px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .cluster-dot { width: 7px; height: 7px; border-radius: 50%; }
        .cluster-name { font-size: 12.5px; font-weight: 700; flex: 1; }
        .cluster-count {
          font-family: var(--font-mono); font-size: 9px;
          padding: 2px 8px; border-radius: 100px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07);
          color: var(--text-3);
        }

        /* ─── File items ─────────────────────────────────────── */
        .file-list { display: flex; flex-direction: column; gap: 2px; }

        .file-row {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 10px; border-radius: 8px;
          background: rgba(0,0,0,0.14); cursor: pointer;
          transition: all 0.15s; border: 1px solid transparent; min-width: 0;
        }
        .file-row:hover {
          background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.07);
        }
        .file-row-icon { flex-shrink: 0; color: var(--text-3); }
        .file-row-name {
          font-family: var(--font-mono); font-size: 10.5px; color: var(--text-2); flex: 1;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          transition: color 0.15s;
        }
        .file-row:hover .file-row-name { color: var(--text); }
        .file-row-meta { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }

        .lang-pill {
          font-family: var(--font-mono); font-size: 8px; font-weight: 700;
          padding: 2px 6px; border-radius: 5px; letter-spacing: 0.5px; white-space: nowrap;
          background: rgba(45,212,191,0.09); border: 1px solid rgba(45,212,191,0.2); color: var(--teal);
        }

        .dl-group { display: flex; align-items: center; gap: 3px; opacity: 0; transition: opacity 0.15s; }
        .file-row:hover .dl-group { opacity: 1; }

        .dl-btn {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 2px 7px; border-radius: 5px; border: 1px solid;
          font-family: var(--font-mono); font-size: 8.5px; font-weight: 700;
          cursor: pointer; background: transparent; white-space: nowrap;
          line-height: 1.2; transition: all 0.15s;
        }
        .dl-btn svg { width: 8px; height: 8px; stroke: currentColor; fill: none; stroke-width: 2.5; flex-shrink: 0; }
        .dl-og { border-color: rgba(168,154,245,0.22); color: var(--violet-light); }
        .dl-og:hover { background: rgba(124,109,240,0.16); border-color: rgba(168,154,245,0.45); }
        .dl-tr { border-color: rgba(45,212,191,0.2); color: var(--teal); }
        .dl-tr:hover { background: rgba(45,212,191,0.12); border-color: rgba(45,212,191,0.42); }

        .file-arrow { opacity: 0; font-size: 10px; color: var(--violet-light); transition: all 0.15s; transform: translateX(-3px); }
        .file-row:hover .file-arrow { opacity: 1; transform: translateX(0); }

        /* ─── Report bar ─────────────────────────────────────── */
        .report-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; margin: 0 10px 10px;
          background: rgba(34,211,160,0.05); border: 1px solid rgba(34,211,160,0.14);
          border-radius: var(--r-md); animation: slideUp 0.5s ease both;
        }
        .report-bar-left { display: flex; align-items: center; gap: 10px; }
        .report-icon {
          width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
          background: rgba(34,211,160,0.1); border: 1px solid rgba(34,211,160,0.2);
          display: flex; align-items: center; justify-content: center;
        }
        .report-icon svg { width: 14px; height: 14px; stroke: var(--green); fill: none; stroke-width: 2; }
        .report-label { font-size: 12.5px; font-weight: 700; color: var(--green); }
        .report-sub { font-family: var(--font-mono); font-size: 9.5px; color: rgba(34,211,160,0.45); margin-top: 1px; }

        .btn-report {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 8px;
          background: rgba(34,211,160,0.1); border: 1px solid rgba(34,211,160,0.22);
          color: var(--green); font-size: 11.5px; font-weight: 700;
          cursor: pointer; transition: all 0.18s; font-family: var(--font);
        }
        .btn-report:hover { background: rgba(34,211,160,0.18); border-color: rgba(34,211,160,0.4); }
        .btn-report svg { width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2; }

        /* ─── Analysis panel ─────────────────────────────────── */
        .analysis-panel {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--r-xl); overflow: hidden;
        }

        .analysis-head {
          padding: 22px 24px; border-bottom: 1px solid var(--border);
          display: flex; align-items: flex-start; gap: 14px;
          background: linear-gradient(180deg, var(--surface2) 0%, transparent 100%);
        }
        .analysis-body { padding: 20px 22px; }

        /* ─── Graph grid ─────────────────────────────────────── */
        .graphs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        .graph-method {
          font-family: var(--font-mono); font-size: 8.5px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase;
          padding: 2px 7px; border-radius: 5px;
          background: rgba(255,255,255,0.04); border: 1px solid var(--border);
          color: var(--text-3);
        }
        .graph-title { font-size: 12px; font-weight: 700; color: var(--text); }
        .graph-label-row { display: flex; align-items: center; gap: 7px; margin-bottom: 9px; }

        .graph-box {
          border-radius: 9px; overflow: hidden;
          border: 1px solid var(--border); background: rgba(0,0,0,0.2);
        }
        .graph-box img { width: 100%; display: block; max-height: 185px; object-fit: contain; }

        .graph-empty {
          height: 145px; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 10px;
        }
        .graph-empty-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: center;
        }
        .graph-empty-icon svg { width: 16px; height: 16px; stroke: var(--text-3); fill: none; stroke-width: 1.5; }
        .graph-empty-text { font-family: var(--font-mono); font-size: 9.5px; color: var(--text-3); }

        /* ─── Tabs ───────────────────────────────────────────── */
        .tabs {
          display: flex; align-items: center; gap: 3px;
          padding-bottom: 16px; margin-top: 20px;
          border-bottom: 1px solid var(--border); margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .tab {
          padding: 7px 14px; border-radius: 8px;
          border: 1px solid transparent;
          font-size: 12.5px; font-weight: 600; cursor: pointer;
          transition: all 0.18s; color: var(--text-3);
          background: transparent; font-family: var(--font);
          display: flex; align-items: center; gap: 6px;
        }
        .tab:hover { color: var(--text-2); background: rgba(255,255,255,0.04); }
        .tab.on {
          background: rgba(124,109,240,0.1); border-color: rgba(124,109,240,0.22);
          color: var(--violet-light);
        }
        .tab.on-green {
          background: rgba(34,211,160,0.09); border-color: rgba(34,211,160,0.22);
          color: var(--green);
        }

        .tab-count {
          font-family: var(--font-mono); font-size: 9px;
          padding: 1px 6px; border-radius: 100px;
          background: rgba(255,255,255,0.06); color: var(--text-3);
        }
        .tab.on .tab-count { background: rgba(124,109,240,0.18); color: var(--violet-light); }
        .tab.on-green .tab-count { background: rgba(34,211,160,0.15); color: var(--green); }

        /* ─── Summary cards ──────────────────────────────────── */
        .summary-cards { display: flex; flex-direction: column; gap: 10px; }

        .summary-card {
          border-radius: var(--r-md); padding: 14px 16px; border: 1px solid;
          transition: transform 0.15s;
        }
        .summary-card:hover { transform: translateX(2px); }

        .summary-card-head {
          display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
        }
        .summary-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .summary-card-name { font-size: 12px; font-weight: 700; }
        .summary-kw {
          font-family: var(--font-mono); font-size: 9px; padding: 2px 7px;
          border-radius: 5px; background: rgba(124,109,240,0.08);
          border: 1px solid rgba(124,109,240,0.16); color: var(--violet-light);
        }

        .summary-text {
          font-size: 12.5px; color: var(--text-2); line-height: 1.75;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .summary-text.expanded { -webkit-line-clamp: unset; overflow: visible; }
        .expand-btn {
          font-family: var(--font-mono); font-size: 10px; color: var(--violet-light);
          background: none; border: none; cursor: pointer; padding: 4px 0 0;
          display: block;
        }

        /* ─── Insights layout ────────────────────────────────── */
        .insights-wrap { display: grid; grid-template-columns: 175px 1fr; gap: 12px; }

        .insight-nav { display: flex; flex-direction: column; gap: 3px; }

        .insight-nav-btn {
          padding: 9px 11px; border-radius: 8px;
          border: 1px solid transparent; cursor: pointer; text-align: left;
          font-size: 12px; font-weight: 600; color: var(--text-3);
          background: transparent; transition: all 0.15s; font-family: var(--font);
          display: flex; align-items: center; gap: 7px; width: 100%;
        }
        .insight-nav-btn:hover { background: rgba(255,255,255,0.04); color: var(--text-2); }
        .insight-nav-btn.on { background: rgba(124,109,240,0.09); border-color: rgba(124,109,240,0.2); color: var(--violet-light); }
        .insight-nav-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .insight-nav-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }

        .insight-detail { display: flex; flex-direction: column; gap: 10px; }

        .icard {
          background: rgba(0,0,0,0.18); border: 1px solid var(--border);
          border-radius: var(--r-md); padding: 14px 16px;
        }
        .icard-label {
          font-family: var(--font-mono); font-size: 8.5px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase; color: var(--text-3);
          margin-bottom: 9px;
        }
        .icard-value { font-size: 13px; color: var(--text); line-height: 1.65; }

        /* sentiment */
        .sent-bars { display: flex; flex-direction: column; gap: 7px; }
        .sent-row { display: flex; align-items: center; gap: 10px; }
        .sent-lbl { font-family: var(--font-mono); font-size: 10px; color: var(--text-2); width: 55px; }
        .sent-track { flex: 1; height: 5px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
        .sent-fill { height: 100%; border-radius: 3px; transition: width 0.8s ease; }
        .sent-pct { font-family: var(--font-mono); font-size: 9.5px; color: var(--text-3); width: 35px; text-align: right; }

        /* keywords */
        .kw-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
        .kw-chip {
          font-family: var(--font-mono); font-size: 10px; padding: 3px 9px;
          border-radius: 6px; background: rgba(124,109,240,0.07);
          border: 1px solid rgba(124,109,240,0.15); color: var(--violet-light);
        }

        /* lang dist */
        .lang-dist { display: flex; flex-wrap: wrap; gap: 6px; }
        .lang-item {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 7px;
          background: rgba(45,212,191,0.07); border: 1px solid rgba(45,212,191,0.15);
        }
        .lang-code { font-family: var(--font-mono); font-size: 10.5px; font-weight: 700; color: var(--teal); }
        .lang-count { font-family: var(--font-mono); font-size: 9.5px; color: var(--text-3); }

        /* rep doc */
        .rep-doc {
          display: flex; align-items: center; gap: 9px; padding: 9px 12px;
          background: rgba(246,195,90,0.05); border: 1px solid rgba(246,195,90,0.13);
          border-radius: var(--r-sm); margin-bottom: 10px;
        }
        .rep-doc-name {
          font-family: var(--font-mono); font-size: 11px; color: var(--amber);
          flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .rep-doc-badge {
          font-family: var(--font-mono); font-size: 8.5px; padding: 2px 6px;
          border-radius: 4px; background: rgba(246,195,90,0.1);
          color: var(--amber); border: 1px solid rgba(246,195,90,0.2);
        }

        .ranked-list { display: flex; flex-direction: column; gap: 3px; }
        .ranked-item {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 10px; border-radius: 7px; background: rgba(0,0,0,0.15);
        }
        .ranked-num { font-family: var(--font-mono); font-size: 9px; color: var(--text-3); width: 16px; }
        .ranked-name { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-2); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ranked-sim { font-family: var(--font-mono); font-size: 9.5px; color: var(--text-3); }

        /* ─── Viz panel ──────────────────────────────────────── */
        .viz-panel {
          background: rgba(0,0,0,0.18); border: 1px solid var(--border);
          border-radius: var(--r-lg); padding: 16px;
        }
        .viz-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .viz-title { font-family: var(--font-display); font-size: 13.5px; font-weight: 700; color: var(--text); }
        .viz-sub { font-family: var(--font-mono); font-size: 9.5px; color: var(--text-3); margin-top: 2px; }
        .viz-canvas {
          border-radius: 10px; border: 1px solid var(--border);
          display: block; background: rgba(0,0,0,0.28); width: 100%;
        }
        .viz-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
        .viz-legend-item { display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 10px; color: var(--text-2); }
        .viz-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        /* ─── Language tab ───────────────────────────────────── */
        .lang-overall-bar { flex: 1; height: 5px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
        .lang-overall-fill { height: 100%; background: linear-gradient(90deg, var(--teal), #0891b2); border-radius: 3px; }

        /* ─── RAG Chat ───────────────────────────────────────── */
        .rag-wrap {
          display: flex; flex-direction: column; height: 680px;
          background: rgba(0,0,0,0.14); border: 1px solid var(--border);
          border-radius: var(--r-lg); overflow: hidden;
        }

        .rag-header {
          padding: 14px 18px; border-bottom: 1px solid var(--border);
          background: rgba(34,211,160,0.03);
          display: flex; align-items: center; gap: 10px; flex-shrink: 0;
        }
        .rag-head-icon {
          width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          background: rgba(34,211,160,0.1); border: 1px solid rgba(34,211,160,0.2);
          display: flex; align-items: center; justify-content: center;
        }
        .rag-head-icon svg { width: 14px; height: 14px; stroke: var(--green); fill: none; stroke-width: 2; }
        .rag-head-info { flex: 1; }
        .rag-head-title { font-size: 13px; font-weight: 700; color: var(--text); }
        .rag-head-sub { font-family: var(--font-mono); font-size: 9.5px; color: var(--text-3); margin-top: 1px; }
        .rag-status { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .rag-status.ready { background: var(--green); box-shadow: 0 0 8px var(--green); animation: dotPulse 2s ease-in-out infinite; }
        .rag-status.offline { background: var(--text-3); }

        .rag-controls {
          padding: 10px 14px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 8px; flex-shrink: 0;
          background: rgba(0,0,0,0.1); flex-wrap: wrap;
        }
        .rag-ctrl-label { font-family: var(--font-mono); font-size: 9px; color: var(--text-3); text-transform: uppercase; letter-spacing: 1.2px; }
        .rag-select {
          background: rgba(255,255,255,0.04); border: 1px solid var(--border);
          border-radius: 7px; color: var(--text-2); font-family: var(--font-mono);
          font-size: 10.5px; padding: 4px 8px; outline: none; cursor: pointer;
          transition: border-color 0.15s;
        }
        .rag-select:focus { border-color: rgba(34,211,160,0.4); }

        .rag-topk-wrap { display: flex; align-items: center; gap: 6px; margin-left: auto; }
        .rag-topk-btn {
          width: 22px; height: 22px; border-radius: 5px;
          border: 1px solid var(--border); background: transparent;
          color: var(--text-3); cursor: pointer; font-size: 14px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .rag-topk-btn:hover { background: rgba(255,255,255,0.07); color: var(--text-2); }
        .rag-topk-val { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-2); min-width: 16px; text-align: center; }

        .rag-messages {
          flex: 1; overflow-y: auto; padding: 16px;
          display: flex; flex-direction: column; gap: 14px;
          scroll-behavior: smooth;
        }

        .rag-msg { display: flex; gap: 10px; animation: msgIn 0.22s ease both; }
        @keyframes msgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .rag-msg.user { flex-direction: row-reverse; }

        .rag-avatar {
          width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 10.5px; font-weight: 700; margin-top: 2px;
          font-family: var(--font-mono);
        }
        .rag-avatar.ai { background: rgba(34,211,160,0.1); border: 1px solid rgba(34,211,160,0.2); color: var(--green); }
        .rag-avatar.usr { background: rgba(124,109,240,0.12); border: 1px solid rgba(124,109,240,0.22); color: var(--violet-light); }

        .rag-bubble-wrap { display: flex; flex-direction: column; gap: 6px; max-width: 88%; }
        .rag-msg.user .rag-bubble-wrap { align-items: flex-end; }

        .rag-bubble { padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.65; }
        .rag-bubble.ai {
          background: rgba(255,255,255,0.04); border: 1px solid var(--border);
          color: var(--text); border-radius: 12px 12px 12px 3px;
        }
        .rag-bubble.ai.welcome {
          background: rgba(34,211,160,0.04); border-color: rgba(34,211,160,0.13); color: var(--text-2);
        }
        .rag-bubble.usr {
          background: rgba(124,109,240,0.12); border: 1px solid rgba(124,109,240,0.2);
          color: var(--text); border-radius: 12px 12px 3px 12px;
        }

        .rag-sources-toggle {
          display: inline-flex; align-items: center; gap: 5px;
          background: none; border: none; cursor: pointer; padding: 0;
          font-family: var(--font-mono); font-size: 9.5px;
          color: rgba(34,211,160,0.55); transition: color 0.15s;
        }
        .rag-sources-toggle:hover { color: var(--green); }
        .rag-sources-toggle svg { width: 10px; height: 10px; stroke: currentColor; fill: none; stroke-width: 2; transition: transform 0.2s; }
        .rag-sources-toggle.open svg { transform: rotate(180deg); }

        .rag-sources { display: flex; flex-direction: column; gap: 5px; margin-top: 4px; animation: slideUp 0.2s ease both; }
        .rag-source {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 8px 10px; background: rgba(0,0,0,0.22);
          border: 1px solid var(--border); border-radius: 8px;
        }
        .rag-source-rank { font-family: var(--font-mono); font-size: 8.5px; color: var(--text-3); width: 14px; flex-shrink: 0; padding-top: 1px; }
        .rag-source-body { flex: 1; min-width: 0; }
        .rag-source-file { font-family: var(--font-mono); font-size: 10px; font-weight: 600; color: var(--violet-light); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rag-source-cluster { font-family: var(--font-mono); font-size: 8.5px; color: var(--text-3); margin-top: 1px; }
        .rag-source-excerpt { font-size: 10.5px; color: var(--text-2); line-height: 1.5; margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .rag-source-sim { font-family: var(--font-mono); font-size: 8.5px; padding: 2px 6px; border-radius: 4px; background: rgba(34,211,160,0.07); border: 1px solid rgba(34,211,160,0.14); color: rgba(34,211,160,0.65); flex-shrink: 0; margin-top: 1px; }

        .rag-typing {
          display: flex; align-items: center; gap: 5px;
          padding: 10px 14px; background: rgba(255,255,255,0.04);
          border: 1px solid var(--border); border-radius: 12px 12px 12px 3px;
          width: fit-content;
        }
        .rag-typing span {
          width: 5px; height: 5px; border-radius: 50%; background: var(--text-3);
          animation: typingBounce 1.2s ease-in-out infinite;
        }
        .rag-typing span:nth-child(2) { animation-delay: 0.2s; }
        .rag-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBounce { 0%,60%,100%{transform:translateY(0);opacity:0.35} 30%{transform:translateY(-5px);opacity:1} }

        .rag-empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 10px; padding: 20px;
        }
        .rag-empty-icon {
          width: 48px; height: 48px; border-radius: 14px;
          background: rgba(34,211,160,0.05); border: 1px dashed rgba(34,211,160,0.17);
          display: flex; align-items: center; justify-content: center;
        }
        .rag-empty-icon svg { width: 22px; height: 22px; stroke: rgba(34,211,160,0.35); fill: none; stroke-width: 1.5; }
        .rag-empty-title { font-family: var(--font-display); font-size: 14px; font-weight: 700; color: var(--text-2); }
        .rag-empty-sub { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-3); text-align: center; line-height: 1.7; max-width: 280px; }

        .rag-prompts { display: flex; flex-direction: column; gap: 5px; margin-top: 6px; width: 100%; max-width: 320px; }
        .rag-prompt {
          padding: 9px 12px; background: rgba(34,211,160,0.04);
          border: 1px solid rgba(34,211,160,0.12); border-radius: 8px;
          color: rgba(34,211,160,0.65); font-size: 11.5px; cursor: pointer;
          text-align: left; transition: all 0.15s; font-family: var(--font);
        }
        .rag-prompt:hover { background: rgba(34,211,160,0.09); border-color: rgba(34,211,160,0.25); color: var(--green); }

        .rag-error {
          padding: 8px 12px; background: rgba(248,113,113,0.07);
          border: 1px solid rgba(248,113,113,0.16); border-radius: 8px;
          color: #fca5a5; font-family: var(--font-mono); font-size: 10.5px;
          margin: 0 16px 10px; display: flex; align-items: center; gap: 7px; flex-shrink: 0;
        }

        .rag-offline {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 10px; padding: 24px;
        }
        .rag-offline-title { font-family: var(--font-display); font-size: 14px; font-weight: 700; color: var(--text-2); }
        .rag-offline-sub { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-3); line-height: 1.75; text-align: center; }

        .rag-input-area {
          padding: 12px 14px; border-top: 1px solid var(--border);
          flex-shrink: 0; background: rgba(0,0,0,0.1);
        }
        .rag-input-row { display: flex; gap: 8px; align-items: flex-end; }
        .rag-textarea {
          flex: 1; background: rgba(255,255,255,0.04); border: 1px solid var(--border);
          border-radius: 10px; padding: 10px 14px; color: var(--text);
          font-family: var(--font); font-size: 13px; resize: none; outline: none;
          min-height: 42px; max-height: 120px; transition: border-color 0.15s; line-height: 1.5;
        }
        .rag-textarea::placeholder { color: var(--text-3); }
        .rag-textarea:focus { border-color: rgba(34,211,160,0.32); }

        .rag-send {
          width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
          background: rgba(34,211,160,0.13); border: 1px solid rgba(34,211,160,0.26);
          color: var(--green); display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.18s;
        }
        .rag-send:hover:not(:disabled) {
          background: rgba(34,211,160,0.22); border-color: rgba(34,211,160,0.5);
          box-shadow: 0 0 18px rgba(34,211,160,0.2);
        }
        .rag-send:disabled { opacity: 0.35; cursor: not-allowed; }
        .rag-send svg { width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2; }
        .rag-hint { font-family: var(--font-mono); font-size: 9.5px; color: var(--text-3); margin-top: 7px; text-align: center; }

        /* ─── Modal ──────────────────────────────────────────── */
        .modal-backdrop {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(20px) saturate(180%);
          display: flex; align-items: center; justify-content: center; padding: 24px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .modal {
          background: var(--surface); border: 1px solid var(--border-md);
          border-radius: var(--r-xl); width: 100%; max-width: 920px; max-height: 90vh;
          overflow: hidden; display: flex; flex-direction: column;
          box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04);
          animation: modalIn 0.25s ease;
        }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }

        .modal-bar {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 18px; border-bottom: 1px solid var(--border);
          background: linear-gradient(180deg, var(--surface2) 0%, transparent 100%);
          flex-shrink: 0; flex-wrap: wrap;
        }

        .modal-back {
          display: flex; align-items: center; gap: 6px; padding: 7px 13px;
          border-radius: 8px; background: rgba(255,255,255,0.05);
          border: 1px solid var(--border); color: var(--text-2);
          font-size: 12px; font-weight: 600; cursor: pointer;
          font-family: var(--font); transition: all 0.15s; flex-shrink: 0;
        }
        .modal-back:hover { background: rgba(255,255,255,0.09); color: var(--text); }

        .modal-info { flex: 1; min-width: 100px; }
        .modal-name { font-size: 13px; font-weight: 700; color: var(--text); }
        .modal-path { font-family: var(--font-mono); font-size: 10px; color: var(--text-3); margin-top: 2px; }

        .modal-actions { display: flex; align-items: center; gap: 7px; flex-shrink: 0; flex-wrap: wrap; }

        .mdl-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: 8px; border: 1px solid;
          font-family: var(--font); font-size: 11.5px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .mdl-btn svg { width: 11px; height: 11px; stroke: currentColor; fill: none; stroke-width: 2.2; flex-shrink: 0; }
        .mdl-og { border-color: rgba(168,154,245,0.26); color: var(--violet-light); background: rgba(124,109,240,0.07); }
        .mdl-og:hover { background: rgba(124,109,240,0.15); border-color: rgba(168,154,245,0.5); }
        .mdl-tr { border-color: rgba(45,212,191,0.22); color: var(--teal); background: rgba(45,212,191,0.06); }
        .mdl-tr:hover { background: rgba(45,212,191,0.14); border-color: rgba(45,212,191,0.45); }

        .modal-switcher {
          display: flex; align-items: center;
          background: rgba(0,0,0,0.3); border: 1px solid var(--border);
          border-radius: 9px; padding: 3px; gap: 2px;
        }
        .sw-btn {
          padding: 5px 11px; border-radius: 6px; border: none;
          font-family: var(--font); font-size: 11px; font-weight: 600;
          cursor: pointer; transition: all 0.18s; color: var(--text-3); background: transparent;
        }
        .sw-btn.sw-og { background: rgba(124,109,240,0.18); color: var(--violet-light); border: 1px solid rgba(124,109,240,0.3); }
        .sw-btn.sw-tr { background: rgba(45,212,191,0.12); color: var(--teal); border: 1px solid rgba(45,212,191,0.25); }
        .sw-btn:hover:not(.sw-og):not(.sw-tr) { color: var(--text-2); background: rgba(255,255,255,0.04); }

        .modal-tr-bar {
          display: flex; align-items: center; gap: 9px;
          padding: 7px 18px; background: rgba(45,212,191,0.05);
          border-bottom: 1px solid rgba(45,212,191,0.1); flex-shrink: 0;
        }
        .tr-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--teal); box-shadow: 0 0 6px var(--teal);
          animation: dotPulse 1.8s ease-in-out infinite; flex-shrink: 0;
        }
        .tr-text { font-family: var(--font-mono); font-size: 10.5px; color: var(--teal); }

        .modal-viewport { flex: 1; overflow: hidden; }
        .modal-frame { width: 100%; height: 540px; border: none; display: block; background: white; }

        /* ─── Responsive ─────────────────────────────────────── */
        @media (max-width: 1100px) {
          .workspace { grid-template-columns: 1fr; }
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .insights-wrap { grid-template-columns: 1fr; }
          .insight-nav { flex-direction: row; flex-wrap: wrap; }
        }
        @media (max-width: 640px) {
          .shell { padding: 0 16px 60px; }
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .graphs-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="app">
        <div className="bg-noise" />
        <div className="bg-grid" />
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
        <div className="bg-orb orb-3" />

        <div className="shell">
          {/* ── Topbar ── */}
          <nav className="topbar">
            <div className="logo-area">
              <div className="logo-mark">
                <svg viewBox="0 0 24 24"><path d="M12 3l9 4.5L12 12 3 7.5 12 3z"/><path d="M3 12l9 4.5L21 12"/><path d="M3 16.5l9 4.5 9-4.5"/></svg>
              </div>
              <span className="logo-text">Verbo<em>AI</em></span>
              <div className="logo-divider" />
              <span className="logo-sub">Document Clustering Studio</span>
            </div>
            <div className="topbar-right">
              {ragReady && (
                <span className="badge badge-green">
                  <span className="badge-dot badge-dot-pulse" />RAG Active
                </span>
              )}
              <span className="badge badge-teal">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>
                  <path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
                </svg>
                Multi-lang · Auto-translate
              </span>
              <span className="badge badge-violet"><span className="badge-dot" />v2.0 FastAPI</span>
            </div>
          </nav>

          {/* ── Stats strip ── */}
          {clusters && (
            <div className="stats-row">
              <div className="stat-card c-violet">
                <div className="stat-label">Total Files</div>
                <div className="stat-value">{files.length}</div>
                <div className="stat-sub">uploaded this session</div>
              </div>
              <div className="stat-card c-violet">
                <div className="stat-label v">Clusters Found</div>
                <div className="stat-value v">{Object.keys(clusters).length}</div>
                <div className="stat-sub">semantic groups</div>
              </div>
              <div className="stat-card c-teal">
                <div className="stat-label">Avg Cluster Size</div>
                <div className="stat-value">{avgClusterSize}</div>
                <div className="stat-sub">files per group</div>
              </div>
              <div className="stat-card c-green">
                <div className="stat-label t">Auto-Translated</div>
                <div className="stat-value t">{Object.keys(translatedFiles).length}</div>
                <div className="stat-sub">non-English docs</div>
              </div>
            </div>
          )}

          {/* ── Workspace ── */}
          <div className="workspace">

            {/* ── LEFT ── */}
            <div>
              <div className="panel">
                <div className="panel-header">
                  <span className="step-chip">STEP 01</span>
                  <div>
                    <div className="panel-title">Upload Documents</div>
                    <div className="panel-sub">Drop files to begin intelligent clustering</div>
                  </div>
                </div>
                <div className="panel-body">
                  <label
                    className={`drop-zone${dragOver ? " active" : ""}`}
                    onClick={() => fileInputRef.current.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange({ target: { files: e.dataTransfer.files } }); }}
                  >
                    {files.length === 0 ? (
                      <>
                        <div className="drop-icon">
                          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        </div>
                        <p className="drop-headline">Drag & drop or click to browse</p>
                        <p className="drop-hint">PDFs, DOCX, TXT and more<br/>Marathi, Hindi &amp; more — auto-translated to English</p>
                      </>
                    ) : (
                      <div className="file-chips">
                        {fileThumbnails.map((thumb, i) => (
                          thumb
                            ? <div key={i} className="file-chip"><img src={thumb} alt="" /><span className="file-chip-name">{files[i].name}</span></div>
                            : <div key={i} className="file-chip"><IoDocumentTextOutline size={14} style={{ flexShrink: 0, opacity: 0.6, color: "var(--violet-light)" }} /><span className="file-chip-name">{files[i].name}</span></div>
                        ))}
                      </div>
                    )}
                  </label>

                  <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} />

                  <div className="actions">
                    <button className="btn-primary" onClick={handleUpload} disabled={loading}>
                      {loading ? "Processing…" : "Run Clustering Analysis"}
                    </button>
                    <button className="btn-ghost" onClick={handleRefresh}>
                      <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                      Reset
                    </button>
                  </div>

                  {loading && (
                    <div className="progress-wrap">
                      <div className="progress-track"><div className="progress-fill" /></div>
                      <div className="progress-status">
                        <div className="spinner" />
                        <span className="progress-text">Detecting · Translating · Embedding · Clustering · Indexing RAG…</span>
                      </div>
                    </div>
                  )}
                  {error && (
                    <div className="error-box"><div className="error-dot" />{error}</div>
                  )}
                </div>
              </div>

              {/* Cluster Results */}
              {showResults && clusters && (
                <div className="cluster-panel">
                  <div className="cluster-topbar">
                    <span className="cluster-topbar-title">Cluster Results</span>
                    <span className="chip chip-violet">{Object.keys(clusters).length} groups</span>
                    {Object.keys(translatedFiles).length > 0 && (
                      <span className="chip chip-teal">
                        <span className="chip-dot" />{Object.keys(translatedFiles).length} translated
                      </span>
                    )}
                  </div>
                  <div className="cluster-body">
                    {Object.entries(clusters).map(([clusterName, clusterFiles], index) => {
                      const col = clusterColors[index % clusterColors.length];
                      return (
                        <div key={index} className="cluster-card" style={{ background: col.bg, borderColor: col.border, animationDelay: `${index * 0.07}s` }}>
                          <div className="cluster-head">
                            <div className="cluster-dot-wrap" style={{ background: `${col.glow}18`, border: `1px solid ${col.glow}` }}>
                              <div className="cluster-dot" style={{ background: col.dot, boxShadow: `0 0 7px ${col.glow}` }} />
                            </div>
                            <span className="cluster-name" style={{ color: col.accent }}>{capitalizeFirstLetter(clusterName)}</span>
                            <span className="cluster-count">{clusterFiles.length} file{clusterFiles.length !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="file-list">
                            {clusterFiles.map((file, fi) => {
                              const langTag = getLangTag(file);
                              const hasTr = hasTranslation(file);
                              return (
                                <div key={fi} className="file-row" onClick={() => openFile(file)}>
                                  <IoDocumentTextOutline size={11} className="file-row-icon" />
                                  <span className="file-row-name">{file}</span>
                                  <div className="file-row-meta">
                                    {langTag && <span className="lang-pill">{langTag}</span>}
                                    <div className="dl-group">
                                      <button className="dl-btn dl-og" title="Download original" onClick={(e) => downloadOriginal(e, file)}>
                                        <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>OG
                                      </button>
                                      {hasTr && (
                                        <button className="dl-btn dl-tr" title="Download translated" onClick={(e) => downloadTranslated(e, file)}>
                                          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>EN
                                        </button>
                                      )}
                                    </div>
                                    <span className="file-arrow">→</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {intelligenceReport && (
                    <div className="report-bar">
                      <div className="report-bar-left">
                        <div className="report-icon">
                          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        </div>
                        <div>
                          <div className="report-label">Intelligence Report Ready</div>
                          <div className="report-sub">{Object.keys(clusters).length} clusters · {totalFiles} documents</div>
                        </div>
                      </div>
                      <button className="btn-report" onClick={downloadReport}>
                        <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export JSON
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── RIGHT ── */}
            <div>
              <div className="analysis-panel">
                <div className="analysis-head">
                  <span className="step-chip">STEP 02</span>
                  <div>
                    <div className="panel-title">Cluster Analysis</div>
                    <div className="panel-sub">Semantic embeddings · Optimal k via elbow &amp; silhouette</div>
                  </div>
                </div>
                <div className="analysis-body">
                  {/* Graphs */}
                  <div className="graphs-grid">
                    <div>
                      <div className="graph-label-row">
                        <span className="graph-method">Method A</span>
                        <span className="graph-title">Elbow Curve</span>
                      </div>
                      <div className="graph-box">
                        {elbowGraph
                          ? <img src={elbowGraph} alt="Elbow Method" />
                          : <div className="graph-empty"><div className="graph-empty-icon"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><span className="graph-empty-text">Awaiting analysis</span></div>}
                      </div>
                    </div>
                    <div>
                      <div className="graph-label-row">
                        <span className="graph-method">Method B</span>
                        <span className="graph-title">Silhouette</span>
                      </div>
                      <div className="graph-box">
                        {silhouetteGraph
                          ? <img src={silhouetteGraph} alt="Silhouette" />
                          : <div className="graph-empty"><div className="graph-empty-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><span className="graph-empty-text">Awaiting analysis</span></div>}
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  {clusters && (
                    <>
                      <div className="tabs">
                        <button className={`tab${activeTab === "clusters" ? " on" : ""}`} onClick={() => setActiveTab("clusters")}>
                          Clusters <span className="tab-count">{Object.keys(clusters).length}</span>
                        </button>
                        <button className={`tab${activeTab === "insights" ? " on" : ""}`} onClick={() => setActiveTab("insights")}>
                          Insights <span className="tab-count">{insightData.length}</span>
                        </button>
                        <button className={`tab${activeTab === "viz" ? " on" : ""}`} onClick={() => setActiveTab("viz")}>
                          2D Viz {vizData.length > 0 && <span className="tab-count">{vizData.length}</span>}
                        </button>
                        <button className={`tab${activeTab === "lang" ? " on" : ""}`} onClick={() => setActiveTab("lang")}>
                          Languages
                        </button>
                        <button className={`tab${activeTab === "chat" ? " on-green" : ""}`} onClick={() => setActiveTab("chat")}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                          Document Chat
                          {ragReady && <span className="tab-count" style={{ background: "rgba(34,211,160,0.12)", color: "var(--green)" }}>RAG</span>}
                        </button>
                      </div>

                      {/* ── Tab: Clusters ── */}
                      {activeTab === "clusters" && (
                        <div className="summary-cards">
                          {Object.entries(summaries).map(([name, summary], idx) => {
                            const col = clusterColors[idx % clusterColors.length];
                            const isExpanded = expandedSummaries[name];
                            return (
                              <div key={name} className="summary-card" style={{ background: col.bg, borderColor: col.border }}>
                                <div className="summary-card-head">
                                  <div className="summary-dot" style={{ background: col.dot, boxShadow: `0 0 6px ${col.glow}` }} />
                                  <span className="summary-card-name" style={{ color: col.accent }}>{capitalizeFirstLetter(name)}</span>
                                  {keywords[name] && keywords[name].slice(0, 3).map(k => (
                                    <span key={k} className="summary-kw">{k}</span>
                                  ))}
                                </div>
                                <div className={`summary-text${isExpanded ? " expanded" : ""}`}>{summary}</div>
                                {summary && summary.length > 160 && (
                                  <button className="expand-btn" onClick={() => setExpandedSummaries(p => ({ ...p, [name]: !p[name] }))}>
                                    {isExpanded ? "▲ less" : "▼ more"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Tab: Insights ── */}
                      {activeTab === "insights" && insightData.length > 0 && (
                        <div className="insights-wrap">
                          <div className="insight-nav">
                            {insightData.map((ins, idx) => {
                              const col = clusterColors[idx % clusterColors.length];
                              return (
                                <button key={ins.cluster_name}
                                  className={`insight-nav-btn${activeInsightCluster === ins.cluster_name ? " on" : ""}`}
                                  onClick={() => setActiveInsightCluster(ins.cluster_name)}>
                                  <div className="insight-nav-dot" style={{ background: col.dot }} />
                                  <span className="insight-nav-label">{capitalizeFirstLetter(ins.cluster_name)}</span>
                                </button>
                              );
                            })}
                          </div>
                          {activeInsight && (
                            <div className="insight-detail">
                              <div className="icard">
                                <div className="icard-label">Auto Summary</div>
                                <div className="icard-value">{activeInsight.summary || "—"}</div>
                              </div>
                              {sentiment[activeInsight.cluster_name] && (
                                <div className="icard">
                                  <div className="icard-label">Sentiment Analysis</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: getSentimentColor(sentiment[activeInsight.cluster_name]) }}>{getSentimentLabel(sentiment[activeInsight.cluster_name])}</span>
                                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>compound: {sentiment[activeInsight.cluster_name].compound}</span>
                                  </div>
                                  <div className="sent-bars">
                                    {[{ label: "Positive", key: "positive", color: "#22d3a0" }, { label: "Neutral", key: "neutral", color: "#94a3b8" }, { label: "Negative", key: "negative", color: "#f87171" }].map(s => (
                                      <div key={s.key} className="sent-row">
                                        <span className="sent-lbl">{s.label}</span>
                                        <div className="sent-track"><div className="sent-fill" style={{ width: `${sentiment[activeInsight.cluster_name][s.key]}%`, background: s.color }} /></div>
                                        <span className="sent-pct">{sentiment[activeInsight.cluster_name][s.key]}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {keywords[activeInsight.cluster_name] && (
                                <div className="icard">
                                  <div className="icard-label">Smart Tags · Top Keywords</div>
                                  <div className="kw-wrap">{keywords[activeInsight.cluster_name].map(k => <span key={k} className="kw-chip">{k}</span>)}</div>
                                </div>
                              )}
                              {representativeDocs[activeInsight.cluster_name] && (
                                <div className="icard">
                                  <div className="icard-label">Document Importance Ranking</div>
                                  <div className="rep-doc">
                                    <span style={{ fontSize: 14 }}>⭐</span>
                                    <span className="rep-doc-name">{representativeDocs[activeInsight.cluster_name].most_representative}</span>
                                    <span className="rep-doc-badge">Top Rep.</span>
                                  </div>
                                  <div className="ranked-list">
                                    {representativeDocs[activeInsight.cluster_name].ranked_documents?.map((doc, i) => (
                                      <div key={doc.filename} className="ranked-item">
                                        <span className="ranked-num">#{i + 1}</span>
                                        <span className="ranked-name">{doc.filename}</span>
                                        <span className="ranked-sim">{(doc.similarity * 100).toFixed(1)}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {langDistribution[activeInsight.cluster_name] && (
                                <div className="icard">
                                  <div className="icard-label">Language Distribution</div>
                                  <div className="lang-dist">
                                    {Object.entries(langDistribution[activeInsight.cluster_name]).map(([lang, count]) => (
                                      <div key={lang} className="lang-item">
                                        <span className="lang-code">{lang.toUpperCase()}</span>
                                        <span className="lang-count">{count} doc{count !== 1 ? "s" : ""}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Tab: 2D Viz ── */}
                      {activeTab === "viz" && (
                        <div className="viz-panel">
                          <div className="viz-header">
                            <div>
                              <div className="viz-title">Semantic Cluster Map</div>
                              <div className="viz-sub">PCA — 2D projection of Sentence-BERT embeddings</div>
                            </div>
                          </div>
                          {vizData.length > 0 ? (
                            <>
                              <canvas ref={canvasRef} className="viz-canvas" width={620} height={340} />
                              <div className="viz-legend">
                                {insightData.map((ins, idx) => {
                                  const colors = ["#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#ef4444", "#06b6d4"];
                                  return (
                                    <div key={ins.cluster_name} className="viz-legend-item">
                                      <div className="viz-legend-dot" style={{ background: colors[idx % colors.length] }} />
                                      {capitalizeFirstLetter(ins.cluster_name)}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div className="graph-empty" style={{ height: 200 }}>
                              <div className="graph-empty-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/></svg></div>
                              <span className="graph-empty-text">Run analysis to see visualization</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Tab: Languages ── */}
                      {activeTab === "lang" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {Object.keys(overallLangDist).length > 0 && (
                            <div className="icard">
                              <div className="icard-label">Overall Language Distribution</div>
                              {(() => {
                                const total = Object.values(overallLangDist).reduce((a, b) => a + b, 0);
                                return (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                                    {Object.entries(overallLangDist).sort((a, b) => b[1] - a[1]).map(([lang, count]) => (
                                      <div key={lang} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", fontWeight: 700, color: "var(--teal)", width: 32 }}>{lang.toUpperCase()}</span>
                                        <div className="lang-overall-bar"><div className="lang-overall-fill" style={{ width: `${(count / total) * 100}%` }} /></div>
                                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", color: "var(--text-3)", width: 24, textAlign: "right" }}>{count}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          {Object.entries(langDistribution).map(([clusterName, dist], idx) => {
                            const col = clusterColors[idx % clusterColors.length];
                            const total = Object.values(dist).reduce((a, b) => a + b, 0);
                            return (
                              <div key={clusterName} className="icard" style={{ borderColor: col.border }}>
                                <div className="icard-label" style={{ color: col.accent }}>{capitalizeFirstLetter(clusterName)}</div>
                                <div className="lang-dist">
                                  {Object.entries(dist).map(([lang, count]) => (
                                    <div key={lang} className="lang-item">
                                      <span className="lang-code">{lang.toUpperCase()}</span>
                                      <span className="lang-count">{count} · {Math.round(count / total * 100)}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Tab: Document Chat (RAG) ── */}
                      {activeTab === "chat" && (
                        <div className="rag-wrap">
                          <div className="rag-header">
                            <div className="rag-head-icon">
                              <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                            </div>
                            <div className="rag-head-info">
                              <div className="rag-head-title">Document Chat</div>
                              <div className="rag-head-sub">
                                {ragReady ? "RAG index ready — ask anything about your documents" : "Upload and process documents to enable chat"}
                              </div>
                            </div>
                            <div className={`rag-status ${ragReady ? "ready" : "offline"}`} />
                          </div>

                          {ragReady && clusters && (
                            <div className="rag-controls">
                              <span className="rag-ctrl-label">Scope</span>
                              <select className="rag-select" value={chatClusterFilter} onChange={e => setChatClusterFilter(e.target.value)}>
                                <option value="">All clusters</option>
                                {Object.keys(clusters).map(name => (
                                  <option key={name} value={name}>{capitalizeFirstLetter(name)}</option>
                                ))}
                              </select>
                              <div className="rag-topk-wrap">
                                <span className="rag-ctrl-label">Top-K</span>
                                <button className="rag-topk-btn" onClick={() => setChatTopK(k => Math.max(1, k - 1))}>−</button>
                                <span className="rag-topk-val">{chatTopK}</span>
                                <button className="rag-topk-btn" onClick={() => setChatTopK(k => Math.min(12, k + 1))}>+</button>
                              </div>
                            </div>
                          )}

                          {ragReady ? (
                            <div className="rag-messages">
                              {chatMessages.length === 0 ? (
                                <div className="rag-empty">
                                  <div className="rag-empty-icon">
                                    <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                                  </div>
                                  <div className="rag-empty-title">Ask your documents</div>
                                  <div className="rag-empty-sub">Queries answered using your uploaded files as context via semantic retrieval + Claude.</div>
                                  <div className="rag-prompts">
                                    {[
                                      "What are the key risks discussed?",
                                      "Summarize the main themes across all files",
                                      "What conclusions are drawn in these documents?",
                                      "Compare the sentiment across clusters",
                                    ].map(p => (
                                      <button key={p} className="rag-prompt" onClick={() => { setChatInput(p); chatInputRef.current?.focus(); }}>
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {chatMessages.map((msg, i) => (
                                    <div key={i} className={`rag-msg ${msg.role}`}>
                                      <div className={`rag-avatar ${msg.role === "assistant" ? "ai" : "usr"}`}>
                                        {msg.role === "assistant" ? "AI" : "U"}
                                      </div>
                                      <div className="rag-bubble-wrap">
                                        <div className={`rag-bubble ${msg.role === "assistant" ? `ai${msg.isWelcome ? " welcome" : ""}` : "usr"}`}>
                                          {renderMsgContent(msg.content)}
                                        </div>
                                        {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                                          <>
                                            <button className={`rag-sources-toggle${expandedSources[i] ? " open" : ""}`} onClick={() => setExpandedSources(p => ({ ...p, [i]: !p[i] }))}>
                                              <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                                              {expandedSources[i] ? "Hide" : "Show"} {msg.sources.length} source{msg.sources.length !== 1 ? "s" : ""}
                                              {msg.cluster_scope && <span style={{ opacity: 0.6 }}> · {capitalizeFirstLetter(msg.cluster_scope)}</span>}
                                            </button>
                                            {expandedSources[i] && (
                                              <div className="rag-sources">
                                                {msg.sources.map((src, si) => (
                                                  <div key={si} className="rag-source">
                                                    <span className="rag-source-rank">#{si + 1}</span>
                                                    <div className="rag-source-body">
                                                      <div className="rag-source-file">{src.filename}</div>
                                                      <div className="rag-source-cluster">{capitalizeFirstLetter(src.cluster_name)} · {src.language?.toUpperCase()}</div>
                                                      <div className="rag-source-excerpt">{src.excerpt}</div>
                                                    </div>
                                                    <span className="rag-source-sim">{(src.similarity * 100).toFixed(0)}%</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  {chatLoading && (
                                    <div className="rag-msg">
                                      <div className="rag-avatar ai">AI</div>
                                      <div className="rag-typing"><span /><span /><span /></div>
                                    </div>
                                  )}
                                  <div ref={chatEndRef} />
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="rag-offline">
                              <div className="rag-empty-icon" style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                              </div>
                              <div className="rag-offline-title">RAG Index Not Ready</div>
                              <div className="rag-offline-sub">Upload and run clustering analysis first.<br />The RAG index is built automatically after processing.</div>
                            </div>
                          )}

                          {chatError && <div className="rag-error"><div className="error-dot" />{chatError}</div>}

                          {ragReady && (
                            <div className="rag-input-area">
                              <div className="rag-input-row">
                                <textarea
                                  ref={chatInputRef}
                                  className="rag-textarea"
                                  rows={1}
                                  placeholder="Ask anything about your documents…"
                                  value={chatInput}
                                  onChange={e => setChatInput(e.target.value)}
                                  onKeyDown={handleChatKeyDown}
                                  disabled={chatLoading}
                                />
                                <button className="rag-send" onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()} title="Send (Enter)">
                                  {chatLoading
                                    ? <div className="spinner" style={{ borderTopColor: "var(--green)", borderColor: "rgba(34,211,160,0.2)" }} />
                                    : <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                  }
                                </button>
                              </div>
                              <div className="rag-hint">Enter to send · Shift+Enter for newline · Sources shown below each answer</div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal ── */}
        {modalFile && (
          <div className="modal-backdrop">
            <div className="modal">
              <div className="modal-bar">
                <button className="modal-back" onClick={closeModal}><MdArrowBack size={13} /> Back</button>
                <div className="modal-info">
                  <div className="modal-name">Document Preview</div>
                  <div className="modal-path">{activeFileName}{activeFileName && getLangTag(activeFileName) ? ` · ${getLangTag(activeFileName)}` : ""}</div>
                </div>
                <div className="modal-actions">
                  {activeFileName && (
                    <button className="mdl-btn mdl-og" onClick={(e) => downloadOriginal(e, activeFileName)}>
                      <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Original
                    </button>
                  )}
                  {activeFileName && hasTranslation(activeFileName) && (
                    <button className="mdl-btn mdl-tr" onClick={(e) => downloadTranslated(e, activeFileName)}>
                      <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Translated
                    </button>
                  )}
                  {activeFileName && hasTranslation(activeFileName) && (
                    <div className="modal-switcher">
                      <button className={`sw-btn${!viewingTranslated ? " sw-og" : ""}`} onClick={switchToOriginal}>Original</button>
                      <button className={`sw-btn${viewingTranslated ? " sw-tr" : ""}`} onClick={switchToTranslated}>Translated</button>
                    </div>
                  )}
                </div>
              </div>
              {viewingTranslated && (
                <div className="modal-tr-bar">
                  <div className="tr-dot" />
                  <span className="tr-text">Viewing translated version · Google Translate → English{activeFileName && getLangTag(activeFileName) ? ` · ${getLangTag(activeFileName)}` : ""}</span>
                </div>
              )}
              <div className="modal-viewport">
                <iframe src={modalFile} className="modal-frame" title="File Content" />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}