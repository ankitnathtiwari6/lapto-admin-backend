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

    // Get all subtasks assigned to this engineer
    const allSubTasks = await SubTask.find({
      assignedTo: engineerId,
      isDeleted: false
    });

    // Get all orders assigned directly to this engineer (without explicit subtasks)
    const assignedOrders = await Order.find({
      'assignedTo.userId': engineerId,
      isDeleted: false
    });

    // Filter orders that don't have subtasks
    const ordersWithoutSubTasks = [];
    for (const order of assignedOrders) {
      const hasSubTasks = await SubTask.exists({ orderId: order._id, isDeleted: false });
      if (!hasSubTasks) {
        ordersWithoutSubTasks.push(order);
      }
    }

    // Combine statistics from both subtasks and assigned orders
    const totalAssigned = allSubTasks.length + ordersWithoutSubTasks.length;
    const assignedToday =
      allSubTasks.filter(task => new Date(task.assignedAt) >= today).length +
      ordersWithoutSubTasks.filter(order => order.assignedTo && new Date(order.assignedTo.assignedAt) >= today).length;

    const stats = {
      totalAssigned,
      assignedToday,
      pending: allSubTasks.filter(task => task.status === 'pending').length +
               ordersWithoutSubTasks.filter(order => order.status === 'pending').length,
      inProgress: allSubTasks.filter(task => task.status === 'in_progress').length +
                  ordersWithoutSubTasks.filter(order => order.status === 'in_progress').length,
      completed: allSubTasks.filter(task => task.status === 'completed').length +
                 ordersWithoutSubTasks.filter(order => order.status === 'completed').length,
      blocked: allSubTasks.filter(task => task.status === 'blocked').length,
      onHold: allSubTasks.filter(task => task.status === 'on_hold').length,
      reopened: allSubTasks.filter(task => {
        // Check if task was reopened (has completion date but status is not completed)
        return task.completedAt && task.status !== 'completed';
      }).length + ordersWithoutSubTasks.filter(order => order.status === 'reopened').length
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

    console.log('🔍 Engineer ID:', engineerId);
    console.log('🔍 Status filter:', status);

    // Build query for subtasks
    const subTaskQuery: any = {
      assignedTo: engineerId,
      isDeleted: false
    };

    if (status) {
      subTaskQuery.status = status;
    }

    // Get subtasks with populated order details
    const subTasks = await SubTask.find(subTaskQuery)
      .populate({
        path: 'orderId',
        select: 'orderNumber device problemDescription diagnosedIssues stageId stageName estimatedCost finalCost status receivedDate estimatedCompletionDate partsUsed images'
      })
      .sort({ [sortBy as string]: order === 'desc' ? -1 : 1 });

    console.log('📋 Subtasks found:', subTasks.length);

    // Build query for orders assigned directly to engineer
    const orderQuery: any = {
      'assignedTo.userId': engineerId,
      isDeleted: false
    };

    if (status) {
      orderQuery.status = status;
    }

    console.log('🔍 Order query:', JSON.stringify(orderQuery));

    // Get orders assigned to engineer
    const assignedOrders = await Order.find(orderQuery)
      .sort({ 'assignedTo.assignedAt': order === 'desc' ? -1 : 1 });

    console.log('📦 Assigned orders found:', assignedOrders.length);

    // Transform all orders to task format (no filtering)
    const orderTasks = assignedOrders.map(order => {
      console.log(`✅ Adding order ${order.orderNumber} as task`);
      return {
        _id: order._id,
        orderId: {
          _id: order._id,
          orderNumber: order.orderNumber,
          device: order.device,
          problemDescription: order.problemDescription,
          diagnosedIssues: order.diagnosedIssues,
          stageName: order.stageName,
          status: order.status,
          estimatedCost: order.estimatedCost,
          finalCost: order.finalCost,
          receivedDate: order.receivedDate,
          estimatedCompletionDate: order.estimatedCompletionDate,
          partsUsed: order.partsUsed,
          images: order.images
        },
        title: `Order #${order.orderNumber}`,
        description: order.problemDescription,
        status: order.status,
        progress: order.status === 'completed' ? 100 : order.status === 'in_progress' ? 50 : 0,
        assignedAt: order.assignedTo?.assignedAt || order.createdAt,
        startedAt: order.status === 'in_progress' || order.status === 'completed' ? order.updatedAt : undefined,
        completedAt: order.status === 'completed' ? order.actualCompletionDate : undefined,
        amount: order.estimatedCost,
        isPaid: order.paymentStatus === 'paid',
        partsUsed: order.partsUsed,
        updates: order.internalNotes?.map((note: any) => ({
          note: note.note,
          addedByName: note.addedByName,
          timestamp: note.timestamp,
          type: 'comment'
        })) || [],
        isOrderTask: true // Flag to identify this is an order-level task
      };
    });

    // Combine subtasks and order tasks
    const allTasks = [...subTasks, ...orderTasks];

    console.log('🎯 Total tasks (subtasks + order tasks):', allTasks.length);
    console.log('  - Subtasks:', subTasks.length);
    console.log('  - Order tasks:', orderTasks.length);

    // Sort combined tasks
    if (sortBy === 'assignedAt') {
      allTasks.sort((a, b) => {
        const dateA = new Date(a.assignedAt).getTime();
        const dateB = new Date(b.assignedAt).getTime();
        return order === 'desc' ? dateB - dateA : dateA - dateB;
      });
    }

    res.status(200).json({
      success: true,
      count: allTasks.length,
      data: allTasks
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

    // First try to find as a subtask
    const task = await SubTask.findOne({
      _id: id,
      assignedTo: engineerId,
      isDeleted: false
    }).populate({
      path: 'orderId',
      select: 'orderNumber device problemDescription diagnosedIssues stageId stageName estimatedCost finalCost status priority receivedDate estimatedCompletionDate partsUsed images'
    });

    if (task) {
      return res.status(200).json({
        success: true,
        data: task
      });
    }

    // If not found as subtask, check if it's an order-level task
    const order = await Order.findOne({
      _id: id,
      'assignedTo.userId': engineerId,
      isDeleted: false
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or not assigned to you'
      });
    }

    // Transform order to task format (no longer filtering based on subtasks)
    const orderTask = {
      _id: order._id,
      orderId: {
        _id: order._id,
        orderNumber: order.orderNumber,
        device: order.device,
        problemDescription: order.problemDescription,
        diagnosedIssues: order.diagnosedIssues,
        stageName: order.stageName,
        status: order.status,
        estimatedCost: order.estimatedCost,
        finalCost: order.finalCost,
        receivedDate: order.receivedDate,
        estimatedCompletionDate: order.estimatedCompletionDate,
        partsUsed: order.partsUsed,
        images: order.images,
        priority: order.priority
      },
      title: `Order #${order.orderNumber}`,
      description: order.problemDescription,
      status: order.status,
      progress: order.status === 'completed' ? 100 : order.status === 'in_progress' ? 50 : 0,
      assignedAt: order.assignedTo?.assignedAt || order.createdAt,
      startedAt: order.status === 'in_progress' || order.status === 'completed' ? order.updatedAt : undefined,
      completedAt: order.status === 'completed' ? order.actualCompletionDate : undefined,
      amount: order.estimatedCost,
      isPaid: order.paymentStatus === 'paid',
      partsUsed: order.partsUsed,
      updates: order.internalNotes?.map((note: any) => ({
        note: note.note,
        addedByName: note.addedByName,
        timestamp: note.timestamp,
        type: 'comment'
      })) || [],
      isOrderTask: true
    };

    res.status(200).json({
      success: true,
      data: orderTask
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching task details',
      error: error.message
    });
  }
};

