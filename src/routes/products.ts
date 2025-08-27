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

// Public routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/trending', getTrendingProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProduct);

// Admin routes (protected)
router.post('/', authenticateAdmin, createProduct);
router.put('/:id', authenticateAdmin, updateProduct);
router.delete('/:id', authenticateAdmin, deleteProduct);
router.post('/bulk-update', authenticateAdmin, bulkUpdateProducts);
router.patch('/:id/stock', authenticateAdmin, updateStock);
router.get('/admin/stats', authenticateAdmin, getProductStats);
router.get('/stats/overview', authenticateAdmin, getProductStats);

export default router;