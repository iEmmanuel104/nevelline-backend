import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth';
import {
  getCustomers,
  exportCustomers,
  getCustomerByEmail
} from '../controllers/customerController';

const router = Router();

// All customer routes require admin authentication
router.use(authenticateAdmin);

// Get customers with analytics
router.get('/', getCustomers);

// Export customers as CSV
router.get('/export', exportCustomers);

// Get customer details by email
router.get('/:email', getCustomerByEmail);

export default router;