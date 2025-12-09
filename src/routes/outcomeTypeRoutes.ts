import express from 'express';
import {
  getAllOutcomeTypes,
  getOutcomeTypeById,
  createOutcomeType,
  updateOutcomeType,
  deleteOutcomeType
} from '../controllers/outcomeTypeController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAllOutcomeTypes)
  .post(createOutcomeType);

router.route('/:id')
  .get(getOutcomeTypeById)
  .put(updateOutcomeType)
  .delete(deleteOutcomeType);

export default router;
