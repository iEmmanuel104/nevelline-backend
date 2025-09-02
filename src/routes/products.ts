import { Router } from 'express';
import {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getTrendingProducts,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateProducts,
  updateStock,
  getProductStats
} from '../controllers/productController';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// Public routes - Specific routes must come before parameterized routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/trending', getTrendingProducts);
router.get('/stats/overview', getProductStats); // Public stats for dashboard - must come before /:id
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProduct);

// Admin routes (protected)
router.post('/', authenticateAdmin, createProduct);
router.put('/:id', authenticateAdmin, updateProduct);
router.delete('/:id', authenticateAdmin, deleteProduct);
router.post('/bulk-update', authenticateAdmin, bulkUpdateProducts);
router.patch('/:id/stock', authenticateAdmin, updateStock);
router.get('/admin/stats', authenticateAdmin, getProductStats);

export default router;