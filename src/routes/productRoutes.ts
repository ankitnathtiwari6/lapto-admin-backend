import { Router } from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateStock
} from '../controllers/productController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
  .get(getAllProducts)
  .post(authorize('admin', 'super_admin'), createProduct);

router.route('/:id')
  .get(getProductById)
  .put(authorize('admin', 'super_admin'), updateProduct)
  .delete(authorize('admin', 'super_admin'), deleteProduct);

router.put('/:id/stock', authorize('admin', 'super_admin'), updateStock);

export default router;
