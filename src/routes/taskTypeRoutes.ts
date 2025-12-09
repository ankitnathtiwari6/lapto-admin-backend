import { Router } from "express";
import {
  getAllTaskTypes,
  getTaskTypeById,
  createTaskType,
  updateTaskType,
  deleteTaskType,
} from "../controllers/taskTypeController";
import { protect, authorize } from "../middleware/auth";

const router = Router();

router.use(protect);

router
  .route("/")
  .get(authorize("admin", "super_admin", "engineer"), getAllTaskTypes)
  .post(authorize("admin", "super_admin"), createTaskType);

router
  .route("/:id")
  .get(authorize("admin", "super_admin"), getTaskTypeById)
  .put(authorize("admin", "super_admin"), updateTaskType)
  .delete(authorize("admin", "super_admin"), deleteTaskType);

export default router;
