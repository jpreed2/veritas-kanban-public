import { Router, type Router as RouterType } from 'express';
import { PreviewService } from '../services/preview-service.js';

const router: RouterType = Router();
const previewService = new PreviewService();

// GET /api/preview - List all running previews
router.get('/', async (_req, res) => {
  try {
    const previews = previewService.getAllPreviews();
    res.json(previews);
  } catch (error) {
    console.error('Error listing previews:', error);
    res.status(500).json({ error: 'Failed to list previews' });
  }
});

// GET /api/preview/:taskId - Get preview status for a task
router.get('/:taskId', async (req, res) => {
  try {
    const status = previewService.getPreviewStatus(req.params.taskId);
    if (!status) {
      return res.json({ status: 'stopped' });
    }
    res.json(status);
  } catch (error) {
    console.error('Error getting preview status:', error);
    res.status(500).json({ error: 'Failed to get preview status' });
  }
});

// GET /api/preview/:taskId/output - Get preview server output
router.get('/:taskId/output', async (req, res) => {
  try {
    const lines = parseInt(req.query.lines as string) || 50;
    const output = previewService.getPreviewOutput(req.params.taskId, lines);
    res.json({ output });
  } catch (error) {
    console.error('Error getting preview output:', error);
    res.status(500).json({ error: 'Failed to get preview output' });
  }
});

// POST /api/preview/:taskId/start - Start preview for a task
router.post('/:taskId/start', async (req, res) => {
  try {
    const preview = await previewService.startPreview(req.params.taskId);
    res.status(201).json(preview);
  } catch (error: any) {
    console.error('Error starting preview:', error);
    res.status(500).json({ error: error.message || 'Failed to start preview' });
  }
});

// POST /api/preview/:taskId/stop - Stop preview for a task
router.post('/:taskId/stop', async (req, res) => {
  try {
    await previewService.stopPreview(req.params.taskId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error stopping preview:', error);
    res.status(500).json({ error: error.message || 'Failed to stop preview' });
  }
});

export default router;
