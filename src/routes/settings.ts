import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getSettingSection,
  updateSettingSection
} from '../controllers/settingsController';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getSettings);
router.get('/:section', getSettingSection);

// Admin routes (protected)
router.put('/', authenticateAdmin, updateSettings);
router.put('/:section', authenticateAdmin, updateSettingSection);

export default router;