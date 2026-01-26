import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api';

export interface PreviewServer {
  taskId: string;
  repoName: string;
  pid: number;
  port: number;
  url: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  startedAt: string;
  output: string[];
  error?: string;
}

/**
 * Get preview status for a task
 */
export function usePreviewStatus(taskId: string | undefined) {
  return useQuery<PreviewServer | { status: 'stopped' }>({
    queryKey: ['preview', taskId],
    queryFn: async () => {
      if (!taskId) return { status: 'stopped' as const };
      const response = await fetch(`${API_BASE}/preview/${taskId}`);
      if (!response.ok) {
        throw new Error('Failed to get preview status');
      }
      return response.json();
    },
    enabled: !!taskId,
    refetchInterval: (data) => {
      // Poll more frequently when starting
      if (data && 'status' in data && data.status === 'starting') {
        return 1000;
      }
      // Poll every 5s when running
      if (data && 'status' in data && data.status === 'running') {
        return 5000;
      }
      return false;
    },
  });
}

/**
 * Get preview output
 */
export function usePreviewOutput(taskId: string | undefined, lines: number = 50) {
  return useQuery<{ output: string[] }>({
    queryKey: ['preview', taskId, 'output', lines],
    queryFn: async () => {
      if (!taskId) return { output: [] };
      const response = await fetch(`${API_BASE}/preview/${taskId}/output?lines=${lines}`);
      if (!response.ok) {
        throw new Error('Failed to get preview output');
      }
      return response.json();
    },
    enabled: !!taskId,
    refetchInterval: 2000, // Poll every 2s for output
  });
}

/**
 * Start preview server
 */
export function useStartPreview() {
  const queryClient = useQueryClient();

  return useMutation<PreviewServer, Error, string>({
    mutationFn: async (taskId) => {
      const response = await fetch(`${API_BASE}/preview/${taskId}/start`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start preview');
      }
      
      return response.json();
    },
    onSuccess: (_data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['preview', taskId] });
    },
  });
}

/**
 * Stop preview server
 */
export function useStopPreview() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (taskId) => {
      const response = await fetch(`${API_BASE}/preview/${taskId}/stop`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to stop preview');
      }
    },
    onSuccess: (_data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['preview', taskId] });
    },
  });
}
