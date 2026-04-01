import axios from 'axios';

// Base API instance pointed to the FastAPI backend running locally
export const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const Endpoints = {
  uploadFiles: '/upload',
  processPipeline: '/process',
  
  createWorkspace: '/workspace/create',
  listWorkspaces: '/workspace/list',
  getWorkspace: (id: string) => `/workspace/${id}`,
  deleteWorkspace: (id: string) => `/workspace/${id}`,
  deleteAllWorkspaces: '/workspace/all',
  connectDrive: (id: string) => `/workspace/${id}/connect-drive`,
  driveStatus: (id: string) => `/workspace/${id}/drive-status`,
  
  getEntities: (id: string) => `/workspace/${id}/entities`,
  refreshEntities: (id: string) => `/workspace/${id}/entities/refresh`,
  
  getRelationships: (id: string) => `/workspace/${id}/relationships`,
  getKnowledgeGraph: (id: string) => `/workspace/${id}/knowledge-graph`,
  
  getEntityConnections: (id: string, name: string) => `/workspace/${id}/entity/${encodeURIComponent(name)}/connections`,
  searchEntities: (id: string) => `/workspace/${id}/entities/search`,
  
  ragChat: '/rag/chat',
  ragStatus: '/rag/status',
  ragClusters: '/rag/clusters',
  ragHistory: (id: string) => `/rag/history/${id}`,
  ragGenerate: '/rag/generate',
  enrichedChatContext: (id: string) => `/workspace/${id}/chat/context`,
  
  workspaceStats: (id: string) => `/workspace/${id}/stats`,

  // ── Drive & Automated Ingestion ────────────────────────────────
  driveAuthUrl: '/auth/google',
  driveAuthCallback: '/auth/google/callback',
  driveConnectionStatus: '/drive/status',
  driveListFolders: '/drive/folders',
  driveMapFolder: '/drive/map-folder',
  driveMappings: '/drive/mappings',
  driveMappingDelete: (folderId: string) => `/drive/mappings/${folderId}`,
  driveSync: '/drive/sync',
  driveDisconnect: '/drive/disconnect',
  ingestStats: '/ingest/stats',
};

// Types for responses can be placed here or in a separate types.ts
