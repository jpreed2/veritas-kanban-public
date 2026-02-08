import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// Mock fs.mkdir to prevent actual directory creation in tests
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    mkdir: vi.fn().mockResolvedValue(undefined),
  };
});

describe('paths: Docker DATA_DIR support', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('uses DATA_DIR as storage root for tasks and runtime state', async () => {
    process.env.DATA_DIR = '/app/data';

    vi.spyOn(process, 'cwd').mockReturnValue('/app/server');

    const paths = await import('../utils/paths.js');

    expect(paths.getTasksActiveDir()).toBe('/app/data/tasks/active');
    expect(paths.getTasksArchiveDir()).toBe('/app/data/tasks/archive');
    expect(paths.getRuntimeDir()).toBe('/app/data/.veritas-kanban');
  });

  it('TaskService defaults to DATA_DIR-backed task directories when set', async () => {
    process.env.DATA_DIR = '/app/data';

    vi.spyOn(process, 'cwd').mockReturnValue('/app/server');

    const { TaskService } = await import('../services/task-service.js');
    const svc = new TaskService();

    // Private fields — ok for regression test
    expect((svc as any).tasksDir).toBe('/app/data/tasks/active');
    expect((svc as any).archiveDir).toBe('/app/data/tasks/archive');
  });
});
