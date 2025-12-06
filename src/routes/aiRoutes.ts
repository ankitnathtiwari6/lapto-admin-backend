import { Router } from 'express';
import { generateOrderFromJobDetails } from '../controllers/aiController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/generate-order', authorize('admin', 'super_admin'), generateOrderFromJobDetails);

export default router;
