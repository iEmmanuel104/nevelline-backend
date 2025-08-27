import { Router } from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  updateProductCounts
} from '../controllers/categoryController';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getCategories);
router.get('/:slug', getCategory);

// Admin routes (protected)
router.post('/', authenticateAdmin, createCategory);
router.put('/:id', authenticateAdmin, updateCategory);
router.delete('/:id', authenticateAdmin, deleteCategory);
router.patch('/reorder', authenticateAdmin, reorderCategories);
router.patch('/update-counts', authenticateAdmin, updateProductCounts);

export default router;