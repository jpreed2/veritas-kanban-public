import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/helpers';

export interface TaskCounts {
  backlog: number;
  todo: number;
  'in-progress': number;
  blocked: number;
  done: number;
  archived: number;
}

/**
 * Hook to fetch total task counts by status (no time filtering)
 *
 * This is used by the sidebar to show accurate counts across ALL tasks,
 * not just recently updated ones. Refreshes every 30 seconds and invalidates
 * when task mutations occur.
 */
export function useTaskCounts() {
  return useQuery<TaskCounts>({
    queryKey: ['task-counts'],
    queryFn: () => apiFetch<TaskCounts>('/api/tasks/counts'),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}
