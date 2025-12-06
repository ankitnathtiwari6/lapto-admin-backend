import { Router } from 'express';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers
} from '../controllers/customerController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/search', authorize('admin', 'super_admin'), searchCustomers);

router.route('/')
  .get(authorize('admin', 'super_admin'), getAllCustomers)
  .post(authorize('admin', 'super_admin'), createCustomer);

router.route('/:id')
  .get(authorize('admin', 'super_admin'), getCustomerById)
  .put(authorize('admin', 'super_admin'), updateCustomer)
  .delete(authorize('admin', 'super_admin'), deleteCustomer);

export default router;
