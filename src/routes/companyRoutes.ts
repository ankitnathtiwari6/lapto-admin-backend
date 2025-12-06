import { Router } from 'express';
import {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyUsers
} from '../controllers/companyController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
  .get(getAllCompanies)
  .post(authorize('admin', 'super_admin'), createCompany);

router.route('/:id')
  .get(getCompanyById)
  .put(authorize('admin', 'super_admin'), updateCompany)
  .delete(authorize('super_admin'), deleteCompany);

router.get('/:companyId/users', getCompanyUsers);

export default router;
