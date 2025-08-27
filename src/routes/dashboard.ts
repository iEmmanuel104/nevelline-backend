import { Router } from 'express';
import {
  getDashboardStats,
  getRecentActivity,
  getSalesAnalytics,
  getCustomerAnalytics,
  getInventoryAlerts
} from '../controllers/dashboardController';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// All dashboard routes require admin authentication
router.get('/stats', authenticateAdmin, getDashboardStats);
router.get('/activity', authenticateAdmin, getRecentActivity);
router.get('/sales-analytics', authenticateAdmin, getSalesAnalytics);
router.get('/customer-analytics', authenticateAdmin, getCustomerAnalytics);
router.get('/inventory-alerts', authenticateAdmin, getInventoryAlerts);

export default router;