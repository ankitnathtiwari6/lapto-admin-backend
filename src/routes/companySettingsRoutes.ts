import express from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getCompanySettings,
  upsertCompanySettings
} from '../controllers/companySettingsController';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get company settings (all authenticated users can view)
router.get('/', getCompanySettings);

// Create or update company settings (only admins)
router.post('/', authorize('super_admin', 'admin'), upsertCompanySettings);

export default router;