// @desc    Get tasks created/assigned by the engineer
// @route   GET /api/engineer/assigned-tasks
// @access  Private (Engineer, Admin, Super Admin)
export const getTasksAssignedByEngineer = async (req: AuthRequest, res: Response) => {
  try {
    const engineerId = req.user._id;

    // Get all subtasks created by this engineer
    const createdSubTasks = await SubTask.find({
      createdBy: engineerId,
      isDeleted: false
    })
      .populate('assignedTo', 'fullName phone email role')
      .populate({
        path: 'orderId',
        select: 'orderNumber device status'
      })
      .sort({ createdAt: -1 })
      .limit(20); // Limit to recent 20 tasks

    // Transform to match AssignedTask interface
    const tasks = createdSubTasks.map(task => {
      const orderId = task.orderId as any;
      const assignedTo = task.assignedTo as any;

      return {
        _id: task._id,
        orderId: {
          _id: orderId._id,
          orderNumber: orderId.orderNumber
        },
        engineerId: {
          _id: assignedTo._id,
          fullName: assignedTo.fullName
        },
        title: task.title,
        status: task.status,
        assignedAt: task.assignedAt
      };
    });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assigned tasks',
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

    // First try to find as a subtask
    const task = await SubTask.findOne({
      _id: id,
      assignedTo: engineerId,
      isDeleted: false
    });

    if (task) {
      // Handle subtask status update
      const oldStatus = task.status;

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

        await order.save();
      }

      return res.status(200).json({
        success: true,
        message: 'Task status updated successfully',
        data: task
      });
    }

    // If not a subtask, check if it's an order-level task
    const order = await Order.findOne({
      _id: id,
      'assignedTo.userId': engineerId,
      isDeleted: false
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or not assigned to you'
      });
    }

    const oldStatus = order.status;

    // Update order status
    order.status = status;

    if (status === 'completed') {
      order.actualCompletionDate = new Date();
    }

    // Add internal note about status change
    order.internalNotes.push({
      note: notes || `Status changed from ${oldStatus} to ${status}`,
      addedBy: engineerId,
      addedByName: engineerName,
      timestamp: new Date()
    });

    await order.save();

    // Transform order to task format for response
    const orderTask = {
      _id: order._id,
      orderId: {
        _id: order._id,
        orderNumber: order.orderNumber,
        device: order.device,
        problemDescription: order.problemDescription,
        diagnosedIssues: order.diagnosedIssues,
        stageName: order.stageName,
        status: order.status,
        estimatedCost: order.estimatedCost,
        finalCost: order.finalCost,
        receivedDate: order.receivedDate,
        estimatedCompletionDate: order.estimatedCompletionDate,
        partsUsed: order.partsUsed,
        images: order.images
      },
      title: `Order #${order.orderNumber}`,
      description: order.problemDescription,
      status: order.status,
      progress: order.status === 'completed' ? 100 : order.status === 'in_progress' ? 50 : 0,
      assignedAt: order.assignedTo?.assignedAt || order.createdAt,
      startedAt: order.status === 'in_progress' || order.status === 'completed' ? order.updatedAt : undefined,
      completedAt: order.status === 'completed' ? order.actualCompletionDate : undefined,
      amount: order.estimatedCost,
      isPaid: order.paymentStatus === 'paid',
      partsUsed: order.partsUsed,
      updates: order.internalNotes?.map((note: any) => ({
        note: note.note,
        addedByName: note.addedByName,
        timestamp: note.timestamp,
        type: 'comment'
      })) || [],
      isOrderTask: true
    };

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: orderTask
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating task status',
      error: error.message
    });
  }
};
