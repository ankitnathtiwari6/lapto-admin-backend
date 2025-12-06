import { Response } from 'express';
import SubTask from '../models/SubTask';
import Order from '../models/Order';
import Staff from '../models/Staff';
import Stage from '../models/Stage';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/activityLogger';

// Helper function to update order sub-task statistics
const updateOrderSubTaskStats = async (orderId: string): Promise<void> => {
  const subTasks = await SubTask.find({ orderId, isDeleted: false });

  const totalSubTasks = subTasks.length;
  const completedSubTasks = subTasks.filter(st => st.status === 'completed').length;
  const subTaskProgress = totalSubTasks > 0 ? Math.round((completedSubTasks / totalSubTasks) * 100) : 0;

  await Order.findByIdAndUpdate(orderId, {
    hasSubTasks: totalSubTasks > 0,
    totalSubTasks,
    completedSubTasks,
    subTaskProgress
  });
};

// Helper function to auto-update order stage based on sub-task status
const autoUpdateOrderStage = async (orderId: string, userId: string, userName: string): Promise<void> => {
  try {
    const order = await Order.findById(orderId);
    if (!order) return;

    const subTasks = await SubTask.find({ orderId, isDeleted: false });

    // If no sub-tasks, don't change stage
    if (subTasks.length === 0) return;

    const hasInProgress = subTasks.some(st => st.status === 'in_progress');
    const allCompleted = subTasks.every(st => st.status === 'completed');
    const anyCompleted = subTasks.some(st => st.status === 'completed');
    const allPending = subTasks.every(st => st.status === 'pending');

    let targetStage = null;
    let stageNote = '';

    // Determine target stage based on sub-task states
    if (allCompleted) {
      // All sub-tasks completed → Quality Check or Completed
      targetStage = await Stage.findOne({ slug: 'quality_check', isActive: true });
      if (!targetStage) {
        targetStage = await Stage.findOne({ slug: 'completed', isActive: true });
      }
      stageNote = 'All sub-tasks completed';
    } else if (hasInProgress) {
      // Any sub-task in progress → In Progress
      targetStage = await Stage.findOne({ slug: 'in_progress', isActive: true });
      stageNote = 'Sub-tasks in progress';
    } else if (anyCompleted) {
      // Some completed but not all → keep In Progress
      targetStage = await Stage.findOne({ slug: 'in_progress', isActive: true });
      stageNote = 'Sub-tasks partially completed';
    } else if (allPending && subTasks.length > 0) {
      // All sub-tasks are pending (newly created) → In Progress
      targetStage = await Stage.findOne({ slug: 'in_progress', isActive: true });
      stageNote = 'Sub-tasks created and assigned';
    }

    // Update order stage if target stage found and different from current
    if (targetStage && order.stageId?.toString() !== targetStage._id.toString()) {
      order.stageId = targetStage._id as any;
      order.stageName = targetStage.name;

      if (!order.stageHistory) {
        order.stageHistory = [];
      }

      // Get the assigned staff name from order's assignedTo or from sub-tasks
      let assignedToName = order.assignedTo?.userName;
      if (!assignedToName && subTasks.length > 0) {
        // Get unique assigned staff from sub-tasks
        const assignedStaff = [...new Set(subTasks.map(st => st.assignedToName))];
        assignedToName = assignedStaff.length === 1 ? assignedStaff[0] : undefined;
      }

      order.stageHistory.push({
        stageId: targetStage._id as any,
        stageName: targetStage.name,
        timestamp: new Date(),
        updatedBy: userId as any,
        updatedByName: userName,
        assignedTo: assignedToName,
        notes: stageNote
      });

      await order.save();
    }
  } catch (error) {
    console.error('Error auto-updating order stage:', error);
    // Don't throw error - this is a background operation
  }
};

