import { create } from 'zustand';

interface WorkspaceState {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  
  // Pipeline running state
  isPipelineRunning: boolean;
  setPipelineRunning: (isRunning: boolean) => void;

  // Analysis State
  selectedClusterId: string | null;
  setSelectedClusterId: (id: string | null) => void;
  
  // Scoped chat
  chatScope: string | null;  // null = 'All clusters', string = specific cluster name
  setChatScope: (scope: string | null) => void;
  
  // Entire pipeline cluster results
  clusterData: any | null;
  setClusterData: (data: any | null) => void;
}

export const useStore = create<WorkspaceState>()((set) => ({
  activeWorkspaceId: null,
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
  
  isPipelineRunning: false,
  setPipelineRunning: (isRunning) => set({ isPipelineRunning: isRunning }),

  selectedClusterId: null,
  setSelectedClusterId: (id) => set({ selectedClusterId: id }),

  chatScope: null,
  setChatScope: (scope) => set({ chatScope: scope }),

  clusterData: null,
  setClusterData: (data) => set({ clusterData: data }),
}));
