import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { ConflictService } from '../services/conflict-service.js';

const router: RouterType = Router();
const conflictService = new ConflictService();

// Validation schemas
const resolveSchema = z.object({
  resolution: z.enum(['ours', 'theirs', 'manual']),
  manualContent: z.string().optional(),
});

// GET /api/conflicts/:taskId - Get conflict status for a task
router.get('/:taskId', async (req, res) => {
  try {
    const status = await conflictService.getConflictStatus(req.params.taskId);
    res.json(status);
  } catch (error: any) {
    console.error('Error getting conflict status:', error);
    res.status(500).json({ error: error.message || 'Failed to get conflict status' });
  }
});

// GET /api/conflicts/:taskId/file - Get conflict details for a specific file
router.get('/:taskId/file', async (req, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    const conflict = await conflictService.getFileConflict(req.params.taskId, filePath);
    res.json(conflict);
  } catch (error: any) {
    console.error('Error getting file conflict:', error);
    res.status(500).json({ error: error.message || 'Failed to get file conflict' });
  }
});

// POST /api/conflicts/:taskId/resolve - Resolve a file conflict
router.post('/:taskId/resolve', async (req, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    const input = resolveSchema.parse(req.body);
    const result = await conflictService.resolveFile(
      req.params.taskId,
      filePath,
      input.resolution,
      input.manualContent
    );
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error resolving conflict:', error);
    res.status(500).json({ error: error.message || 'Failed to resolve conflict' });
  }
});

// POST /api/conflicts/:taskId/abort - Abort rebase or merge
router.post('/:taskId/abort', async (req, res) => {
  try {
    const status = await conflictService.getConflictStatus(req.params.taskId);
    
    if (status.rebaseInProgress) {
      await conflictService.abortRebase(req.params.taskId);
    } else if (status.mergeInProgress) {
      await conflictService.abortMerge(req.params.taskId);
    } else {
      return res.status(400).json({ error: 'No rebase or merge in progress' });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error aborting:', error);
    res.status(500).json({ error: error.message || 'Failed to abort' });
  }
});

// POST /api/conflicts/:taskId/continue - Continue rebase or merge
router.post('/:taskId/continue', async (req, res) => {
  try {
    const status = await conflictService.getConflictStatus(req.params.taskId);
    
    let result;
    if (status.rebaseInProgress) {
      result = await conflictService.continueRebase(req.params.taskId);
    } else if (status.mergeInProgress) {
      result = await conflictService.continueMerge(req.params.taskId, req.body.message);
    } else {
      return res.status(400).json({ error: 'No rebase or merge in progress' });
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('Error continuing:', error);
    res.status(500).json({ error: error.message || 'Failed to continue' });
  }
});

export default router;
