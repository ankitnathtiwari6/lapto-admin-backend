import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getEngineers
} from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/engineers', getEngineers);

router.route('/')
  .get(authorize('admin', 'super_admin'), getAllUsers)
  .post(authorize('admin', 'super_admin'), createUser);

router.route('/:id')
  .get(authorize('admin', 'super_admin'), getUserById)
  .put(authorize('admin', 'super_admin'), updateUser)
  .delete(authorize('admin', 'super_admin'), deleteUser);

export default router;
