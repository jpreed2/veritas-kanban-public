import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api';

export interface ConflictStatus {
  hasConflicts: boolean;
  conflictingFiles: string[];
  rebaseInProgress: boolean;
  mergeInProgress: boolean;
}

export interface ConflictMarker {
  startLine: number;
  separatorLine: number;
  endLine: number;
  oursLines: string[];
  theirsLines: string[];
}

export interface ConflictFile {
  path: string;
  content: string;
  oursContent: string;
  theirsContent: string;
  baseContent: string;
  markers: ConflictMarker[];
}

export interface ResolveResult {
  success: boolean;
  remainingConflicts: string[];
}

/**
 * Get conflict status for a task
 */
export function useConflictStatus(taskId: string | undefined) {
  return useQuery<ConflictStatus>({
    queryKey: ['conflicts', taskId],
    queryFn: async () => {
      if (!taskId) return { hasConflicts: false, conflictingFiles: [], rebaseInProgress: false, mergeInProgress: false };
      const response = await fetch(`${API_BASE}/conflicts/${taskId}`);
      if (!response.ok) {
        throw new Error('Failed to get conflict status');
      }
      return response.json();
    },
    enabled: !!taskId,
    refetchInterval: (query) => {
      // Poll when there are conflicts
      if (query.state.data?.hasConflicts) {
        return 5000;
      }
      return false;
    },
  });
}

/**
 * Get conflict details for a specific file
 */
export function useFileConflict(taskId: string | undefined, filePath: string | undefined) {
  return useQuery<ConflictFile>({
    queryKey: ['conflicts', taskId, 'file', filePath],
    queryFn: async () => {
      if (!taskId || !filePath) throw new Error('Task ID and file path required');
      const response = await fetch(`${API_BASE}/conflicts/${taskId}/file?path=${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        throw new Error('Failed to get file conflict');
      }
      return response.json();
    },
    enabled: !!taskId && !!filePath,
  });
}

/**
 * Resolve a file conflict
 */
export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation<ResolveResult, Error, {
    taskId: string;
    filePath: string;
    resolution: 'ours' | 'theirs' | 'manual';
    manualContent?: string;
  }>({
    mutationFn: async ({ taskId, filePath, resolution, manualContent }) => {
      const response = await fetch(`${API_BASE}/conflicts/${taskId}/resolve?path=${encodeURIComponent(filePath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, manualContent }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resolve conflict');
      }
      
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conflicts', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['conflicts', variables.taskId, 'file'] });
    },
  });
}

/**
 * Abort rebase or merge
 */
export function useAbortConflict() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (taskId) => {
      const response = await fetch(`${API_BASE}/conflicts/${taskId}/abort`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to abort');
      }
      
      return response.json();
    },
    onSuccess: (_data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['conflicts', taskId] });
      queryClient.invalidateQueries({ queryKey: ['worktree', taskId] });
    },
  });
}

/**
 * Continue rebase or merge after resolving conflicts
 */
export function useContinueConflict() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; error?: string }, Error, { taskId: string; message?: string }>({
    mutationFn: async ({ taskId, message }) => {
      const response = await fetch(`${API_BASE}/conflicts/${taskId}/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to continue');
      }
      
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conflicts', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['worktree', variables.taskId] });
    },
  });
}
