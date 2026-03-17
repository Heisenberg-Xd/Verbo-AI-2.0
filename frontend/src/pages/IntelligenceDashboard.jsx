import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";

const BASE = "http://127.0.0.1:8000";

const safeGet = async (url, opts) => {
  try { return await axios.get(url, opts); }
  catch (e) {
    if (e.code === "ERR_NETWORK" || e.message === "Network Error") {
      const ce = new Error(`CORS_OR_SERVER: The backend returned an error and the CORS header was stripped. Check the backend console for the real error on ${url}`);
      ce.isCorsError = true; ce.url = url; throw ce;
    }
    throw e;
  }
};
const safePost = async (url, data, opts) => {
  try { return await axios.post(url, data, opts); }
  catch (e) {
    if (e.code === "ERR_NETWORK" || e.message === "Network Error") {
      const ce = new Error(`CORS_OR_SERVER: The backend returned an error and the CORS header was stripped. Check the backend console for the real error on ${url}`);
      ce.isCorsError = true; ce.url = url; throw ce;
    }
    throw e;
  }
};

const parseCorsError = (e, fallback) => {
  if (e?.isCorsError) return `Backend error on ${e.url} â€” CORS header stripped from error response. Open the FastAPI terminal and check the traceback.`;
  return e?.response?.data?.detail || e?.message || fallback;
};

// â”€â”€â”€ Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none", sw = 1.8, viewBox = "0 0 24 24", extra = "" }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} className={extra}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

// â”€â”€â”€ Colour palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const PALETTE = [
  { bg: "rgba(255,179,0,0.08)", border: "rgba(255,179,0,0.22)", accent: "#ffb300", dot: "#ff8c00", glow: "rgba(255,140,0,0.5)" },
  { bg: "rgba(255,94,58,0.07)",  border: "rgba(255,94,58,0.2)",   accent: "#ff5e3a", dot: "#e64a19", glow: "rgba(255,94,58,0.5)"  },
  { bg: "rgba(251,191,36,0.07)", border: "rgba(251,191,36,0.2)",  accent: "#fbbf24", dot: "#d97706", glow: "rgba(245,158,11,0.5)" },
  { bg: "rgba(255,140,0,0.07)",  border: "rgba(255,140,0,0.2)",   accent: "#ff8c00", dot: "#f57c00", glow: "rgba(255,140,0,0.5)" },
  { bg: "rgba(255,215,0,0.07)",  border: "rgba(255,215,0,0.2)",   accent: "#ffd700", dot: "#ffa000", glow: "rgba(255,215,0,0.5)" },
  { bg: "rgba(255,69,0,0.07)",   border: "rgba(255,69,0,0.2)",    accent: "#ff4500", dot: "#bf360c", glow: "rgba(255,69,0,0.5)"  },
  { bg: "rgba(255,165,0,0.07)",  border: "rgba(255,165,0,0.2)",   accent: "#ffa500", dot: "#ef6c00", glow: "rgba(255,165,0,0.5)" },
];
const VIZ_COLORS = ["#ffb300","#ff8c00","#ff5e3a","#fbbf24","#ffd700","#ff4500","#ffa500"];

export const KG_COLORS = {
  PERSON: { fill: "#ffb300", border: "#ffcd38", glow: "rgba(255,179,0,0.4)"  },
  ORG:    { fill: "#ff8c00", border: "#ffa733", glow: "rgba(255,140,0,0.4)"  },
  LOC:    { fill: "#ff5e3a", border: "#ff866a", glow: "rgba(255,94,58,0.4)"  },
  DATE:   { fill: "#fbbf24", border: "#fcd34d", glow: "rgba(251,191,36,0.4)" },
  TECH:   { fill: "#ffd700", border: "#ffeb3b", glow: "rgba(255,215,0,0.4)" },
  OTHER:  { fill: "#64748b", border: "#94a3b8", glow: "rgba(100,116,139,0.3)" },
};

export const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
const sentColor  = s => !s ? "#64748b" : s.compound >= 0.05 ? "#34d399" : s.compound <= -0.05 ? "#f87171" : "#94a3b8";
const sentLabel  = s => !s ? "Unknown"  : s.compound >= 0.05 ? "Positive" : s.compound <= -0.05 ? "Negative" : "Neutral";

import KnowledgeGraph from "../modules/graph/KnowledgeGraph";

