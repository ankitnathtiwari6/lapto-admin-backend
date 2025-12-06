import { Router } from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  updateOrderStage,
  updateOrderStatus,
  assignEngineer,
  addNote,
  checkStatusByPhone,
  addPayment,
  getOrderStats
} from '../controllers/orderController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// Public route for status checking
router.get('/status/:phone', checkStatusByPhone);

router.use(protect);

// Stats route (must come before /:id route)
router.get('/stats', getOrderStats);

router.route('/')
  .get(getAllOrders)
  .post(authorize('admin', 'super_admin'), createOrder);

router.route('/:id')
  .get(getOrderById)
  .put(authorize('admin', 'super_admin'), updateOrder)
  .delete(authorize('admin', 'super_admin'), deleteOrder);

router.put('/:id/stage', authorize('admin', 'super_admin', 'engineer'), updateOrderStage);
router.put('/:id/status', authorize('admin', 'super_admin', 'engineer'), updateOrderStatus);
router.put('/:id/assign', authorize('admin', 'super_admin'), assignEngineer);
router.post('/:id/notes', authorize('admin', 'super_admin', 'engineer'), addNote);
router.post('/:id/payment', authorize('admin', 'super_admin'), addPayment);

export default router;
