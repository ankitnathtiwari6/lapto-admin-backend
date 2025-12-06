import express from 'express';
import {
  getSalesSummary,
  getPurchasesSummary,
  getGSTR1Data,
  getGSTR3BData,
  getProfitLoss,
  getBalanceSheet,
  getMonthlyTrends
} from '../controllers/accountingController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// All accounting routes require authentication
router.use(protect);

// Only admin and managers can access accounting reports
router.use(authorize('admin', 'super_admin'));

// Sales and Purchases Summary
router.get('/sales-summary', getSalesSummary);
router.get('/purchases-summary', getPurchasesSummary);

// GST Reports
router.get('/gstr1', getGSTR1Data);
router.get('/gstr3b', getGSTR3BData);

// Financial Reports
router.get('/profit-loss', getProfitLoss);
router.get('/balance-sheet', getBalanceSheet);
router.get('/monthly-trends', getMonthlyTrends);

export default router;
