import { Router } from 'express';
import {
  getOrderActivityLogs,
  getCompanyActivityLogs,
  getSubTaskActivityLogs
} from '../controllers/activityLogController';
import { protect } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// Get activity logs for a specific order
router.get('/order/:orderId', getOrderActivityLogs);

// Get activity logs for a company
router.get('/company', getCompanyActivityLogs);

// Get activity logs for a specific subtask
router.get('/subtask/:subTaskId', getSubTaskActivityLogs);

export default router;