// Create a new sub-task
export const createSubTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const companyId = req.body.companyId || req.companyId;

    if (!companyId) {
      res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
      return;
    }

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found'
      });
      return;
    }

    // Verify assigned staff exists
    const assignedStaff = await Staff.findById(req.body.assignedTo);
    if (!assignedStaff) {
      res.status(400).json({
        success: false,
        message: 'Assigned staff not found'
      });
      return;
    }

    // Check if staff is active
    if (assignedStaff.status !== 'active') {
      res.status(400).json({
        success: false,
        message: 'Cannot assign to inactive staff member'
      });
      return;
    }

    // Determine task level
    let taskLevel = 0;
    if (req.body.parentTaskId) {
      const parentTask = await SubTask.findById(req.body.parentTaskId);
      if (parentTask) {
        taskLevel = parentTask.taskLevel + 1;
      }
    }

    const subTaskData = {
      ...req.body,
      orderId,
      orderNumber: order.orderNumber,
      companyId,
      taskLevel,
      createdBy: req.user.id,
      createdByName: req.user.fullName,
      assignedToName: assignedStaff.fullName,
      assignedAt: new Date(),
      updates: [{
        note: `Sub-task created and assigned to ${assignedStaff.fullName}`,
        addedBy: req.user.id,
        addedByName: req.user.fullName,
        timestamp: new Date(),
        type: 'assignment'
      }]
    };

    const subTask = await SubTask.create(subTaskData);

    // Update order statistics
    await updateOrderSubTaskStats(orderId);

    // Auto-update order stage (may move to "In Progress" if work is being delegated)
    await autoUpdateOrderStage(orderId, req.user.id, req.user.fullName);

    // Log subtask creation activity
    await logActivity({
      orderId: order._id,
      orderNumber: order.orderNumber,
      companyId: order.companyId,
      activityType: 'subtask_created',
      title: 'Sub-task Created',
      description: `Sub-task "${subTask.title}" created and assigned to ${assignedStaff.fullName}`,
      performedBy: req.user.id,
      performedByName: req.user.fullName,
      stageId: order.stageId,
      stageName: order.stageName,
      subTaskId: subTask._id,
      subTaskTitle: subTask.title,
      assignedTo: assignedStaff.fullName,
    });

    res.status(201).json({
      success: true,
      data: subTask
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get all sub-tasks for an order
export const getOrderSubTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status, assignedTo, includeDeleted } = req.query;

    const filter: any = { orderId };

    if (!includeDeleted) {
      filter.isDeleted = false;
    }

    if (status) {
      filter.status = status;
    }

    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    const subTasks = await SubTask.find(filter)
      .populate('assignedTo', 'fullName phone email role')
      .populate('createdBy', 'fullName')
      .populate('parentTaskId', 'title status')
      .populate('dependencies', 'title status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subTasks.length,
      data: subTasks
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get a specific sub-task by ID
export const getSubTaskById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subTask = await SubTask.findById(req.params.id)
      .populate('orderId', 'orderNumber customer device')
      .populate('assignedTo', 'fullName phone email role')
      .populate('createdBy', 'fullName')
      .populate('parentTaskId', 'title status progress')
      .populate('dependencies', 'title status progress');

    if (!subTask) {
      res.status(404).json({
        success: false,
        message: 'Sub-task not found'
      });
      return;
    }

    // Get child tasks if any
    const childTasks = await SubTask.find({
      parentTaskId: subTask._id,
      isDeleted: false
    }).select('title status progress assignedToName');

    res.status(200).json({
      success: true,
      data: {
        ...subTask.toObject(),
        childTasks
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Update sub-task
export const updateSubTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subTask = await SubTask.findById(req.params.id);

    if (!subTask) {
      res.status(404).json({
        success: false,
        message: 'Sub-task not found'
      });
      return;
    }

    // Track changes for updates array
    const updates: any[] = [];

    // Update fields and track changes
    const fieldsToUpdate = [
      'title', 'description', 'progress', 'blockedBy', 'amount', 'isPaid'
    ];

    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== (subTask as any)[field]) {
        updates.push({
          note: `${field} updated`,
          addedBy: req.user.id,
          addedByName: req.user.fullName,
          timestamp: new Date(),
          type: 'progress_update',
          oldValue: String((subTask as any)[field] || ''),
          newValue: String(req.body[field])
        });
        (subTask as any)[field] = req.body[field];
      }
    });

    // Add parts used if provided
    if (req.body.partsUsed && Array.isArray(req.body.partsUsed)) {
      if (!subTask.partsUsed) {
        subTask.partsUsed = [];
      }
      req.body.partsUsed.forEach((part: any) => {
        subTask.partsUsed!.push({
          ...part,
          addedAt: new Date()
        });
        updates.push({
          note: `Part added: ${part.partName} (Qty: ${part.quantity}, Cost: ₹${part.cost})`,
          addedBy: req.user.id,
          addedByName: req.user.fullName,
          timestamp: new Date(),
          type: 'progress_update'
        });
      });
    }

    // Add updates to history
    if (updates.length > 0) {
      subTask.updates.push(...updates);
    }

    await subTask.save();

    // Update order statistics
    await updateOrderSubTaskStats(subTask.orderId.toString());

    // Log subtask update activity if there were changes
    if (updates.length > 0) {
      const order = await Order.findById(subTask.orderId);
      if (order) {
        const changesSummary = updates.map(u => u.note).join(', ');
        await logActivity({
          orderId: order._id,
          orderNumber: order.orderNumber,
          companyId: order.companyId,
          activityType: 'subtask_updated',
          title: 'Sub-task Updated',
          description: `Sub-task "${subTask.title}" updated: ${changesSummary}`,
          performedBy: req.user.id,
          performedByName: req.user.fullName,
          stageId: order.stageId,
          stageName: order.stageName,
          subTaskId: subTask._id,
          subTaskTitle: subTask.title,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: subTask
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Update sub-task status
export const updateSubTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, notes } = req.body;
    const subTask = await SubTask.findById(req.params.id);

    if (!subTask) {
      res.status(404).json({
        success: false,
        message: 'Sub-task not found'
      });
      return;
    }

    const oldStatus = subTask.status;
    subTask.status = status;

    // Update timestamps based on status
    if (status === 'in_progress' && !subTask.startedAt) {
      subTask.startedAt = new Date();
    }

    if (status === 'completed') {
      subTask.completedAt = new Date();
      subTask.progress = 100;
    }

    // Add status change to updates
    subTask.updates.push({
      note: notes || `Status changed from ${oldStatus} to ${status}`,
      addedBy: req.user.id,
      addedByName: req.user.fullName,
      timestamp: new Date(),
      type: 'status_change',
      oldValue: oldStatus,
      newValue: status
    });

    await subTask.save();

    // Update order statistics
    await updateOrderSubTaskStats(subTask.orderId.toString());

    // Auto-update order stage based on sub-task status
    await autoUpdateOrderStage(subTask.orderId.toString(), req.user.id, req.user.fullName);

    // Log subtask status change activity
    const order = await Order.findById(subTask.orderId);
    if (order) {
      await logActivity({
        orderId: order._id,
        orderNumber: order.orderNumber,
        companyId: order.companyId,
        activityType: 'subtask_status_changed',
        title: 'Sub-task Status Changed',
        description: `Sub-task "${subTask.title}" status changed from ${oldStatus} to ${status}${notes ? ` - ${notes}` : ''}`,
        performedBy: req.user.id,
        performedByName: req.user.fullName,
        stageId: order.stageId,
        stageName: order.stageName,
        subTaskId: subTask._id,
        subTaskTitle: subTask.title,
        previousValue: oldStatus,
        newValue: status,
      });
    }

    res.status(200).json({
      success: true,
      data: subTask
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Reassign sub-task
export const reassignSubTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { assignedTo, notes } = req.body;
    const subTask = await SubTask.findById(req.params.id);

    if (!subTask) {
      res.status(404).json({
        success: false,
        message: 'Sub-task not found'
      });
      return;
    }

    const newStaff = await Staff.findById(assignedTo);
    if (!newStaff) {
      res.status(400).json({
        success: false,
        message: 'Staff member not found'
      });
      return;
    }

    if (newStaff.status !== 'active') {
      res.status(400).json({
        success: false,
        message: 'Cannot assign to inactive staff member'
      });
      return;
    }

    const oldAssignee = subTask.assignedToName;
    subTask.assignedTo = assignedTo;
    subTask.assignedToName = newStaff.fullName;
    subTask.assignedAt = new Date();

    // Add reassignment to updates
    subTask.updates.push({
      note: notes || `Re-assigned from ${oldAssignee} to ${newStaff.fullName}`,
      addedBy: req.user.id,
      addedByName: req.user.fullName,
      timestamp: new Date(),
      type: 'assignment',
      oldValue: oldAssignee,
      newValue: newStaff.fullName
    });

    await subTask.save();

    // Log subtask reassignment activity
    const order = await Order.findById(subTask.orderId);
    if (order) {
      await logActivity({
        orderId: order._id,
        orderNumber: order.orderNumber,
        companyId: order.companyId,
        activityType: 'subtask_reassigned',
        title: 'Sub-task Reassigned',
        description: `Sub-task "${subTask.title}" reassigned from ${oldAssignee} to ${newStaff.fullName}${notes ? ` - ${notes}` : ''}`,
        performedBy: req.user.id,
        performedByName: req.user.fullName,
        stageId: order.stageId,
        stageName: order.stageName,
        subTaskId: subTask._id,
        subTaskTitle: subTask.title,
        assignedTo: newStaff.fullName,
        previousValue: oldAssignee,
        newValue: newStaff.fullName,
      });
    }

    res.status(200).json({
      success: true,
      data: subTask
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Add comment/update to sub-task
export const addSubTaskUpdate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { note, type = 'comment' } = req.body;
    const subTask = await SubTask.findById(req.params.id);

    if (!subTask) {
      res.status(404).json({
        success: false,
        message: 'Sub-task not found'
      });
      return;
    }

    subTask.updates.push({
      note,
      addedBy: req.user.id,
      addedByName: req.user.fullName,
      timestamp: new Date(),
      type
    });

    await subTask.save();

    res.status(200).json({
      success: true,
      data: subTask
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Delete (soft delete) sub-task
export const deleteSubTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subTask = await SubTask.findById(req.params.id);

    if (!subTask) {
      res.status(404).json({
        success: false,
        message: 'Sub-task not found'
      });
      return;
    }

    // Check if there are child tasks
    const childTasks = await SubTask.find({
      parentTaskId: subTask._id,
      isDeleted: false
    });

    if (childTasks.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete sub-task with active child tasks. Delete child tasks first.'
      });
      return;
    }

    subTask.isDeleted = true;
    subTask.updates.push({
      note: 'Sub-task deleted',
      addedBy: req.user.id,
      addedByName: req.user.fullName,
      timestamp: new Date(),
      type: 'status_change'
    });

    await subTask.save();

    // Update order statistics
    await updateOrderSubTaskStats(subTask.orderId.toString());

    // Log subtask deletion activity
    const order = await Order.findById(subTask.orderId);
    if (order) {
      await logActivity({
        orderId: order._id,
        orderNumber: order.orderNumber,
        companyId: order.companyId,
        activityType: 'subtask_deleted',
        title: 'Sub-task Deleted',
        description: `Sub-task "${subTask.title}" was deleted`,
        performedBy: req.user.id,
        performedByName: req.user.fullName,
        stageId: order.stageId,
        stageName: order.stageName,
        subTaskId: subTask._id,
        subTaskTitle: subTask.title,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sub-task deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get sub-tasks assigned to a specific staff member
export const getStaffSubTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { staffId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const filter: any = {
      assignedTo: staffId,
      isDeleted: false
    };

    if (status) {
      filter.status = status;
    }

    const subTasks = await SubTask.find(filter)
      .populate('orderId', 'orderNumber customer device stageName')
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await SubTask.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: subTasks.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: subTasks
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get sub-tasks created by a specific staff member
export const getStaffCreatedSubTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { staffId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const filter: any = {
      createdBy: staffId,
      isDeleted: false
    };

    if (status) {
      filter.status = status;
    }

    const subTasks = await SubTask.find(filter)
      .populate('orderId', 'orderNumber customer')
      .populate('assignedTo', 'fullName phone')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await SubTask.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: subTasks.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: subTasks
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get sub-task statistics for a staff member
export const getStaffSubTaskStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { staffId } = req.params;
    const { fromDate, toDate } = req.query;

    const filter: any = {
      assignedTo: staffId,
      isDeleted: false
    };

    // Date range filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate as string);
      }
      if (toDate) {
        filter.createdAt.$lte = new Date(toDate as string);
      }
    }

    const subTasks = await SubTask.find(filter);

    const totalSubTasks = subTasks.length;
    const completedSubTasks = subTasks.filter(st => st.status === 'completed').length;
    const inProgressSubTasks = subTasks.filter(st => st.status === 'in_progress').length;
    const pendingSubTasks = subTasks.filter(st => st.status === 'pending').length;
    const blockedSubTasks = subTasks.filter(st => st.status === 'blocked').length;

    // Calculate total commission from paid sub-tasks
    const totalSubTaskCommission = subTasks
      .filter(st => st.isPaid && st.status === 'completed')
      .reduce((sum, st) => sum + (st.amount || 0), 0);

    // Calculate average completion time for completed tasks
    const completedTasks = subTasks.filter(st => st.status === 'completed' && st.startedAt && st.completedAt);
    const avgCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, st) => {
          const time = (st.completedAt!.getTime() - st.startedAt!.getTime()) / (1000 * 60 * 60);
          return sum + time;
        }, 0) / completedTasks.length
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalSubTasks,
        completedSubTasks,
        inProgressSubTasks,
        pendingSubTasks,
        blockedSubTasks,
        completionRate: totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : 0,
        totalSubTaskCommission,
        avgCompletionTime: Math.round(avgCompletionTime * 10) / 10
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get sub-task history/timeline
export const getSubTaskHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subTask = await SubTask.findById(req.params.id)
      .populate('updates.addedBy', 'fullName')
      .select('updates title orderNumber');

    if (!subTask) {
      res.status(404).json({
        success: false,
        message: 'Sub-task not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        title: subTask.title,
        orderNumber: subTask.orderNumber,
        updates: subTask.updates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
