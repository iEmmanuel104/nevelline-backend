import { Router } from 'express';
import {
  getCloudinaryConfig,
  deleteImageFromCloud,
  getImageInfo
} from '../controllers/uploadController';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// Admin routes (protected)
router.get('/config', authenticateAdmin, getCloudinaryConfig);
router.delete('/image', authenticateAdmin, deleteImageFromCloud);
router.get('/image/:public_id', authenticateAdmin, getImageInfo);

export default router;