// â”€â”€â”€ Knowledge Graph Canvas Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ Knowledge Graph component integrated from modules/graph/KnowledgeGraph â”€â”€â”€â”€â”€â”€â”€â”€

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function IntelligenceDashboard() {
  // â”€â”€ Core state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [files,             setFiles]             = useState([]);
  const [fileThumbs,        setFileThumbs]         = useState([]);
  const [dragOver,          setDragOver]           = useState(false);
  const [loading,           setLoading]            = useState(false);
  const [error,             setError]              = useState(null);

  // â”€â”€ Results â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [clusters,          setClusters]           = useState(null);
  const [elbowGraph,        setElbowGraph]         = useState("");
  const [silhouetteGraph,   setSilhouetteGraph]    = useState("");
  const [summaries,         setSummaries]          = useState({});
  const [sentiment,         setSentiment]          = useState({});
  const [keywords,          setKeywords]           = useState({});
  const [repDocs,           setRepDocs]            = useState({});
  const [insightData,       setInsightData]        = useState([]);
  const [vizData,           setVizData]            = useState([]);
  const [langDist,          setLangDist]           = useState({});
  const [overallLang,       setOverallLang]        = useState({});
  const [translatedFiles,   setTranslatedFiles]    = useState({});
  const [fileLangs,         setFileLangs]          = useState({});
  const [intelligenceRep,   setIntelligenceRep]    = useState(null);
  const [ragReady,          setRagReady]           = useState(false);
  const [workspaceId,       setWorkspaceId]        = useState("");

  // â”€â”€ Intelligence / Entity state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [entities,          setEntities]           = useState(null);
  const [relationships,     setRelationships]      = useState(null);
  const [knowledgeGraph,    setKnowledgeGraph]     = useState(null);
  const [entityLoading,     setEntityLoading]      = useState(false);

  // â”€â”€ UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [activeTab,         setActiveTab]          = useState("clusters");
  const [activeCluster,     setActiveCluster]      = useState(null);
  const [expandedSummaries, setExpandedSummaries]  = useState({});
  const [modalFile,         setModalFile]          = useState(null);
  const [activeFileName,    setActiveFileName]     = useState(null);
  const [viewingTranslated, setViewingTranslated]  = useState(false);
  const [showClusters,      setShowClusters]       = useState(true);
  const [sidebarTab,        setSidebarTab]         = useState("files");

  // â”€â”€ RAG chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [chatMessages,      setChatMessages]       = useState([]);
  const [chatInput,         setChatInput]          = useState("");
  const [chatLoading,       setChatLoading]        = useState(false);
  const [chatError,         setChatError]          = useState(null);
  const [chatFilter,        setChatFilter]         = useState("");
  const [chatTopK,          setChatTopK]           = useState(6);
  const [expandedSources,   setExpandedSources]    = useState({});

  // â”€â”€ Google Drive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [driveUrl,          setDriveUrl]           = useState("");
  const [driveLoading,      setDriveLoading]       = useState(false);
  const [driveResult,       setDriveResult]        = useState(null);

  const fileInputRef = useRef(null);

  // â”€â”€â”€ File handling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleFileChange = e => {
    const sel = Array.from(e.target.files);
    setFiles(sel);
    setError(null);
    setFileThumbs(sel.map(f => f.type.startsWith("image/") ? URL.createObjectURL(f) : null));
  };

  // â”€â”€â”€ Upload + Process â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleUpload = async () => {
    if (!files.length) { setError("Select at least one file."); return; }
    setLoading(true); setError(null);
    const fd = new FormData();
    files.forEach(f => fd.append("files", f));
    try {
      const wsId    = await ensureWorkspace();
      const upRes   = await axios.post(`${BASE}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      const filePaths = upRes.data.file_paths;
      const pr      = await safePost(`${BASE}/process`, { file_paths: filePaths, workspace_id: wsId });
      const d       = pr.data;
      setClusters(d.clusters);
      setElbowGraph(d.elbow_graph ? `${BASE}${d.elbow_graph}` : "");
      setSilhouetteGraph(d.silhouette_graph ? `${BASE}${d.silhouette_graph}` : "");
      setSummaries(d.summaries || {});
      setSentiment(d.sentiment || {});
      setKeywords(d.keywords || {});
      setRepDocs(d.representative_docs || {});
      setInsightData(d.insight_data || []);
      setVizData(d.cluster_visualization_data || []);
      setLangDist(d.language_distribution || {});
      setOverallLang(d.overall_language_distribution || {});
      setTranslatedFiles(d.translated_files || {});
      setFileLangs(d.file_languages || {});
      setIntelligenceRep(d.intelligence_report || null);
      setRagReady(d.rag_ready || false);
      if (d.insight_data?.length) setActiveCluster(d.insight_data[0].cluster_name);
      if (d.rag_ready) {
        setChatMessages([{
          role: "assistant", isWelcome: true, sources: [],
          content: `Knowledge base indexed â€” **${d.rag_chunks_indexed ?? "?"}** chunks across **${Object.keys(d.clusters || {}).length}** clusters. Ask me anything about your documents.`,
        }]);
      }
    } catch (e) {
      setError("Processing failed. Check backend is running on port 8000.");
      console.error(e);
    } finally { setLoading(false); }
  };

  // â”€â”€â”€ Workspace â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const ensureWorkspace = async () => {
    if (workspaceId.trim()) return workspaceId.trim();
    const name = `session-${Date.now()}`;
    try {
      const res  = await safePost(`${BASE}/workspace/create`, { name, description: "Auto-created from VerboAI frontend" });
      const newId = res.data.workspace?.workspace_id || name;
      setWorkspaceId(newId);
      return newId;
    } catch {
      setWorkspaceId(name);
      return name;
    }
  };

  // â”€â”€â”€ Entity extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const runEntityExtraction = async () => {
    if (!clusters) return;
    setEntityLoading(true); setEntities(null);
    try {
      const wsId = await ensureWorkspace();
      await safePost(`${BASE}/workspace/${wsId}/entities/refresh`);
      const full = await safeGet(`${BASE}/workspace/${wsId}/entities`);
      setEntities(full.data);
    } catch (e) {
      const detail = e?.response?.data?.detail || e.message || "";
      const hint   = e?.isCorsError ? parseCorsError(e) :
        detail.includes("No documents") || detail.includes("no documents")
          ? "No documents found in workspace. Set a Workspace ID BEFORE clicking 'Run Intelligence Pipeline', then re-upload."
          : detail || "Entity extraction failed.";
      setEntities({ error: hint });
    } finally { setEntityLoading(false); }
  };

  const runRelationshipExtraction = async () => {
    if (!clusters) return;
    setEntityLoading(true); setRelationships(null);
    try {
      const wsId = await ensureWorkspace();
      await safePost(`${BASE}/workspace/${wsId}/entities/refresh`);
      const res  = await safeGet(`${BASE}/workspace/${wsId}/relationships`);
      setRelationships(res.data);
    } catch (e) {
      const detail = e?.response?.data?.detail || e.message || "";
      const hint   = e?.isCorsError ? parseCorsError(e) :
        detail.includes("No documents") ? "No documents found. Re-upload with workspace ID set." : detail || "Relationship extraction failed.";
      setRelationships({ error: hint });
    } finally { setEntityLoading(false); }
  };

  const buildKnowledgeGraph = async () => {
    if (!clusters) return;
    setEntityLoading(true); setKnowledgeGraph(null);
    try {
      const wsId = await ensureWorkspace();
      await safePost(`${BASE}/workspace/${wsId}/entities/refresh`);
      const res  = await safeGet(`${BASE}/workspace/${wsId}/knowledge-graph`);
      setKnowledgeGraph(res.data);
      // Also refresh entities + relationships for the graph canvas
      const entFull = await safeGet(`${BASE}/workspace/${wsId}/entities`);
      setEntities(entFull.data);
      try {
        const relFull = await safeGet(`${BASE}/workspace/${wsId}/relationships`);
        setRelationships(relFull.data);
      } catch {}
    } catch (e) {
      const detail = e?.response?.data?.detail || e.message || "";
      const hint   = e?.isCorsError ? parseCorsError(e) :
        detail.includes("No documents") ? "No documents in workspace. Re-upload with Workspace ID set first." : detail || "Knowledge graph build failed.";
      setKnowledgeGraph({ error: hint });
    } finally { setEntityLoading(false); }
  };

  // â”€â”€â”€ Google Drive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const ingestDrive = async () => {
    const folderId = driveUrl.trim();
    if (!folderId) return;
    const match      = folderId.match(/folders\/([a-zA-Z0-9_-]+)/);
    const resolvedId = match ? match[1] : folderId;
    setDriveLoading(true); setDriveResult(null);
    try {
      const wsId = await ensureWorkspace();
      const res  = await safePost(`${BASE}/workspace/${wsId}/connect-drive`, { folder_id: resolvedId, process_immediately: true });
      setDriveResult(res.data);
    } catch (e) {
      setDriveResult({ error: e?.response?.data?.detail || "Drive ingestion failed. Check that drive_ingestion.py credentials are configured." });
    } finally { setDriveLoading(false); }
  };

  // â”€â”€â”€ RAG Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput(""); setChatError(null);
    setChatMessages(p => [...p, { role: "user", content: q }]);
    setChatLoading(true);
    try {
      const res = await safePost(`${BASE}/rag/chat`, { query: q, cluster_filter: chatFilter || null, top_k: chatTopK });
      const d   = res.data;
      const src = d.sources || [];
      let ans   = d.answer || "";
      const isFallback = ans.startsWith("[RAG") || ans.includes("LLM offline") || ans.startsWith("__no_llm__") || !ans.trim();
      if (isFallback && src.length) {
        const gr = await safePost(`${BASE}/rag/generate`, { query: q, chunks: src });
        ans = gr.data.answer || ans;
      }
      if (ans.startsWith("__no_llm__") || ans.includes("ANTHROPIC_API_KEY") || ans.includes("GEMINI_API_KEY")) {
        ans = "âš ï¸ LLM API key not detected. Check your `.env` file and restart the backend.";
      }
      setChatMessages(p => [...p, { role: "assistant", content: ans, sources: src, cluster_scope: d.cluster_scope }]);
    } catch {
      setChatError("Chat request failed â€” check the backend console.");
    } finally { setChatLoading(false); }
  };

  // â”€â”€â”€ 2D Viz canvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!vizData.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const xs = vizData.map(d => d.x), ys = vizData.map(d => d.y);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const pad  = 44;
    const toX  = v => pad + ((v - xMin) / (xMax - xMin || 1)) * (W - 2 * pad);
    const toY  = v => H - pad - ((v - yMin) / (yMax - yMin || 1)) * (H - 2 * pad);
    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const x = pad + (i / 6) * (W - 2 * pad), y = pad + (i / 6) * (H - 2 * pad);
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, H - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    }
    const groups = {};
    vizData.forEach(d => { (groups[d.cluster_id] = groups[d.cluster_id] || []).push(d); });
    Object.entries(groups).forEach(([cid, pts]) => {
      const col = VIZ_COLORS[parseInt(cid) % VIZ_COLORS.length];
      const cx  = pts.reduce((s, p) => s + toX(p.x), 0) / pts.length;
      const cy  = pts.reduce((s, p) => s + toY(p.y), 0) / pts.length;
      const r   = Math.max(...pts.map(p => Math.hypot(toX(p.x) - cx, toY(p.y) - cy))) + 18;
      const g   = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, col + "1e"); g.addColorStop(1, col + "00");
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
    });
    vizData.forEach(d => {
      const x = toX(d.x), y = toY(d.y);
      const col = VIZ_COLORS[d.cluster_id % VIZ_COLORS.length];
      ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = col + "cc"; ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "8px 'JetBrains Mono', monospace";
      const lbl = d.filename.length > 14 ? d.filename.slice(0, 13) + "â€¦" : d.filename;
      ctx.fillText(lbl, x + 8, y + 3);
    });
  }, [vizData]);

  // â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getLangTag  = fn => fileLangs[fn] ? `${fileLangs[fn].source?.toUpperCase()}â†’EN` : translatedFiles[fn] ? "â†’EN" : null;
  const hasTrans    = fn => !!translatedFiles[fn];
  const totalFiles  = clusters ? Object.values(clusters).flat().length : 0;
  const clusterCount = clusters ? Object.keys(clusters).length : 0;
  const openFile    = fn => { setActiveFileName(fn); setViewingTranslated(false); setModalFile(`${BASE}/files/${fn}`); setShowClusters(false); };
  const closeModal  = () => { setModalFile(null); setActiveFileName(null); setViewingTranslated(false); setShowClusters(true); };
  const dlOrig      = (e, fn) => { e.stopPropagation(); const a = document.createElement("a"); a.href = `${BASE}/files/${fn}`; a.download = fn; a.click(); };
  const dlTrans     = (e, fn) => { e.stopPropagation(); if (!translatedFiles[fn]) return; const a = document.createElement("a"); a.href = `${BASE}/translated/${translatedFiles[fn]}`; a.download = translatedFiles[fn]; a.click(); };
  const dlReport    = () => { const a = document.createElement("a"); a.href = `${BASE}/report`; a.download = "intelligence_report.json"; a.click(); };
  const renderMsg   = txt => txt.split(/\*\*(.*?)\*\*/g).map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p);
  const activeInsight = insightData.find(i => i.cluster_name === activeCluster);

  // Parsed entity list for KG canvas
  const entityList = (() => {
    if (!entities || entities.error) return [];
    return entities.entities || (Array.isArray(entities) ? entities : []);
  })();
  const relationshipList = (() => {
    if (!relationships || relationships.error) return [];
    return relationships.relationships || (Array.isArray(relationships) ? relationships : []);
  })();

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RENDER
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0b0b0f; --bg1: #121217; --bg2: #181820; --bg3: #1a1a24; --bg4: #22222e;
          --line: rgba(255,140,0,0.12); --line2: rgba(255,140,0,0.2); --line3: rgba(255,140,0,0.3);
          --tx: #ffffff; --tx2: rgba(255,255,255,0.65); --tx3: rgba(255,255,255,0.4);
          --amber-grad: linear-gradient(90deg, #ffb300, #ff8c00, #ff5e3a);
          --violet: #ffb300; --vl: #ffcd38; --vg: rgba(255,179,0,0.4);
          --teal: #fbbf24; --green: #ff8c00; --amber: #ffb300; --rose: #ff5e3a;
          --font: 'Outfit', sans-serif; --mono: 'JetBrains Mono', monospace; --display: 'Fraunces', serif;
          --r1:6px; --r2:10px; --r3:16px; --r4:22px; --r5:28px;
        }
        html, body { background: var(--bg); color: var(--tx); font-family: var(--font); line-height: 1.5; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,140,0,0.15); border-radius:3px; }
        .root { min-height:100vh; position:relative; overflow-x:hidden; transition: all 0.25s ease; }
        .noise { position:fixed; inset:0; z-index:0; pointer-events:none; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.028'/%3E%3C/svg%3E"); background-size:220px; opacity:0.35; }
        .grid-bg { position:fixed; inset:0; z-index:0; pointer-events:none; background-image:radial-gradient(circle at 20% 20%, rgba(255,140,0,0.08), transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,180,0,0.05), transparent 35%); background-size:100% 100%; border: none; }
        .orb { position:fixed; border-radius:50%; filter:blur(130px); pointer-events:none; z-index:0; }
        .o1 { width:700px; height:700px; top:-220px; left:-140px; background:radial-gradient(circle,rgba(255,140,0,0.15) 0%,transparent 70%); }
        .o2 { width:500px; height:500px; bottom:-130px; right:-90px; background:radial-gradient(circle,rgba(255,180,0,0.08) 0%,transparent 70%); }
        .shell { position:relative; z-index:1; max-width:1600px; margin:0 auto; padding:0 32px 80px; }
        .topbar { display:flex; align-items:center; justify-content:space-between; padding:22px 0 18px; border-bottom:1px solid var(--line); margin-bottom:36px; }
        .logo { display:flex; align-items:center; gap:13px; text-decoration:none; }
        .logo-mark { width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#ffb300 0%,#ff5e3a 100%); display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 1px rgba(255,179,0,0.25),0 10px 28px rgba(255,140,0,0.35); position:relative; overflow:hidden; }
        .logo-mark::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,0.18) 0%,transparent 55%); }
        .logo-title { font-family:var(--display); font-size:22px; font-weight:700; letter-spacing:-0.5px; }
        .logo-title em { font-style:italic; background: var(--amber-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .logo-sep { width:1px; height:20px; background:var(--line2); }
        .logo-sub { font-family:var(--mono); font-size:10px; color:var(--tx3); letter-spacing:0.3px; }
        .topbar-right { display:flex; align-items:center; gap:8px; }
        .pill { display:inline-flex; align-items:center; gap:5px; padding:5px 12px; border-radius:100px; font-family:var(--mono); font-size:9.5px; font-weight:600; border:1px solid; letter-spacing:0.2px; transition: all 0.25s ease; }
        .pill-v  { background:rgba(255,140,0,0.08); border-color:rgba(255,140,0,0.35); color:#ffb300; }
        .pill-t  { background:rgba(255,140,0,0.08); border-color:rgba(255,140,0,0.35); color:#fbbf24; }
        .pill-g  { background:rgba(255,140,0,0.08); border-color:rgba(255,140,0,0.35); color:#ff8c00; }
        .pill-a  { background:rgba(255,140,0,0.08); border-color:rgba(255,140,0,0.35); color:#ffb300; }
        .pdot { width:5px; height:5px; border-radius:50%; background:currentColor; }
        .pdot-pulse { animation:dotPulse 2s ease-in-out infinite; }
        @keyframes dotPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .stats { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:22px; animation:upIn 0.4s ease both; }
        @keyframes upIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .scard { background:rgba(18,18,23,0.85); backdrop-filter:blur(10px); border:1px solid var(--line); border-radius:var(--r3); padding:16px 20px; position:relative; overflow:hidden; transition:all 0.25s ease; box-shadow:0 0 20px rgba(255,140,0,0.05); }
        .scard::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--c,rgba(255,140,0,0.4)),transparent); }
        .scard:hover { border-color:rgba(255,140,0,0.3); transform:translateY(-2px); box-shadow:0 6px 20px rgba(255,140,0,0.12); }
        .sc-v { --c:rgba(255,179,0,0.45); } .sc-t { --c:rgba(251,191,36,0.45); } .sc-g { --c:rgba(255,140,0,0.45); } .sc-a { --c:rgba(255,179,0,0.45); } .sc-r { --c:rgba(255,94,58,0.45); }
        .slbl { font-family:var(--mono); font-size:8.5px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--tx3); margin-bottom:6px; }
        .sval { font-family:var(--display); font-size:38px; font-weight:700; line-height:1; letter-spacing:-2px; background: var(--amber-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .ssub { font-size:11px; color:var(--tx3); margin-top:3px; font-weight:500; }
        .workspace { display:grid; grid-template-columns:400px 1fr; gap:18px; align-items:start; }
        .panel { background:rgba(18,18,23,0.85); backdrop-filter:blur(10px); border:1px solid var(--line); border-radius:var(--r4); overflow:hidden; transition:all 0.25s ease; box-shadow:0 0 20px rgba(255,140,0,0.05); }
        .panel:hover { border-color:rgba(255,140,0,0.3); }
        .ph { padding:20px 22px; border-bottom:1px solid var(--line); background:linear-gradient(180deg,var(--bg3) 0%,transparent 100%); display:flex; align-items:flex-start; gap:12px; }
        .ph-step { font-family:var(--mono); font-size:8.5px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; padding:3px 8px; border-radius:5px; background:rgba(255,140,0,0.1); border:1px solid rgba(255,140,0,0.2); color:rgba(255,179,0,0.65); flex-shrink:0; margin-top:2px; }
        .ph-title { font-family:var(--display); font-size:16px; font-weight:700; color:var(--tx); letter-spacing:-0.3px; }
        .ph-sub { font-size:12px; color:var(--tx2); margin-top:2px; }
        .pb { padding:18px 22px 22px; }
        .stabs { display:flex; gap:2px; margin-bottom:14px; background:var(--bg1); border:1px solid var(--line); border-radius:8px; padding:3px; }
        .stab { flex:1; padding:6px; border-radius:6px; border:none; font-family:var(--font); font-size:11.5px; font-weight:600; cursor:pointer; transition:all 0.15s; color:var(--tx3); background:transparent; text-align:center; }
        .stab:hover { color:var(--tx2); background:rgba(255,255,255,0.04); }
        .stab.on { background:rgba(124,58,237,0.14); color:var(--vl); border:1px solid rgba(124,58,237,0.22); }
        .dropzone { border:1.5px dashed rgba(255,255,255,0.08); border-radius:var(--r3); padding:32px 16px; text-align:center; cursor:pointer; transition:all 0.25s; background:rgba(255,255,255,0.01); position:relative; overflow:hidden; }
        .dropzone::after { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 65% 55% at 50% 0%,rgba(124,58,237,0.08) 0%,transparent 70%); opacity:0; transition:opacity 0.3s; }
        .dropzone:hover::after, .dropzone.dv::after { opacity:1; }
        .dropzone:hover, .dropzone.dv { border-color:rgba(124,58,237,0.42); background:rgba(124,58,237,0.03); }
        .drop-ico { width:50px; height:50px; border-radius:13px; margin:0 auto 14px; background:rgba(124,58,237,0.1); border:1px solid rgba(124,58,237,0.2); display:flex; align-items:center; justify-content:center; transition:all 0.3s; }
        .dropzone:hover .drop-ico { background:rgba(255,140,0,0.18); border-color:rgba(255,140,0,0.4); transform:scale(1.06); box-shadow:0 0 30px rgba(255,140,0,0.3); }
        .drop-hl { font-size:13.5px; font-weight:600; color:var(--tx2); }
        .drop-hint { font-family:var(--mono); font-size:10px; color:var(--tx3); margin-top:5px; line-height:1.9; }
        .filechips { display:flex; flex-wrap:wrap; gap:7px; justify-content:center; }
        .fchip { display:flex; align-items:center; gap:6px; background:rgba(255,140,0,0.1); border:1px solid rgba(255,140,0,0.2); border-radius:7px; padding:5px 9px; max-width:150px; }
        .fchip-name { font-family:var(--mono); font-size:10px; color:#ffb300; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .winput-wrap { margin-bottom:12px; }
        .winput-label { font-family:var(--mono); font-size:9px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--tx3); margin-bottom:5px; display:flex; align-items:center; gap:6px; }
        .winput { width:100%; background:rgba(255,255,255,0.03); border:1px solid var(--line); border-radius:8px; padding:8px 12px; color:var(--tx2); font-family:var(--mono); font-size:11px; outline:none; transition:border-color 0.15s; }
        .winput:focus { border-color:rgba(255,140,0,0.4); box-shadow:0 0 0 2px rgba(255,140,0,0.1); }
        .winput::placeholder { color:var(--tx3); }
        .actions { display:flex; gap:8px; margin-top:12px; }
        .btn-primary { flex:1; padding:12px 18px; background: var(--amber-grad); color: #000; border:none; border-radius:var(--r2); font-family:var(--font); font-size:13.5px; font-weight:700; cursor:pointer; position:relative; overflow:hidden; transition:all 0.22s; box-shadow: 0 0 18px rgba(255,140,0,0.35); }
        .btn-primary::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,0.2) 0%,transparent 50%); opacity:0; transition:opacity 0.2s; }
        .btn-primary:hover:not(:disabled)::before { opacity:1; }
        .btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 30px rgba(255,140,0,0.45); }
        .btn-primary:disabled { opacity:0.4; cursor:not-allowed; }
        .btn-ghost { padding:12px 14px; background:transparent; color:var(--tx3); border:1px solid var(--line); border-radius:var(--r2); font-family:var(--font); font-size:12px; font-weight:600; cursor:pointer; transition:all 0.18s; display:flex; align-items:center; gap:5px; }
        .btn-ghost:hover { background:rgba(255,255,255,0.04); color:var(--tx2); border-color:var(--line2); }
        .btn-sm { padding:7px 13px; border-radius:8px; border:1px solid; font-family:var(--font); font-size:11.5px; font-weight:600; cursor:pointer; transition:all 0.15s; display:inline-flex; align-items:center; gap:5px; }
        .btn-sm-v { background:rgba(255,140,0,0.1); border-color:rgba(255,140,0,0.25); color:#ffb300; }
        .btn-sm-v:hover { background:rgba(255,140,0,0.2); border-color:rgba(255,140,0,0.5); }
        .btn-sm-t { background:rgba(255,140,0,0.08); border-color:rgba(255,140,0,0.2); color:#fbbf24; }
        .btn-sm-t:hover { background:rgba(255,140,0,0.15); border-color:rgba(255,140,0,0.45); }
        .btn-sm-g { background:rgba(255,140,0,0.08); border-color:rgba(255,140,0,0.2); color:#ff8c00; }
        .btn-sm-g:hover { background:rgba(255,140,0,0.15); border-color:rgba(255,140,0,0.45); }
        .btn-sm-a { background:rgba(245,158,11,0.09); border-color:rgba(245,158,11,0.22); color:var(--amber); }
        .btn-sm-a:hover { background:rgba(245,158,11,0.18); border-color:rgba(245,158,11,0.5); }
        .progress-wrap { margin-top:12px; }
        .prog-track { height:2px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden; }
        .prog-fill { height:100%; background:linear-gradient(90deg,#ffb300,#ff8c00,#ffb300); background-size:300% 100%; animation:shimmer 1.5s ease-in-out infinite; border-radius:2px; }
        @keyframes shimmer { 0%{background-position:100%} 100%{background-position:-100%} }
        .prog-status { display:flex; align-items:center; gap:9px; margin-top:10px; padding:9px 12px; background:rgba(255,140,0,0.06); border:1px solid rgba(255,140,0,0.14); border-radius:var(--r1); }
        .spin { width:12px; height:12px; border-radius:50%; border:1.5px solid rgba(255,140,0,0.25); border-top-color:#ffb300; animation:spin 0.65s linear infinite; flex-shrink:0; }
        @keyframes spin { to{transform:rotate(360deg)} }
        .prog-txt { font-family:var(--mono); font-size:10px; color:#ffb300; }
        .err-box { margin-top:10px; padding:9px 12px; background:rgba(248,113,113,0.07); border:1px solid rgba(248,113,113,0.18); border-radius:var(--r1); color:#fca5a5; font-size:11.5px; font-family:var(--mono); display:flex; align-items:center; gap:7px; }
        .edot { width:5px; height:5px; border-radius:50%; background:var(--rose); flex-shrink:0; }
        .drive-panel { margin-top:12px; padding:14px; background:rgba(255,140,0,0.04); border:1px solid rgba(255,140,0,0.14); border-radius:var(--r2); }
        .drive-label { font-family:var(--mono); font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,140,0,0.55); margin-bottom:8px; font-weight:700; }
        .drive-row { display:flex; gap:7px; }
        .drive-input { flex:1; background:rgba(255,255,255,0.03); border:1px solid rgba(255,140,0,0.18); border-radius:8px; padding:8px 11px; color:var(--tx2); font-family:var(--mono); font-size:10.5px; outline:none; transition:border-color 0.15s; }
        .drive-input:focus { border-color:rgba(255,140,0,0.4); }
        .drive-input::placeholder { color:var(--tx3); }
        .drive-result { margin-top:8px; font-family:var(--mono); font-size:10px; color:var(--tx2); line-height:1.6; }
        .cr-panel { background:var(--bg2); border:1px solid var(--line); border-radius:var(--r4); overflow:hidden; margin-top:14px; animation:upIn 0.35s ease both; }
        .cr-bar { padding:13px 18px; border-bottom:1px solid var(--line); background:linear-gradient(180deg,var(--bg3) 0%,transparent 100%); display:flex; align-items:center; gap:8px; }
        .cr-title { font-family:var(--display); font-size:14px; font-weight:700; flex:1; }
        .cr-body { padding:8px; }
        .ccard { border-radius:var(--r2); padding:12px 14px; margin-bottom:7px; border:1px solid; animation:upIn 0.4s ease both; transition:all 0.15s; background:rgba(255,140,0,0.03); }
        .ccard:last-child { margin-bottom:0; }
        .ccard:hover { transform:translateX(3px); background:rgba(255,140,0,0.06); border-color:rgba(255,140,0,0.3); }
        .chead { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
        .cdot-wrap { width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .cdot { width:7px; height:7px; border-radius:50%; }
        .cname { font-size:12.5px; font-weight:700; flex:1; }
        .ccount { font-family:var(--mono); font-size:9px; padding:2px 7px; border-radius:100px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.07); color:var(--tx3); }
        .flist { display:flex; flex-direction:column; gap:2px; }
        .frow { display:flex; align-items:center; gap:7px; padding:6px 9px; border-radius:7px; background:rgba(0,0,0,0.12); cursor:pointer; transition:all 0.15s; border:1px solid transparent; min-width:0; }
        .frow:hover { background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.07); }
        .frow-name { font-family:var(--mono); font-size:10px; color:var(--tx2); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; transition:color 0.15s; }
        .frow:hover .frow-name { color:var(--tx); }
        .frow-meta { display:flex; align-items:center; gap:4px; flex-shrink:0; }
        .lang-pill { font-family:var(--mono); font-size:7.5px; font-weight:700; padding:2px 5px; border-radius:4px; background:rgba(255,140,0,0.09); border:1px solid rgba(255,140,0,0.2); color:#fbbf24; }
        .dlg { display:flex; align-items:center; gap:2px; opacity:0; transition:opacity 0.15s; }
        .frow:hover .dlg { opacity:1; }
        .dlbtn { display:inline-flex; align-items:center; gap:2px; padding:2px 6px; border-radius:4px; border:1px solid; font-family:var(--mono); font-size:8px; font-weight:700; cursor:pointer; background:transparent; line-height:1.2; transition:all 0.15s; }
        .dl-og { border-color:rgba(255,140,0,0.22); color:#ffb300; }
        .dl-og:hover { background:rgba(255,140,0,0.15); }
        .dl-en { border-color:rgba(255,140,0,0.2); color:#fbbf24; }
        .dl-en:hover { background:rgba(255,140,0,0.12); }
        .farrow { opacity:0; font-size:10px; color:#ffb300; transition:all 0.15s; transform:translateX(-3px); }
        .frow:hover .farrow { opacity:1; transform:translateX(0); }
        .repbar { display:flex; align-items:center; justify-content:space-between; padding:11px 14px; margin:0 8px 8px; background:rgba(255,140,0,0.04); border:1px solid rgba(255,140,0,0.14); border-radius:var(--r2); animation:upIn 0.5s ease both; }
        .repbar-l { display:flex; align-items:center; gap:9px; }
        .rep-icon { width:30px; height:30px; border-radius:7px; background:rgba(255,140,0,0.1); border:1px solid rgba(255,140,0,0.2); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .rep-lbl { font-size:12px; font-weight:700; color:#ff8c00; }
        .rep-sub2 { font-family:var(--mono); font-size:9px; color:rgba(255,140,0,0.45); margin-top:1px; }
        .rpanel { background:var(--bg2); border:1px solid var(--line); border-radius:var(--r4); overflow:hidden; }
        .rpanel-head { padding:20px 22px; border-bottom:1px solid var(--line); display:flex; align-items:flex-start; gap:12px; background:linear-gradient(180deg,var(--bg3) 0%,transparent 100%); }
        .rbody { padding:18px 20px; }
        .ggrid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .g-lrow { display:flex; align-items:center; gap:7px; margin-bottom:8px; }
        .g-method { font-family:var(--mono); font-size:8px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.04); border:1px solid var(--line); color:var(--tx3); }
        .g-title { font-size:12px; font-weight:700; color:var(--tx); }
        .gbox { border-radius:8px; overflow:hidden; border:1px solid var(--line); background:rgba(0,0,0,0.18); }
        .gbox img { width:100%; display:block; max-height:180px; object-fit:contain; }
        .gempty { height:140px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:9px; }
        .gempty-icon { width:34px; height:34px; border-radius:9px; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; }
        .gempty-txt { font-family:var(--mono); font-size:9px; color:var(--tx3); }
        .tabs { display:flex; align-items:center; gap:3px; padding-bottom:14px; margin-top:18px; border-bottom:1px solid var(--line); margin-bottom:16px; flex-wrap:wrap; }
        .tab { padding:6px 13px; border-radius:7px; border:1px solid transparent; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.18s; color:var(--tx3); background:transparent; font-family:var(--font); display:flex; align-items:center; gap:5px; }
        .tab:hover { color:var(--tx2); background:rgba(255,255,255,0.04); }
        .tab.on { background:rgba(255,140,0,0.1); border-color:rgba(255,140,0,0.22); color:#ffb300; }
        .tab.on-g { background:rgba(255,140,0,0.09); border-color:rgba(255,140,0,0.22); color:#ff8c00; }
        .tab.on-a { background:rgba(255,140,0,0.09); border-color:rgba(255,140,0,0.22); color:#fbbf24; }
        .tc { font-family:var(--mono); font-size:9px; padding:1px 5px; border-radius:100px; background:rgba(255,255,255,0.05); color:var(--tx3); }
        .tab.on .tc { background:rgba(255,140,0,0.18); color:#ffb300; }
        .tab.on-g .tc { background:rgba(255,140,0,0.15); color:#ff8c00; }
        .tab.on-a .tc { background:rgba(255,140,0,0.15); color:#fbbf24; }
        .scards { display:flex; flex-direction:column; gap:9px; }
        .sc2 { border-radius:var(--r2); padding:13px 15px; border:1px solid; transition:transform 0.15s; }
        .sc2:hover { transform:translateX(2px); }
        .sc2-head { display:flex; align-items:center; gap:7px; margin-bottom:7px; }
        .sc2-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .sc2-name { font-size:12.5px; font-weight:700; }
        .sc2-kw { font-family:var(--mono); font-size:9px; padding:2px 6px; border-radius:4px; background:rgba(255,140,0,0.08); border:1px solid rgba(255,140,0,0.16); color:#ffb300; }
        .sc2-text { font-size:12px; color:var(--tx2); line-height:1.75; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
        .sc2-text.exp { -webkit-line-clamp:unset; overflow:visible; }
        .expbtn { font-family:var(--mono); font-size:9.5px; color:#ffb300; background:none; border:none; cursor:pointer; padding:3px 0 0; }
        .ins-wrap { display:grid; grid-template-columns:160px 1fr; gap:10px; }
        .ins-nav { display:flex; flex-direction:column; gap:2px; }
        .ins-nb { padding:8px 10px; border-radius:7px; border:1px solid transparent; cursor:pointer; text-align:left; font-size:11.5px; font-weight:600; color:var(--tx3); background:transparent; transition:all 0.15s; font-family:var(--font); display:flex; align-items:center; gap:6px; width:100%; }
        .ins-nb:hover { background:rgba(255,255,255,0.04); color:var(--tx2); }
        .ins-nb.on { background:rgba(255,140,0,0.09); border-color:rgba(255,140,0,0.2); color:#ffb300; }
        .ins-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .ins-lbl { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
        .ins-detail { display:flex; flex-direction:column; gap:9px; }
        .icard { background:rgba(0,0,0,0.16); border:1px solid var(--line); border-radius:var(--r2); padding:13px 15px; }
        .icard-lbl { font-family:var(--mono); font-size:8.5px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--tx3); margin-bottom:8px; }
        .icard-val { font-size:12.5px; color:var(--tx); line-height:1.65; }
        .sent-bars { display:flex; flex-direction:column; gap:6px; }
        .sent-row { display:flex; align-items:center; gap:9px; }
        .sent-lbl { font-family:var(--mono); font-size:10px; color:var(--tx2); width:52px; }
        .sent-track { flex:1; height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden; }
        .sent-fill { height:100%; border-radius:2px; transition:width 0.8s ease; }
        .sent-pct { font-family:var(--mono); font-size:9px; color:var(--tx3); width:32px; text-align:right; }
        .kw-wrap { display:flex; flex-wrap:wrap; gap:5px; }
        .kw-chip { font-family:var(--mono); font-size:9.5px; padding:3px 8px; border-radius:5px; background:rgba(255,140,0,0.07); border:1px solid rgba(255,140,0,0.15); color:#ffb300; }
        .rep-doc-row { display:flex; align-items:center; gap:8px; padding:8px 11px; background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.14); border-radius:var(--r1); margin-bottom:9px; }
        .rep-doc-name { font-family:var(--mono); font-size:10.5px; color:var(--amber); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .rep-badge { font-family:var(--mono); font-size:8.5px; padding:2px 6px; border-radius:4px; background:rgba(245,158,11,0.1); color:var(--amber); border:1px solid rgba(245,158,11,0.22); }
        .ranked-list { display:flex; flex-direction:column; gap:2px; }
        .ranked-item { display:flex; align-items:center; gap:7px; padding:5px 9px; border-radius:6px; background:rgba(0,0,0,0.13); }
        .ranked-num { font-family:var(--mono); font-size:9px; color:var(--tx3); width:14px; }
        .ranked-name { font-family:var(--mono); font-size:10px; color:var(--tx2); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ranked-sim { font-family:var(--mono); font-size:9px; color:var(--tx3); }
        .lang-dist { display:flex; flex-wrap:wrap; gap:5px; }
        .lang-item { display:flex; align-items:center; gap:5px; padding:3px 9px; border-radius:6px; background:rgba(45,212,191,0.07); border:1px solid rgba(45,212,191,0.16); }
        .lang-code { font-family:var(--mono); font-size:10px; font-weight:700; color:var(--teal); }
        .lang-cnt { font-family:var(--mono); font-size:9px; color:var(--tx3); }
        .intel-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
        .intel-action { background:var(--bg3); border:1px solid var(--line); border-radius:var(--r2); padding:14px 16px; }
        .intel-action-title { font-size:12.5px; font-weight:700; color:var(--tx); margin-bottom:4px; }
        .intel-action-sub { font-size:11px; color:var(--tx3); margin-bottom:10px; line-height:1.5; }
        .entity-box { background:var(--bg3); border:1px solid var(--line); border-radius:var(--r2); padding:14px; }
        .entity-type { margin-bottom:10px; }
        .entity-type-lbl { font-family:var(--mono); font-size:9px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--tx3); margin-bottom:6px; }
        .entity-chips { display:flex; flex-wrap:wrap; gap:5px; }
        .entity-chip { font-family:var(--mono); font-size:10px; padding:3px 9px; border-radius:100px; }
        .ec-person { background:rgba(255,179,0,0.1); border:1px solid rgba(255,179,0,0.25); color:#ffcd38; }
        .ec-org    { background:rgba(255,140,0,0.08); border:1px solid rgba(255,140,0,0.2); color:#ffa733; }
        .ec-loc    { background:rgba(255,94,58,0.09); border:1px solid rgba(255,94,58,0.22); color:#ff866a; }
        .ec-tech   { background:rgba(255,215,0,0.08); border:1px solid rgba(255,215,0,0.2); color:#ffeb3b; }
        .ec-date   { background:rgba(251,191,36,0.09); border:1px solid rgba(251,191,36,0.2); color:#fcd34d; }
        .ec-other  { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:var(--tx3); }
        .rel-box { background:var(--bg3); border:1px solid var(--line); border-radius:var(--r2); padding:14px; margin-top:12px; }
        .rel-item { display:flex; align-items:center; gap:10px; padding:7px 10px; border-radius:6px; background:rgba(0,0,0,0.15); margin-bottom:5px; font-size:12px; }
        .rel-subj { color:#ffcd38; font-weight:600; }
        .rel-pred { color:var(--tx3); font-style:italic; font-size:11px; }
        .rel-obj { color:#ffa733; font-weight:600; }
        .intel-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:32px; text-align:center; }
        .intel-empty-icon { width:44px; height:44px; border-radius:12px; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:center; }
        .intel-empty-txt { font-family:var(--mono); font-size:10px; color:var(--tx3); line-height:1.7; }
        .kg-stats-row { display:flex; gap:10px; margin-bottom:10px; }
        .kg-stat { flex:1; background:rgba(0,0,0,0.2); border:1px solid var(--line); border-radius:8px; padding:10px 13px; }
        .kg-stat-lbl { font-family:var(--mono); font-size:8px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--tx3); margin-bottom:4px; }
        .kg-stat-val { font-family:var(--display); font-size:26px; font-weight:700; letter-spacing:-1px; line-height:1; }
        .vizp { background:rgba(0,0,0,0.16); border:1px solid var(--line); border-radius:var(--r3); padding:14px; }
        .viz-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .viz-title2 { font-family:var(--display); font-size:13.5px; font-weight:700; color:var(--tx); }
        .viz-sub2 { font-family:var(--mono); font-size:9px; color:var(--tx3); margin-top:2px; }
        .viz-canvas { border-radius:9px; border:1px solid var(--line); background:rgba(0,0,0,0.24); width:100%; display:block; }
        .viz-legend { display:flex; flex-wrap:wrap; gap:9px; margin-top:9px; }
        .viz-li { display:flex; align-items:center; gap:5px; font-family:var(--mono); font-size:9.5px; color:var(--tx2); }
        .viz-ldot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .lang-bar-row { display:flex; align-items:center; gap:9px; margin-bottom:7px; }
        .lang-bar-track { flex:1; height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden; }
        .lang-bar-fill { height:100%; background:linear-gradient(90deg,var(--teal),#0891b2); border-radius:2px; }
        .rag-wrap { display:flex; flex-direction:column; height:700px; background:rgba(0,0,0,0.13); border:1px solid var(--line); border-radius:var(--r3); overflow:hidden; }
        .rag-hdr { padding:13px 16px; border-bottom:1px solid var(--line); background:rgba(255,140,0,0.03); display:flex; align-items:center; gap:9px; flex-shrink:0; }
        .rag-hdr-ico { width:29px; height:29px; border-radius:7px; background:rgba(255,140,0,0.1); border:1px solid rgba(255,140,0,0.2); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .rag-hdr-info { flex:1; }
        .rag-hdr-title { font-size:13px; font-weight:700; color:var(--tx); }
        .rag-hdr-sub { font-family:var(--mono); font-size:9px; color:var(--tx3); margin-top:1px; }
        .rag-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .rag-dot.rdy { background:#ff8c00; box-shadow:0 0 8px #ff8c00; animation:dotPulse 2s ease-in-out infinite; }
        .rag-ctrl { padding:8px 12px; border-bottom:1px solid var(--line); display:flex; align-items:center; gap:7px; flex-shrink:0; flex-wrap:wrap; background:rgba(0,0,0,0.08); }
        .rag-cl { font-family:var(--mono); font-size:8.5px; color:var(--tx3); text-transform:uppercase; letter-spacing:1.2px; }
        .rag-sel { background:rgba(255,255,255,0.04); border:1px solid var(--line); border-radius:6px; color:var(--tx2); font-family:var(--mono); font-size:10px; padding:4px 7px; outline:none; cursor:pointer; }
        .rag-sel:focus { border-color:rgba(255,140,0,0.4); }
        .rag-topk { display:flex; align-items:center; gap:5px; margin-left:auto; }
        .rag-kb { width:20px; height:20px; border-radius:4px; border:1px solid var(--line); background:transparent; color:var(--tx3); cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
        .rag-kb:hover { background:rgba(255,255,255,0.07); }
        .rag-kv { font-family:var(--mono); font-size:10px; color:var(--tx2); min-width:15px; text-align:center; }
        .rag-msgs { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:12px; }
        .rag-msg { display:flex; gap:9px; animation:upIn 0.2s ease both; }
        .rag-msg.user { flex-direction:row-reverse; }
        .rag-av { width:27px; height:27px; border-radius:7px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; margin-top:2px; font-family:var(--mono); }
        .rag-av.ai  { background:rgba(255,140,0,0.1); border:1px solid rgba(255,140,0,0.2); color:#ff8c00; }
        .rag-av.usr { background:rgba(255,179,0,0.12); border:1px solid rgba(255,179,0,0.22); color:#ffb300; }
        .rag-bw { display:flex; flex-direction:column; gap:5px; max-width:89%; }
        .rag-msg.user .rag-bw { align-items:flex-end; }
        .rag-bubble { padding:9px 13px; border-radius:11px; font-size:12.5px; line-height:1.65; }
        .rag-bubble.ai { background:rgba(255,255,255,0.04); border:1px solid var(--line); color:var(--tx); border-radius:11px 11px 11px 3px; }
        .rag-bubble.ai.wel { background:rgba(255,140,0,0.04); border-color:rgba(255,140,0,0.13); color:var(--tx2); }
        .rag-bubble.usr { background:rgba(255,140,0,0.12); border:1px solid rgba(255,140,0,0.2); color:var(--tx); border-radius:11px 11px 3px 11px; }
        .src-toggle { display:inline-flex; align-items:center; gap:4px; background:none; border:none; cursor:pointer; font-family:var(--mono); font-size:9px; color:rgba(255,140,0,0.5); transition:color 0.15s; padding:0; }
        .src-toggle:hover { color:#ff8c00; }
        .src-toggle svg { transition:transform 0.2s; }
        .src-toggle.open svg { transform:rotate(180deg); }
        .rag-sources { display:flex; flex-direction:column; gap:4px; margin-top:3px; }
        .rag-src { display:flex; align-items:flex-start; gap:7px; padding:7px 9px; background:rgba(0,0,0,0.2); border:1px solid var(--line); border-radius:7px; }
        .rag-src-rank { font-family:var(--mono); font-size:8px; color:var(--tx3); width:12px; flex-shrink:0; padding-top:1px; }
        .rag-src-body { flex:1; min-width:0; }
        .rag-src-file { font-family:var(--mono); font-size:9.5px; font-weight:600; color:#ffb300; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .rag-src-meta { font-family:var(--mono); font-size:8px; color:var(--tx3); margin-top:1px; }
        .rag-src-exc { font-size:10px; color:var(--tx2); line-height:1.5; margin-top:3px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .rag-src-sim { font-family:var(--mono); font-size:8px; padding:2px 5px; border-radius:4px; background:rgba(255,140,0,0.07); border:1px solid rgba(255,140,0,0.14); color:rgba(255,179,0,0.65); flex-shrink:0; margin-top:1px; }
        .rag-typing { display:flex; align-items:center; gap:4px; padding:9px 12px; background:rgba(255,255,255,0.04); border:1px solid var(--line); border-radius:11px 11px 11px 3px; width:fit-content; }
        .rag-typing span { width:5px; height:5px; border-radius:50%; background:var(--tx3); animation:bounce 1.2s ease-in-out infinite; }
        .rag-typing span:nth-child(2) { animation-delay:0.2s; }
        .rag-typing span:nth-child(3) { animation-delay:0.4s; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:0.35} 30%{transform:translateY(-5px);opacity:1} }
        .rag-empty2 { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:9px; padding:18px; }
        .rag-empty-ico { width:46px; height:46px; border-radius:13px; background:rgba(255,140,0,0.05); border:1px dashed rgba(255,140,0,0.17); display:flex; align-items:center; justify-content:center; }
        .rag-ep-t { font-family:var(--display); font-size:14px; font-weight:700; color:var(--tx2); }
        .rag-ep-s { font-family:var(--mono); font-size:10px; color:var(--tx3); text-align:center; line-height:1.7; max-width:270px; }
        .rag-prompts { display:flex; flex-direction:column; gap:4px; width:100%; max-width:310px; }
        .rag-prompt { padding:8px 11px; background:rgba(255,140,0,0.04); border:1px solid rgba(255,140,0,0.12); border-radius:7px; color:rgba(255,179,0,0.65); font-size:11px; cursor:pointer; text-align:left; transition:all 0.15s; font-family:var(--font); }
        .rag-prompt:hover { background:rgba(255,140,0,0.09); border-color:rgba(255,140,0,0.25); color:#ff8c00; }
        .rag-err { padding:7px 11px; background:rgba(248,113,113,0.07); border:1px solid rgba(248,113,113,0.16); border-radius:7px; color:#fca5a5; font-family:var(--mono); font-size:10px; margin:0 14px 8px; display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .rag-ia { padding:10px 12px; border-top:1px solid var(--line); flex-shrink:0; background:rgba(0,0,0,0.09); }
        .rag-irow { display:flex; gap:7px; align-items:flex-end; }
        .rag-ta { flex:1; background:rgba(255,255,255,0.04); border:1px solid var(--line); border-radius:9px; padding:9px 12px; color:var(--tx); font-family:var(--font); font-size:12.5px; resize:none; outline:none; min-height:40px; max-height:100px; transition:border-color 0.15s; line-height:1.5; }
        .rag-ta::placeholder { color:var(--tx3); }
        .rag-ta:focus { border-color:rgba(255,140,0,0.3); }
        .rag-send { width:40px; height:40px; border-radius:9px; flex-shrink:0; background:rgba(255,140,0,0.12); border:1px solid rgba(255,140,0,0.25); color:#ff8c00; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.18s; }
        .rag-send:hover:not(:disabled) { background:rgba(255,140,0,0.22); border-color:rgba(255,140,0,0.5); box-shadow:0 0 16px rgba(255,140,0,0.2); }
        .rag-send:disabled { opacity:0.35; cursor:not-allowed; }
        .rag-hint { font-family:var(--mono); font-size:9px; color:var(--tx3); margin-top:6px; text-align:center; }
        .modal-bg { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.88); backdrop-filter:blur(22px) saturate(180%); display:flex; align-items:center; justify-content:center; padding:24px; animation:fadeIn 0.2s ease; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .modal { background:var(--bg2); border:1px solid var(--line2); border-radius:var(--r4); width:100%; max-width:940px; max-height:90vh; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 36px 80px rgba(0,0,0,0.75),0 0 0 1px rgba(255,255,255,0.04); animation:modalIn 0.25s ease; }
        @keyframes modalIn { from{opacity:0;transform:scale(0.96) translateY(9px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .modal-bar { display:flex; align-items:center; gap:9px; padding:13px 16px; border-bottom:1px solid var(--line); background:linear-gradient(180deg,var(--bg3) 0%,transparent 100%); flex-shrink:0; flex-wrap:wrap; }
        .modal-back { display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:7px; background:rgba(255,255,255,0.05); border:1px solid var(--line); color:var(--tx2); font-size:11.5px; font-weight:600; cursor:pointer; font-family:var(--font); transition:all 0.15s; flex-shrink:0; }
        .modal-back:hover { background:rgba(255,255,255,0.09); color:var(--tx); }
        .modal-info { flex:1; min-width:80px; }
        .modal-name { font-size:12.5px; font-weight:700; color:var(--tx); }
        .modal-path { font-family:var(--mono); font-size:9.5px; color:var(--tx3); margin-top:1px; }
        .modal-acts { display:flex; align-items:center; gap:6px; flex-shrink:0; flex-wrap:wrap; }
        .modal-sw { display:flex; align-items:center; background:rgba(0,0,0,0.28); border:1px solid var(--line); border-radius:8px; padding:3px; gap:2px; }
        .sw-btn { padding:4px 10px; border-radius:5px; border:none; font-family:var(--font); font-size:11px; font-weight:600; cursor:pointer; transition:all 0.18s; color:var(--tx3); background:transparent; }
        .sw-og { background:rgba(255,140,0,0.18); color:#ffb300; border:1px solid rgba(255,140,0,0.3) !important; }
        .sw-tr { background:rgba(255,140,0,0.12); color:#fbbf24; border:1px solid rgba(255,140,0,0.25) !important; }
        .modal-tr-bar { display:flex; align-items:center; gap:8px; padding:6px 16px; background:rgba(255,140,0,0.04); border-bottom:1px solid rgba(255,140,0,0.1); flex-shrink:0; }
        .tr-dot { width:5px; height:5px; border-radius:50%; background:#fbbf24; box-shadow:0 0 6px #fbbf24; animation:dotPulse 1.8s ease-in-out infinite; flex-shrink:0; }
        .tr-txt { font-family:var(--mono); font-size:10px; color:#fbbf24; }
        .modal-frame { width:100%; height:540px; border:none; display:block; background:white; }
        @media (max-width:1140px) { .workspace{grid-template-columns:1fr} .stats{grid-template-columns:repeat(3,1fr)} .ins-wrap{grid-template-columns:1fr} }
        @media (max-width:680px) { .shell{padding:0 14px 60px} .stats{grid-template-columns:repeat(2,1fr)} .ggrid{grid-template-columns:1fr} .intel-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="root">
        <div className="noise" /><div className="grid-bg" /><div className="orb o1" /><div className="orb o2" />

        <div className="shell">
          {/* â”€â”€ Topbar â”€â”€ */}
          <nav className="topbar">
            <div className="logo">
              <div className="logo-mark">
                <Icon d={["M12 3l9 4.5L12 12 3 7.5 12 3z","M3 12l9 4.5L21 12","M3 16.5l9 4.5 9-4.5"]} size={17} stroke="white" sw={2} />
              </div>
              <span className="logo-title">Verbo<em>AI</em></span>
              <div className="logo-sep" />
              <span className="logo-sub">Intelligence Platform v3.0</span>
            </div>
            <div className="topbar-right">
              {ragReady && <span className="pill pill-g"><span className="pdot pdot-pulse" />RAG Active</span>}
              <span className="pill pill-t">
                <Icon d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" size={9} sw={2.5} />
                Multi-lang Â· Auto-translate
              </span>
              <span className="pill pill-a">
                <Icon d={["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z","M3.27 6.96L12 12.01l8.73-5.05","M12 22.08V12"]} size={9} sw={2.5} />
                Entities Â· KG Â· RAG
              </span>
              <span className="pill pill-v"><span className="pdot" />FastAPI</span>
            </div>
          </nav>

          {/* â”€â”€ Stats â”€â”€ */}
          {clusters && (
            <div className="stats">
              <div className="scard sc-v"><div className="slbl">Total Files</div><div className="sval sval-v">{totalFiles}</div><div className="ssub">processed this session</div></div>
              <div className="scard sc-v"><div className="slbl">Clusters</div><div className="sval sval-v">{clusterCount}</div><div className="ssub">semantic groups</div></div>
              <div className="scard sc-t"><div className="slbl">Translated</div><div className="sval sval-t">{Object.keys(translatedFiles).length}</div><div className="ssub">non-English docs</div></div>
              <div className="scard sc-g"><div className="slbl">RAG Chunks</div><div className="sval sval-g">{ragReady ? "âœ“" : "â€”"}</div><div className="ssub">{ragReady ? "indexed & ready" : "not yet indexed"}</div></div>
              <div className="scard sc-a"><div className="slbl">Languages</div><div className="sval sval-a">{Object.keys(overallLang).length || "â€”"}</div><div className="ssub">detected across docs</div></div>
            </div>
          )}

          {/* â”€â”€ Workspace â”€â”€ */}
          <div className="workspace">

            {/* â”€â”€ LEFT SIDEBAR â”€â”€ */}
            <div>
              <div className="panel">
                <div className="ph">
                  <span className="ph-step">STEP 01</span>
                  <div><div className="ph-title">Upload & Configure</div><div className="ph-sub">Files, workspace ID, and Google Drive ingestion</div></div>
                </div>
                <div className="pb">
                  <div className="stabs">
                    <button className={`stab${sidebarTab === "files" ? " on" : ""}`} onClick={() => setSidebarTab("files")}>Files</button>
                    <button className={`stab${sidebarTab === "workspace" ? " on" : ""}`} onClick={() => setSidebarTab("workspace")}>Workspace</button>
                    <button className={`stab${sidebarTab === "drive" ? " on" : ""}`} onClick={() => setSidebarTab("drive")}>Drive</button>
                  </div>

                  {sidebarTab === "files" && (
                    <>
                      <div className="winput-wrap">
                        <div className="winput-label"><Icon d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" size={9} sw={2} /> Workspace ID (optional)</div>
                        <input className="winput" placeholder="e.g. my-project-2026" value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} />
                      </div>
                      <label
                        className={`dropzone${dragOver ? " dv" : ""}`}
                        onClick={() => fileInputRef.current.click()}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); handleFileChange({ target: { files: e.dataTransfer.files } }); }}
                      >
                        {files.length === 0 ? (
                          <>
                            <div className="drop-ico"><Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" size={22} stroke="var(--vl)" sw={1.6} /></div>
                            <p className="drop-hl">Drag & drop or click to browse</p>
                            <p className="drop-hint">PDFs, DOCX, TXT and more<br />Marathi, Hindi, Arabic â€” auto-translated to English</p>
                          </>
                        ) : (
                          <div className="filechips">
                            {fileThumbs.map((th, i) => (
                              th
                                ? <div key={i} className="fchip"><img src={th} alt="" style={{ width:28, height:28, objectFit:"cover", borderRadius:5 }} /><span className="fchip-name">{files[i].name}</span></div>
                                : <div key={i} className="fchip"><Icon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" size={13} stroke="var(--vl)" sw={1.5} /><span className="fchip-name">{files[i].name}</span></div>
                            ))}
                          </div>
                        )}
                      </label>
                      <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} style={{ display:"none" }} />
                      <div className="actions">
                        <button className="btn-primary" onClick={handleUpload} disabled={loading}>{loading ? "Processingâ€¦" : "Run Intelligence Pipeline"}</button>
                        <button className="btn-ghost" onClick={() => window.location.reload()}><Icon d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" size={12} sw={2} />Reset</button>
                      </div>
                      {loading && (
                        <div className="progress-wrap">
                          <div className="prog-track"><div className="prog-fill" /></div>
                          <div className="prog-status"><div className="spin" /><span className="prog-txt">Detecting Â· Translating Â· Embedding Â· Clustering Â· Indexing RAGâ€¦</span></div>
                        </div>
                      )}
                      {error && <div className="err-box"><div className="edot" />{error}</div>}
                    </>
                  )}

                  {sidebarTab === "workspace" && (
                    <div>
                      <div className="winput-wrap">
                        <div className="winput-label">Workspace ID</div>
                        <input className="winput" placeholder="e.g. my-project (leave blank to auto-create)" value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} />
                      </div>
                      <div style={{ fontSize:11, color:"var(--tx3)", fontFamily:"var(--mono)", marginBottom:10, lineHeight:1.7, background:"rgba(124,58,237,0.05)", border:"1px solid rgba(124,58,237,0.12)", borderRadius:7, padding:"8px 10px" }}>
                        <span style={{color:"var(--vl)",fontWeight:700}}>How to use:</span><br/>
                        1. Type a Workspace ID above (or leave blank to auto-create)<br/>
                        2. Go to <span style={{color:"var(--vl)"}}>Files</span> tab and upload + process<br/>
                        3. Return here â†’ click Extract / Build KG
                      </div>
                      {(intelligenceRep || clusters) && (
                        <div style={{ background:"rgba(34,211,160,0.04)", border:"1px solid rgba(34,211,160,0.14)", borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
                          <div className="icard-lbl" style={{marginBottom:7}}>Session Intelligence</div>
                          <div style={{ fontSize:11, color:"var(--tx2)", lineHeight:1.8 }}>
                            <div>ðŸ“ {intelligenceRep?.global_statistics?.total_documents ?? totalFiles} documents</div>
                            <div>ðŸ—‚ï¸ {intelligenceRep?.global_statistics?.total_clusters ?? clusterCount} clusters</div>
                            <div>ðŸŒ {Object.keys(overallLang).length} languages detected</div>
                            {entities?.total !== undefined && <div>ðŸ·ï¸ {entities.total} entities extracted</div>}
                            {relationships?.total !== undefined && <div>ðŸ”— {relationships.total} relationships found</div>}
                            {workspaceId && <div style={{marginTop:6, color:"var(--green)", fontFamily:"var(--mono)", fontSize:10}}>WS: {workspaceId}</div>}
                          </div>
                        </div>
                      )}
                      <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                        <button className="btn-sm btn-sm-g" onClick={dlReport} disabled={!intelligenceRep}><Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" size={11} sw={2} />Export Report</button>
                        <button className="btn-sm btn-sm-v" onClick={runEntityExtraction} disabled={entityLoading || !clusters}>{entityLoading ? <><div className="spin" style={{width:9,height:9,borderTopColor:"var(--vl)",borderColor:"rgba(167,139,250,0.2)"}} />Runningâ€¦</> : "Extract Entities"}</button>
                        <button className="btn-sm btn-sm-t" onClick={runRelationshipExtraction} disabled={entityLoading || !clusters}>{entityLoading ? "Runningâ€¦" : "Relationships"}</button>
                        <button className="btn-sm btn-sm-a" onClick={buildKnowledgeGraph} disabled={entityLoading || !clusters}>{entityLoading ? "Runningâ€¦" : "Build KG"}</button>
                      </div>
                      {!clusters && <div style={{marginTop:10, fontFamily:"var(--mono)", fontSize:10, color:"var(--tx3)"}}>Upload and process documents first to enable intelligence features.</div>}
                    </div>
                  )}

                  {sidebarTab === "drive" && (
                    <div>
                      <div style={{ fontSize:12, color:"var(--tx2)", marginBottom:12, lineHeight:1.6 }}>Ingest documents directly from a Google Drive folder. Files will be processed through the full intelligence pipeline.</div>
                      <div className="drive-panel">
                        <div className="drive-label">Google Drive Folder URL</div>
                        <div className="drive-row">
                          <input className="drive-input" placeholder="Drive folder URL or folder ID" value={driveUrl} onChange={e => setDriveUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && ingestDrive()} />
                          <button className="btn-sm btn-sm-a" onClick={ingestDrive} disabled={driveLoading} style={{flexShrink:0}}>
                            {driveLoading ? <div className="spin" style={{borderTopColor:"var(--amber)",borderColor:"rgba(245,158,11,0.2)",width:10,height:10}} /> : <Icon d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" size={11} sw={2} />}
                            Ingest
                          </button>
                        </div>
                        {driveResult && (
                          <div className="drive-result">
                            {driveResult.error
                              ? <span style={{color:"var(--rose)"}}>âš  {driveResult.error}</span>
                              : <span style={{color:"var(--green)"}}>âœ“ {driveResult.message || JSON.stringify(driveResult).slice(0,120)}</span>}
                          </div>
                        )}
                      </div>
                      {workspaceId && <div style={{marginTop:10, fontFamily:"var(--mono)", fontSize:9.5, color:"var(--tx3)"}}>Workspace: <span style={{color:"var(--amber)"}}>{workspaceId}</span></div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Cluster results */}
              {showClusters && clusters && (
                <div className="cr-panel">
                  <div className="cr-bar">
                    <span className="cr-title">Cluster Results</span>
                    <span className="pill pill-v">{clusterCount} groups</span>
                    {Object.keys(translatedFiles).length > 0 && <span className="pill pill-t"><span className="pdot" />{Object.keys(translatedFiles).length} translated</span>}
                  </div>
                  <div className="cr-body">
                    {Object.entries(clusters).map(([name, files2], idx) => {
                      const col = PALETTE[idx % PALETTE.length];
                      return (
                        <div key={idx} className="ccard" style={{ background:col.bg, borderColor:col.border, animationDelay:`${idx*0.06}s` }}>
                          <div className="chead">
                            <div className="cdot-wrap" style={{ background:`${col.glow}18`, border:`1px solid ${col.glow}` }}>
                              <div className="cdot" style={{ background:col.dot, boxShadow:`0 0 6px ${col.glow}` }} />
                            </div>
                            <span className="cname" style={{color:col.accent}}>{cap(name)}</span>
                            <span className="ccount">{files2.length} file{files2.length !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="flist">
                            {files2.map((fn, fi) => {
                              const lt = getLangTag(fn), ht = hasTrans(fn);
                              return (
                                <div key={fi} className="frow" onClick={() => openFile(fn)}>
                                  <Icon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" size={10} stroke="var(--tx3)" sw={1.5} />
                                  <span className="frow-name">{fn}</span>
                                  <div className="frow-meta">
                                    {lt && <span className="lang-pill">{lt}</span>}
                                    <div className="dlg">
                                      <button className="dlbtn dl-og" onClick={e => dlOrig(e, fn)}>OG</button>
                                      {ht && <button className="dlbtn dl-en" onClick={e => dlTrans(e, fn)}>EN</button>}
                                    </div>
                                    <span className="farrow">â†’</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {intelligenceRep && (
                    <div className="repbar">
                      <div className="repbar-l">
                        <div className="rep-icon"><Icon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8" size={13} stroke="var(--green)" sw={2} /></div>
                        <div><div className="rep-lbl">Intelligence Report Ready</div><div className="rep-sub2">{clusterCount} clusters Â· {totalFiles} documents</div></div>
                      </div>
                      <button className="btn-sm btn-sm-g" onClick={dlReport}><Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" size={10} sw={2} />Export JSON</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* â”€â”€ RIGHT PANEL â”€â”€ */}
            <div>
              <div className="rpanel">
                <div className="rpanel-head">
                  <span className="ph-step">STEP 02</span>
                  <div><div className="ph-title">Cluster Analysis & Intelligence</div><div className="ph-sub">Embeddings Â· Entity extraction Â· Knowledge graph Â· RAG chat</div></div>
                </div>
                <div className="rbody">
                  {/* Graphs */}
                  <div className="ggrid">
                    <div>
                      <div className="g-lrow"><span className="g-method">Method A</span><span className="g-title">Elbow Curve</span></div>
                      <div className="gbox">{elbowGraph ? <img src={elbowGraph} alt="Elbow" /> : <div className="gempty"><div className="gempty-icon"><Icon d="M22 12 18 12M15 21 9 3 6 12 2 12" size={15} sw={1.5} /></div><span className="gempty-txt">Awaiting analysis</span></div>}</div>
                    </div>
                    <div>
                      <div className="g-lrow"><span className="g-method">Method B</span><span className="g-title">Silhouette</span></div>
                      <div className="gbox">{silhouetteGraph ? <img src={silhouetteGraph} alt="Silhouette" /> : <div className="gempty"><div className="gempty-icon"><Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01" size={15} sw={1.5} /></div><span className="gempty-txt">Awaiting analysis</span></div>}</div>
                    </div>
                  </div>

                  {clusters && (
                    <>
                      {/* Tabs */}
                      <div className="tabs">
                        <button className={`tab${activeTab === "clusters" ? " on" : ""}`} onClick={() => setActiveTab("clusters")}>Clusters <span className="tc">{clusterCount}</span></button>
                        <button className={`tab${activeTab === "insights" ? " on" : ""}`} onClick={() => setActiveTab("insights")}>Insights <span className="tc">{insightData.length}</span></button>
                        <button className={`tab${activeTab === "viz" ? " on" : ""}`} onClick={() => setActiveTab("viz")}>2D Map {vizData.length > 0 && <span className="tc">{vizData.length}</span>}</button>
                        <button className={`tab${activeTab === "lang" ? " on" : ""}`} onClick={() => setActiveTab("lang")}>Languages <span className="tc">{Object.keys(overallLang).length}</span></button>
                        <button className={`tab${activeTab === "intel" ? " on-a" : ""}`} onClick={() => setActiveTab("intel")}>
                          <Icon d={["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"]} size={11} sw={2} />
                          Intelligence <span className="tc" style={activeTab==="intel"?{background:"rgba(245,158,11,0.15)",color:"var(--amber)"}:{}}>KG</span>
                        </button>
                        <button className={`tab${activeTab === "chat" ? " on-g" : ""}`} onClick={() => setActiveTab("chat")}>
                          <Icon d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" size={11} sw={2} />
                          Doc Chat {ragReady && <span className="tc" style={activeTab==="chat"?{background:"rgba(34,211,160,0.15)",color:"var(--green)"}:{}}>RAG</span>}
                        </button>
                      </div>

                      {/* â”€â”€ Clusters tab â”€â”€ */}
                      {activeTab === "clusters" && (
                        <div className="scards">
                          {Object.entries(summaries).map(([name, summary], idx) => {
                            const col = PALETTE[idx % PALETTE.length];
                            const exp = expandedSummaries[name];
                            return (
                              <div key={name} className="sc2" style={{ background:col.bg, borderColor:col.border }}>
                                <div className="sc2-head">
                                  <div className="sc2-dot" style={{ background:col.dot, boxShadow:`0 0 5px ${col.glow}` }} />
                                  <span className="sc2-name" style={{color:col.accent}}>{cap(name)}</span>
                                  {(keywords[name] || []).slice(0,3).map(k => <span key={k} className="sc2-kw">{k}</span>)}
                                </div>
                                <div className={`sc2-text${exp ? " exp" : ""}`}>{summary}</div>
                                {summary?.length > 150 && <button className="expbtn" onClick={() => setExpandedSummaries(p => ({...p,[name]:!p[name]}))}>{exp ? "â–² less" : "â–¼ more"}</button>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* â”€â”€ Insights tab â”€â”€ */}
                      {activeTab === "insights" && insightData.length > 0 && (
                        <div className="ins-wrap">
                          <div className="ins-nav">
                            {insightData.map((ins, idx) => {
                              const col = PALETTE[idx % PALETTE.length];
                              return (
                                <button key={ins.cluster_name} className={`ins-nb${activeCluster === ins.cluster_name ? " on" : ""}`} onClick={() => setActiveCluster(ins.cluster_name)}>
                                  <div className="ins-dot" style={{background:col.dot}} />
                                  <span className="ins-lbl">{cap(ins.cluster_name)}</span>
                                </button>
                              );
                            })}
                          </div>
                          {activeInsight && (
                            <div className="ins-detail">
                              <div className="icard"><div className="icard-lbl">Auto Summary</div><div className="icard-val">{activeInsight.summary || "â€”"}</div></div>
                              {sentiment[activeInsight.cluster_name] && (
                                <div className="icard">
                                  <div className="icard-lbl">Sentiment Analysis</div>
                                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                                    <span style={{fontSize:11,fontWeight:700,color:sentColor(sentiment[activeInsight.cluster_name])}}>{sentLabel(sentiment[activeInsight.cluster_name])}</span>
                                    <span style={{fontFamily:"var(--mono)",fontSize:9.5,color:"var(--tx3)"}}>compound: {sentiment[activeInsight.cluster_name].compound}</span>
                                  </div>
                                  <div className="sent-bars">
                                    {[{lbl:"Positive",key:"positive",color:"#22d3a0"},{lbl:"Neutral",key:"neutral",color:"#94a3b8"},{lbl:"Negative",key:"negative",color:"#f87171"}].map(s => (
                                      <div key={s.key} className="sent-row">
                                        <span className="sent-lbl">{s.lbl}</span>
                                        <div className="sent-track"><div className="sent-fill" style={{width:`${sentiment[activeInsight.cluster_name][s.key]}%`,background:s.color}} /></div>
                                        <span className="sent-pct">{sentiment[activeInsight.cluster_name][s.key]}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {keywords[activeInsight.cluster_name] && (
                                <div className="icard"><div className="icard-lbl">Smart Tags Â· Top Keywords</div><div className="kw-wrap">{keywords[activeInsight.cluster_name].map(k => <span key={k} className="kw-chip">{k}</span>)}</div></div>
                              )}
                              {repDocs[activeInsight.cluster_name] && (
                                <div className="icard">
                                  <div className="icard-lbl">Document Importance Ranking</div>
                                  <div className="rep-doc-row"><span style={{fontSize:13}}>â­</span><span className="rep-doc-name">{repDocs[activeInsight.cluster_name].most_representative}</span><span className="rep-badge">Top Rep.</span></div>
                                  <div className="ranked-list">
                                    {repDocs[activeInsight.cluster_name].ranked_documents?.map((doc, i) => (
                                      <div key={doc.filename} className="ranked-item">
                                        <span className="ranked-num">#{i+1}</span>
                                        <span className="ranked-name">{doc.filename}</span>
                                        <span className="ranked-sim">{(doc.similarity*100).toFixed(1)}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {langDist[activeInsight.cluster_name] && (
                                <div className="icard">
                                  <div className="icard-lbl">Language Distribution</div>
                                  <div className="lang-dist">
                                    {Object.entries(langDist[activeInsight.cluster_name]).map(([lang, cnt]) => (
                                      <div key={lang} className="lang-item"><span className="lang-code">{lang.toUpperCase()}</span><span className="lang-cnt">{cnt} doc{cnt!==1?"s":""}</span></div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* â”€â”€ 2D Viz tab â”€â”€ */}
                      {activeTab === "viz" && (
                        <div className="vizp">
                          <div className="viz-hdr">
                            <div><div className="viz-title2">Semantic Cluster Map</div><div className="viz-sub2">PCA â€” 2D projection of Sentence-BERT embeddings</div></div>
                          </div>
                          {vizData.length > 0 ? (
                            <>
                              <canvas ref={canvasRef} className="viz-canvas" width={640} height={340} />
                              <div className="viz-legend">
                                {insightData.map((ins, idx) => (
                                  <div key={ins.cluster_name} className="viz-li"><div className="viz-ldot" style={{background:VIZ_COLORS[idx%VIZ_COLORS.length]}} />{cap(ins.cluster_name)}</div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="gempty" style={{height:200}}><div className="gempty-icon"><Icon d="M12 12m-3 0a3 3 0 106 0 3 3 0 00-6 0M6 6m-2 0a2 2 0 104 0 2 2 0 00-4 0M18 18m-2 0a2 2 0 104 0 2 2 0 00-4 0" size={15} sw={1.5} /></div><span className="gempty-txt">Run analysis to see visualization</span></div>
                          )}
                        </div>
                      )}

                      {/* â”€â”€ Languages tab â”€â”€ */}
                      {activeTab === "lang" && (
                        <div style={{display:"flex",flexDirection:"column",gap:10}}>
                          {Object.keys(overallLang).length > 0 && (
                            <div className="icard">
                              <div className="icard-lbl">Overall Language Distribution</div>
                              {(() => {
                                const total = Object.values(overallLang).reduce((a,b)=>a+b,0);
                                return (
                                  <div style={{display:"flex",flexDirection:"column",gap:7,marginTop:8}}>
                                    {Object.entries(overallLang).sort((a,b)=>b[1]-a[1]).map(([lang,cnt]) => (
                                      <div key={lang} className="lang-bar-row">
                                        <span style={{fontFamily:"var(--mono)",fontSize:10,fontWeight:700,color:"var(--teal)",width:30}}>{lang.toUpperCase()}</span>
                                        <div className="lang-bar-track"><div className="lang-bar-fill" style={{width:`${(cnt/total)*100}%`}} /></div>
                                        <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--tx3)",width:22,textAlign:"right"}}>{cnt}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          {Object.entries(langDist).map(([cname, dist], idx) => {
                            const col = PALETTE[idx%PALETTE.length];
                            const total = Object.values(dist).reduce((a,b)=>a+b,0);
                            return (
                              <div key={cname} className="icard" style={{borderColor:col.border}}>
                                <div className="icard-lbl" style={{color:col.accent}}>{cap(cname)}</div>
                                <div className="lang-dist">
                                  {Object.entries(dist).map(([lang,cnt]) => (
                                    <div key={lang} className="lang-item"><span className="lang-code">{lang.toUpperCase()}</span><span className="lang-cnt">{cnt} Â· {Math.round(cnt/total*100)}%</span></div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* â”€â”€ Intelligence tab â”€â”€ */}
                      {activeTab === "intel" && (
                        <div>
                          <div className="intel-grid">
                            <div className="intel-action">
                              <div className="intel-action-title">Entity Extraction</div>
                              <div className="intel-action-sub">Extract persons, organizations, locations and dates from all documents.</div>
                              <button className="btn-sm btn-sm-v" onClick={runEntityExtraction} disabled={entityLoading || !clusters}>
                                {entityLoading ? <><div className="spin" style={{width:10,height:10,borderTopColor:"var(--vl)",borderColor:"rgba(167,139,250,0.2)"}} />Runningâ€¦</> : <><Icon d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" size={11} sw={2} />Extract Entities</>}
                              </button>
                            </div>
                            <div className="intel-action">
                              <div className="intel-action-title">Relationship Detection</div>
                              <div className="intel-action-sub">Identify subject-predicate-object triples across document clusters.</div>
                              <button className="btn-sm btn-sm-t" onClick={runRelationshipExtraction} disabled={entityLoading || !clusters}>
                                {entityLoading ? "Runningâ€¦" : <><Icon d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" size={11} sw={2} />Detect Relationships</>}
                              </button>
                            </div>
                            <div className="intel-action">
                              <div className="intel-action-title">Knowledge Graph</div>
                              <div className="intel-action-sub">Build a full knowledge graph connecting entities across your corpus.</div>
                              <button className="btn-sm btn-sm-a" onClick={buildKnowledgeGraph} disabled={entityLoading || !clusters}>
                                {entityLoading ? "Runningâ€¦" : <><Icon d={["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z","M3.27 6.96L12 12.01l8.73-5.05","M12 22.08V12"]} size={11} sw={2} />Build KG</>}
                              </button>
                            </div>
                            <div className="intel-action">
                              <div className="intel-action-title">Export Report</div>
                              <div className="intel-action-sub">Download full intelligence report as JSON for downstream use.</div>
                              <button className="btn-sm btn-sm-g" onClick={dlReport} disabled={!intelligenceRep}><Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" size={11} sw={2} />Download Report</button>
                            </div>
                          </div>

                          {/* â”€â”€ Knowledge Graph Canvas â”€â”€ */}
                          {(knowledgeGraph || entityList.length > 0) && (
                            <div className="icard" style={{marginBottom:12, padding:0, overflow:"hidden"}}>
                              {knowledgeGraph && !knowledgeGraph.error && (
                                <div className="kg-stats-row" style={{padding:"12px 14px 0"}}>
                                  <div className="kg-stat">
                                    <div className="kg-stat-lbl">Nodes</div>
                                    <div className="kg-stat-val" style={{color:"var(--vl)"}}>{knowledgeGraph.stats?.total_nodes ?? knowledgeGraph.nodes?.length ?? "â€”"}</div>
                                  </div>
                                  <div className="kg-stat">
                                    <div className="kg-stat-lbl">Edges</div>
                                    <div className="kg-stat-val" style={{color:"var(--teal)"}}>{knowledgeGraph.stats?.total_edges ?? knowledgeGraph.edges?.length ?? "â€”"}</div>
                                  </div>
                                  <div className="kg-stat">
                                    <div className="kg-stat-lbl">Entities</div>
                                    <div className="kg-stat-val" style={{color:"var(--amber)"}}>{entityList.length}</div>
                                  </div>
                                  <div className="kg-stat">
                                    <div className="kg-stat-lbl">Relations</div>
                                    <div className="kg-stat-val" style={{color:"var(--green)"}}>{relationshipList.length}</div>
                                  </div>
                                </div>
                              )}
                              <div style={{padding:"10px 14px 0"}}>
                                <div className="icard-lbl">Interactive Knowledge Graph</div>
                              </div>
                              <KnowledgeGraph entities={entityList} relationships={relationshipList} />
                            </div>
                          )}

                          {/* Entity chips */}
                          {entities && (
                            <div className="entity-box">
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                                <div className="icard-lbl" style={{marginBottom:0}}>Extracted Entities</div>
                                {entities.total !== undefined && <span className="pill pill-v" style={{fontSize:9}}>{entities.total} total</span>}
                              </div>
                              {entities.error ? (
                                <div className="err-box" style={{marginTop:0}}><div className="edot"/>{entities.error}</div>
                              ) : (() => {
                                const ents = entities.entities || (Array.isArray(entities) ? entities : []);
                                const typeMap = {};
                                ents.forEach(e => {
                                  const name    = e.name || e.text || e.entity || JSON.stringify(e);
                                  const rawType = (e.type || e.label || "other").toLowerCase();
                                  const bucket  = rawType.includes("person")||rawType==="per"?"PERSON":rawType.includes("org")?"ORG":rawType.includes("loc")||rawType==="gpe"?"LOC":rawType.includes("date")||rawType.includes("time")?"DATE":rawType.includes("tech")||rawType.includes("product")?"TECH":"OTHER";
                                  (typeMap[bucket] = typeMap[bucket] || []).push(name);
                                });
                                if (!Object.keys(typeMap).length) return <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--tx3)"}}>No entities found. Ensure workspace_id is set and process was triggered.</div>;
                                const chipClass = { PERSON:"ec-person", ORG:"ec-org", LOC:"ec-loc", DATE:"ec-date", TECH:"ec-tech", OTHER:"ec-other" };
                                return Object.entries(typeMap).map(([type, items]) => (
                                  <div key={type} className="entity-type">
                                    <div className="entity-type-lbl">{type}</div>
                                    <div className="entity-chips">
                                      {[...new Set(items)].slice(0,20).map(ent => (
                                        <span key={ent} className={`entity-chip ${chipClass[type]||"ec-other"}`}>{ent}</span>
                                      ))}
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          )}

                          {/* Relationship list */}
                          {relationships && (
                            <div className="rel-box">
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                                <div className="icard-lbl" style={{marginBottom:0}}>Detected Relationships</div>
                                {relationships.total !== undefined && <span className="pill pill-t" style={{fontSize:9}}>{relationships.total} total</span>}
                              </div>
                              {relationships.error ? (
                                <div className="err-box" style={{marginTop:0}}><div className="edot"/>{relationships.error}</div>
                              ) : (() => {
                                const rels = relationships.relationships || (Array.isArray(relationships) ? relationships : []);
                                if (!rels.length) return <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--tx3)"}}>No relationships found yet.</div>;
                                return rels.slice(0,15).map((rel,i) => (
                                  <div key={i} className="rel-item">
                                    <span className="rel-subj">{rel.subject||rel.source||"?"}</span>
                                    <span className="rel-pred">{rel.relationship||rel.predicate||"â†’"}</span>
                                    <span className="rel-obj">{rel.object||"?"}</span>
                                    {rel.confidence!==undefined && <span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:8.5,color:"var(--tx3)"}}>{(rel.confidence*100).toFixed(0)}%</span>}
                                  </div>
                                ));
                              })()}
                            </div>
                          )}

                          {!entities && !relationships && !knowledgeGraph && (
                            <div className="intel-empty">
                              <div className="intel-empty-icon"><Icon d={["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"]} size={20} sw={1.5} stroke="rgba(255,255,255,0.14)" /></div>
                              <div className="intel-empty-txt">Run entity extraction, relationship detection, or build a knowledge graph using the buttons above.<br />Requires documents to be processed first.</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* â”€â”€ Chat tab â”€â”€ */}
                      {activeTab === "chat" && (
                        <div className="rag-wrap">
                          <div className="rag-hdr">
                            <div className="rag-hdr-ico"><Icon d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" size={13} stroke="var(--green)" sw={2} /></div>
                            <div className="rag-hdr-info">
                              <div className="rag-hdr-title">Document Chat</div>
                              <div className="rag-hdr-sub">{ragReady ? "RAG index ready â€” semantic search + LLM generation" : "Upload and process documents to enable chat"}</div>
                            </div>
                            <div className={`rag-dot${ragReady ? " rdy" : ""}`} />
                          </div>
                          {ragReady && clusters && (
                            <div className="rag-ctrl">
                              <span className="rag-cl">Scope</span>
                              <select className="rag-sel" value={chatFilter} onChange={e => setChatFilter(e.target.value)}>
                                <option value="">All clusters</option>
                                {Object.keys(clusters).map(n => <option key={n} value={n}>{cap(n)}</option>)}
                              </select>
                              <div className="rag-topk">
                                <span className="rag-cl">Top-K</span>
                                <button className="rag-kb" onClick={() => setChatTopK(k => Math.max(1,k-1))}>âˆ’</button>
                                <span className="rag-kv">{chatTopK}</span>
                                <button className="rag-kb" onClick={() => setChatTopK(k => Math.min(12,k+1))}>+</button>
                              </div>
                            </div>
                          )}
                          {ragReady ? (
                            <div className="rag-msgs">
                              {chatMessages.length === 0 ? (
                                <div className="rag-empty2">
                                  <div className="rag-empty-ico"><Icon d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" size={21} stroke="rgba(34,211,160,0.35)" sw={1.5} /></div>
                                  <div className="rag-ep-t">Ask your documents</div>
                                  <div className="rag-ep-s">Powered by semantic retrieval across all your uploaded files.</div>
                                  <div className="rag-prompts">
                                    {["What are the key risks discussed?","Summarize main themes across all files","What conclusions are drawn in these documents?","Compare sentiment across clusters"].map(p => (
                                      <button key={p} className="rag-prompt" onClick={() => { setChatInput(p); chatInputRef.current?.focus(); }}>{p}</button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {chatMessages.map((msg, i) => (
                                    <div key={i} className={`rag-msg ${msg.role}`}>
                                      <div className={`rag-av ${msg.role==="assistant"?"ai":"usr"}`}>{msg.role==="assistant"?"AI":"U"}</div>
                                      <div className="rag-bw">
                                        <div className={`rag-bubble ${msg.role==="assistant"?`ai${msg.isWelcome?" wel":""}` : "usr"}`}>{renderMsg(msg.content)}</div>
                                        {msg.role==="assistant" && msg.sources?.length > 0 && (
                                          <>
                                            <button className={`src-toggle${expandedSources[i]?" open":""}`} onClick={() => setExpandedSources(p=>({...p,[i]:!p[i]}))}>
                                              <Icon d="M6 9l6 6 6-6" size={10} sw={2} />{expandedSources[i]?"Hide":"Show"} {msg.sources.length} source{msg.sources.length!==1?"s":""}
                                              {msg.cluster_scope && <span style={{opacity:0.55}}> Â· {cap(msg.cluster_scope)}</span>}
                                            </button>
                                            {expandedSources[i] && (
                                              <div className="rag-sources">
                                                {msg.sources.map((src,si) => (
                                                  <div key={si} className="rag-src">
                                                    <span className="rag-src-rank">#{si+1}</span>
                                                    <div className="rag-src-body">
                                                      <div className="rag-src-file">{src.filename}</div>
                                                      <div className="rag-src-meta">{cap(src.cluster_name)} Â· {src.language?.toUpperCase()}</div>
                                                      <div className="rag-src-exc">{src.excerpt}</div>
                                                    </div>
                                                    <span className="rag-src-sim">{(src.similarity*100).toFixed(0)}%</span>
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
                                      <div className="rag-av ai">AI</div>
                                      <div className="rag-typing"><span /><span /><span /></div>
                                    </div>
                                  )}
                                  <div ref={chatEndRef} />
                                </>
                              )}
                            </div>
                          ) : (
                            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:9,padding:22}}>
                              <div style={{width:46,height:46,borderRadius:13,background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <Icon d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" size={21} stroke="rgba(255,255,255,0.16)" sw={1.5} />
                              </div>
                              <div style={{fontFamily:"var(--display)",fontSize:14,fontWeight:700,color:"var(--tx2)"}}>RAG Index Not Ready</div>
                              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--tx3)",textAlign:"center",lineHeight:1.7}}>Upload and run the intelligence pipeline first.<br />The RAG index is built automatically after processing.</div>
                            </div>
                          )}
                          {chatError && <div className="rag-err"><div className="edot" />{chatError}</div>}
                          {ragReady && (
                            <div className="rag-ia">
                              <div className="rag-irow">
                                <textarea ref={chatInputRef} className="rag-ta" rows={1} placeholder="Ask anything about your documentsâ€¦" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();} }} disabled={chatLoading} />
                                <button className="rag-send" onClick={sendChat} disabled={chatLoading||!chatInput.trim()}>
                                  {chatLoading ? <div className="spin" style={{borderTopColor:"var(--green)",borderColor:"rgba(34,211,160,0.2)"}} /> : <Icon d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" size={14} sw={2} />}
                                </button>
                              </div>
                              <div className="rag-hint">Enter to send Â· Shift+Enter for newline Â· Sources expand below each response</div>
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

        {/* â”€â”€ Document modal â”€â”€ */}
        {modalFile && (
          <div className="modal-bg">
            <div className="modal">
              <div className="modal-bar">
                <button className="modal-back" onClick={closeModal}><Icon d="M19 12H5M12 19l-7-7 7-7" size={12} sw={2} /> Back</button>
                <div className="modal-info">
                  <div className="modal-name">Document Preview</div>
                  <div className="modal-path">{activeFileName}{activeFileName&&getLangTag(activeFileName)?` Â· ${getLangTag(activeFileName)}`:""}</div>
                </div>
                <div className="modal-acts">
                  {activeFileName && <button className="btn-sm btn-sm-v" onClick={e=>dlOrig(e,activeFileName)}><Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" size={10} sw={2} />Original</button>}
                  {activeFileName&&hasTrans(activeFileName) && <button className="btn-sm btn-sm-t" onClick={e=>dlTrans(e,activeFileName)}><Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" size={10} sw={2} />Translated</button>}
                  {activeFileName&&hasTrans(activeFileName) && (
                    <div className="modal-sw">
                      <button className={`sw-btn${!viewingTranslated?" sw-og":""}`} onClick={() => {setViewingTranslated(false);setModalFile(`${BASE}/files/${activeFileName}`);}}>Original</button>
                      <button className={`sw-btn${viewingTranslated?" sw-tr":""}`} onClick={() => {setViewingTranslated(true);setModalFile(`${BASE}/translated/${translatedFiles[activeFileName]}`);}}>Translated</button>
                    </div>
                  )}
                </div>
              </div>
              {viewingTranslated && (
                <div className="modal-tr-bar">
                  <div className="tr-dot" />
                  <span className="tr-txt">Viewing translated version Â· Google Translate â†’ English{activeFileName&&getLangTag(activeFileName)?` Â· ${getLangTag(activeFileName)}`:""}</span>
                </div>
              )}
              <div style={{flex:1,overflow:"hidden"}}>
                <iframe src={modalFile} className="modal-frame" title="File Preview" />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

