import { Router } from 'express';
import {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getEngineers,
  getStaffWithStats,
  getStaffOrders
} from '../controllers/staffController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/engineers', getEngineers);
router.get('/with-stats', authorize('admin', 'super_admin'), getStaffWithStats);
router.get('/:id/orders', authorize('admin', 'super_admin'), getStaffOrders);

router.route('/')
  .get(authorize('admin', 'super_admin'), getAllStaff)
  .post(authorize('admin', 'super_admin'), createStaff);

router.route('/:id')
  .get(authorize('admin', 'super_admin'), getStaffById)
  .put(authorize('admin', 'super_admin'), updateStaff)
  .delete(authorize('admin', 'super_admin'), deleteStaff);

export default router;
