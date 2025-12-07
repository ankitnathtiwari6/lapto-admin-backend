import { Router } from 'express';
import {
  loginLaptoAdmin,
  registerLaptoAdmin,
  createCompanyAsAdmin,
  addCompanyUser,
  removeCompanyUser,
  updateCompanyUser,
  getAllCompaniesAsAdmin,
  getCompanyUsersAsAdmin,
  deleteCompanyAsAdmin
} from '../controllers/laptoAdminController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// Authentication routes (no auth required)
router.post('/login', loginLaptoAdmin);
router.post('/register', registerLaptoAdmin);

// Company management routes (require JWT auth with lapto_admin role)
router.post('/companies', protect, authorize('lapto_admin'), createCompanyAsAdmin);
router.get('/companies', protect, authorize('lapto_admin'), getAllCompaniesAsAdmin);
router.delete('/companies/:companyId', protect, authorize('lapto_admin'), deleteCompanyAsAdmin);

// Company user management (require JWT auth with lapto_admin role)
router.post('/company-users', protect, authorize('lapto_admin'), addCompanyUser);
router.get('/companies/:companyId/users', protect, authorize('lapto_admin'), getCompanyUsersAsAdmin);
router.put('/company-users/:userId', protect, authorize('lapto_admin'), updateCompanyUser);
router.delete('/company-users/:userId', protect, authorize('lapto_admin'), removeCompanyUser);

export default router;
