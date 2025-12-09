import { Router } from 'express';
import {
  getEngineerTasks,
  getEngineerTaskById,
  updateTaskStatus,
  getEngineerStats,
  getTasksAssignedByEngineer
} from '../controllers/engineerController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication and engineer role
router.use(protect);
router.use(authorize('engineer', 'admin', 'super_admin'));

// Get engineer's task statistics
router.get('/stats', getEngineerStats);

// Get all tasks assigned to the engineer
router.get('/tasks', getEngineerTasks);

// Get tasks created/assigned by the engineer
router.get('/assigned-tasks', getTasksAssignedByEngineer);

// Get specific task details
router.get('/tasks/:id', getEngineerTaskById);

// Update task status (start, complete, etc.)
router.put('/tasks/:id/status', updateTaskStatus);

export default router;
