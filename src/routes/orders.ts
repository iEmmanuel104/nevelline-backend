import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  getCustomerOrders
} from '../controllers/orderController';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/', createOrder);
router.get('/order/:id', getOrder); // Public order lookup by order number
router.get('/customer/:email', getCustomerOrders); // Customer order history
router.patch('/cancel/:id', cancelOrder); // Customer can cancel their own order

// Admin routes (protected)
router.get('/', authenticateAdmin, getOrders);
router.get('/:id', authenticateAdmin, getOrder);
router.patch('/:id/status', authenticateAdmin, updateOrderStatus);
router.patch('/admin/cancel/:id', authenticateAdmin, cancelOrder);
router.get('/admin/stats', authenticateAdmin, getOrderStats);

export default router;