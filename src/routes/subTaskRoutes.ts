import express from 'express';
import {
  createSubTask,
  getOrderSubTasks,
  getSubTaskById,
  updateSubTask,
  updateSubTaskStatus,
  reassignSubTask,
  addSubTaskUpdate,
  deleteSubTask,
  getStaffSubTasks,
  getStaffCreatedSubTasks,
  getStaffSubTaskStats,
  getSubTaskHistory
} from '../controllers/subTaskController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Order-specific sub-task routes
router.post('/orders/:orderId/subtasks', createSubTask);
router.get('/orders/:orderId/subtasks', getOrderSubTasks);

// Sub-task CRUD routes
router.get('/subtasks/:id', getSubTaskById);
router.put('/subtasks/:id', updateSubTask);
router.delete('/subtasks/:id', deleteSubTask);

// Sub-task actions
router.put('/subtasks/:id/status', updateSubTaskStatus);
router.put('/subtasks/:id/assign', reassignSubTask);
router.post('/subtasks/:id/updates', addSubTaskUpdate);
router.get('/subtasks/:id/history', getSubTaskHistory);

// Staff-specific sub-task routes
router.get('/staff/:staffId/subtasks', getStaffSubTasks);
router.get('/staff/:staffId/subtasks/created', getStaffCreatedSubTasks);
router.get('/staff/:staffId/subtasks/stats', getStaffSubTaskStats);

export default router;
