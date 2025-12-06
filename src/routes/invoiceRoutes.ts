import express from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getOrderInvoices,
  getInvoice,
  generateInvoice,
  sendInvoiceWhatsApp,
  sendInvoiceEmail,
  downloadInvoicePDF
} from '../controllers/invoiceController';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get invoices for an order
router.get('/order/:orderId', getOrderInvoices);

// Generate invoice
router.post('/generate', authorize('super_admin', 'admin'), generateInvoice);

// Get single invoice
router.get('/:id', getInvoice);

// Download invoice as PDF
router.get('/:id/pdf', downloadInvoicePDF);

// Send invoice via WhatsApp
router.post('/:id/send-whatsapp', sendInvoiceWhatsApp);

// Send invoice via Email
router.post('/:id/send-email', sendInvoiceEmail);

export default router;
