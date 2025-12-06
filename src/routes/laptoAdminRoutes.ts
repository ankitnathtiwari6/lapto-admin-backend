import { Router } from 'express';
import {
  createCompanyAsAdmin,
  addCompanyUser,
  removeCompanyUser,
  updateCompanyUser,
  getAllCompaniesAsAdmin,
  getCompanyUsersAsAdmin,
  deleteCompanyAsAdmin
} from '../controllers/laptoAdminController';

const router = Router();

// All routes require password verification (no JWT auth needed)

// Company management
router.post('/companies', createCompanyAsAdmin);
router.get('/companies', getAllCompaniesAsAdmin);
router.delete('/companies/:companyId', deleteCompanyAsAdmin);

// Company user management
router.post('/company-users', addCompanyUser);
router.get('/companies/:companyId/users', getCompanyUsersAsAdmin);
router.put('/company-users/:userId', updateCompanyUser);
router.delete('/company-users/:userId', removeCompanyUser);

export default router;
