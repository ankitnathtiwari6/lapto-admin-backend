import { Router } from 'express';
import {
  createServiceType,
  getAllServiceTypes,
  getServiceTypeById,
  updateServiceType,
  deleteServiceType,
  seedServiceTypes,
  searchServiceTypes
} from '../controllers/serviceTypeController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
  .get(getAllServiceTypes)
  .post(authorize('admin', 'super_admin'), createServiceType);

router.get('/search', searchServiceTypes);

router.route('/:id')
  .get(getServiceTypeById)
  .put(authorize('admin', 'super_admin'), updateServiceType)
  .delete(authorize('admin', 'super_admin'), deleteServiceType);

router.post('/seed', authorize('super_admin'), seedServiceTypes);

export default router;
