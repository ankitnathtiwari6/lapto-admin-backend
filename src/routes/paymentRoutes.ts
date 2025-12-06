import express from 'express';
import {
  getAllPayments,
  getPayment,
  getInvoicePayments,
  getOrderPayments,
  recordPayment,
  updatePayment,
  deletePayment,
  getPaymentStats
} from '../controllers/paymentController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Protect all routes
router.use(protect);

// Get all payments with filters
router.get('/', getAllPayments);

// Get payment statistics
router.get('/stats', getPaymentStats);

// Get payments for an invoice
router.get('/invoice/:invoiceId', getInvoicePayments);

// Get payments for an order
router.get('/order/:orderId', getOrderPayments);

// Get single payment
router.get('/:id', getPayment);

// Record a new payment (admin, manager, cashier)
router.post('/', authorize('admin', 'manager', 'cashier'), recordPayment);

// Update payment (admin, manager)
router.put('/:id', authorize('admin', 'manager'), updatePayment);

// Delete payment (admin only)
router.delete('/:id', authorize('admin'), deletePayment);

export default router;
