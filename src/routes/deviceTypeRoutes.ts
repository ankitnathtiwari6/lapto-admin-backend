import { Router } from 'express';
import {
  createDeviceType,
  getAllDeviceTypes,
  getDeviceTypeById,
  updateDeviceType,
  deleteDeviceType,
  seedDeviceTypes
} from '../controllers/deviceTypeController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
  .get(getAllDeviceTypes)
  .post(authorize('admin', 'super_admin'), createDeviceType);

router.route('/:id')
  .get(getDeviceTypeById)
  .put(authorize('admin', 'super_admin'), updateDeviceType)
  .delete(authorize('admin', 'super_admin'), deleteDeviceType);

router.post('/seed', authorize('super_admin'), seedDeviceTypes);

export default router;
