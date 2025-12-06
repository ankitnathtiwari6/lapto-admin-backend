import { Response } from 'express';
import SubTask from '../models/SubTask';
import Order from '../models/Order';
import { startOfDay } from 'date-fns';
import { AuthRequest } from '../middleware/auth';

// @desc    Get engineer's task statistics
// @route   GET /api/engineer/stats
// @access  Private (Engineer, Admin, Super Admin)
export const getEngineerStats = async (req: AuthRequest, res: Response) => {
  try {
    const engineerId = req.user._id;
    const today = startOfDay(new Date());

    // Get all tasks assigned to this engineer
    const allTasks = await SubTask.find({
      assignedTo: engineerId,
      isDeleted: false
    });

    // Calculate statistics
    const stats = {
      totalAssigned: allTasks.length,
      assignedToday: allTasks.filter(task =>
        new Date(task.assignedAt) >= today
      ).length,
      pending: allTasks.filter(task => task.status === 'pending').length,
      inProgress: allTasks.filter(task => task.status === 'in_progress').length,
      completed: allTasks.filter(task => task.status === 'completed').length,
      blocked: allTasks.filter(task => task.status === 'blocked').length,
      onHold: allTasks.filter(task => task.status === 'on_hold').length,
      reopened: allTasks.filter(task => {
        // Check if task was reopened (has completion date but status is not completed)
        return task.completedAt && task.status !== 'completed';
      }).length
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching engineer statistics',
      error: error.message
    });
  }
};

// @desc    Get all tasks assigned to engineer
// @route   GET /api/engineer/tasks
// @access  Private (Engineer, Admin, Super Admin)
export const getEngineerTasks = async (req: AuthRequest, res: Response) => {
  try {
    const engineerId = req.user._id;
    const { status, sortBy = 'assignedAt', order = 'desc' } = req.query;

    // Build query
    const query: any = {
      assignedTo: engineerId,
      isDeleted: false
    };

    if (status) {
      query.status = status;
    }

    // Get tasks with populated order details (excluding customer info)
    const tasks = await SubTask.find(query)
      .populate({
        path: 'orderId',
        select: 'orderNumber device problemDescription stageId stageName estimatedCost finalCost status receivedDate estimatedCompletionDate'
      })
      .sort({ [sortBy as string]: order === 'desc' ? -1 : 1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message
    });
  }
};

// @desc    Get specific task details by ID
// @route   GET /api/engineer/tasks/:id
// @access  Private (Engineer, Admin, Super Admin)
export const getEngineerTaskById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const engineerId = req.user._id;

    // Find task and verify it's assigned to this engineer
    const task = await SubTask.findOne({
      _id: id,
      assignedTo: engineerId,
      isDeleted: false
    }).populate({
      path: 'orderId',
      select: 'orderNumber device problemDescription diagnosedIssues stageId stageName estimatedCost finalCost status priority receivedDate estimatedCompletionDate partsUsed images'
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or not assigned to you'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching task details',
      error: error.message
    });
  }
};

// @desc    Update task status (start, complete, block, etc.)
// @route   PUT /api/engineer/tasks/:id/status
// @access  Private (Engineer, Admin, Super Admin)
export const updateTaskStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const engineerId = req.user._id;
    const engineerName = req.user.fullName;

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'blocked', 'on_hold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Find task and verify it's assigned to this engineer
    const task = await SubTask.findOne({
      _id: id,
      assignedTo: engineerId,
      isDeleted: false
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or not assigned to you'
      });
    }

    const oldStatus = task.status;

    // Update status and timestamps
    task.status = status;

    if (status === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date();
    }

    if (status === 'completed') {
      task.completedAt = new Date();
      task.progress = 100;
    }

    // Add update note
    task.updates.push({
      note: notes || `Status changed from ${oldStatus} to ${status}`,
      addedBy: engineerId,
      addedByName: engineerName,
      timestamp: new Date(),
      type: 'status_change',
      oldValue: oldStatus,
      newValue: status
    });

    await task.save();

    // Update order's subtask progress
    const order = await Order.findById(task.orderId);
    if (order) {
      const allSubTasks = await SubTask.find({
        orderId: order._id,
        isDeleted: false
      });

      order.totalSubTasks = allSubTasks.length;
      order.completedSubTasks = allSubTasks.filter(st => st.status === 'completed').length;
      order.subTaskProgress = order.totalSubTasks > 0
        ? Math.round((order.completedSubTasks / order.totalSubTasks) * 100)
        : 0;

      // Auto-update order stage based on subtask completion
      if (order.completedSubTasks === order.totalSubTasks && order.totalSubTasks > 0) {
        // All subtasks completed - potentially move to "Ready for Delivery" or similar
        // This logic can be customized based on your workflow
      }

      await order.save();
    }

    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      data: task
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating task status',
      error: error.message
    });
  }
};
