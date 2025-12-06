import { Router } from 'express';
import { getDashboardAnalytics, getRecentActivities } from '../controllers/dashboardController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/analytics', authorize('admin', 'super_admin'), getDashboardAnalytics);
router.get('/activities', authorize('admin', 'super_admin'), getRecentActivities);

export default router;
