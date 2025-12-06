import express from 'express';
import {
  getStages,
  getStageById,
  createStage,
  updateStage,
  deleteStage,
  seedStages
} from '../controllers/stageController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Public routes (for fetching stages)
router.get('/', protect, getStages);
router.get('/:id', protect, getStageById);

// Admin only routes
router.post('/', protect, authorize('super_admin', 'admin'), createStage);
router.put('/:id', protect, authorize('super_admin', 'admin'), updateStage);
router.delete('/:id', protect, authorize('super_admin'), deleteStage);
router.post('/seed', protect, authorize('super_admin'), seedStages);

export default router;
