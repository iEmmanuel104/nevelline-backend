import { Router } from 'express';
import {
  generatePaymentLink,
  verifyPaymentTransaction,
  handlePaystackWebhook,
  getTransactionDetails,
  getTransactionsList,
  getPaymentLinks,
  updatePaymentLinkStatus,
  deletePaymentLink,
  trackPaymentLinkView
} from '../controllers/paymentController';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/verify/:reference', verifyPaymentTransaction);
router.post('/webhook/paystack', handlePaystackWebhook);
router.post('/link/track/:reference', trackPaymentLinkView); // Track payment link views

// Admin routes (protected)
router.post('/generate-link', authenticateAdmin, generatePaymentLink);
router.get('/links', authenticateAdmin, getPaymentLinks);
router.patch('/links/:reference/status', authenticateAdmin, updatePaymentLinkStatus);
router.delete('/links/:reference', authenticateAdmin, deletePaymentLink);
router.get('/transaction/:transactionId', authenticateAdmin, getTransactionDetails);
router.get('/transactions', authenticateAdmin, getTransactionsList);

export default router;