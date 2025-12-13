import { Response } from 'express';
import Order from '../models/Order';
import Payment from '../models/Payment';
import Staff from '../models/Staff';
import Customer from '../models/Customer';
import SubTask from '../models/SubTask';
import { AuthRequest } from '../middleware/auth';

export const getDashboardAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter: any = {};

    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    // Total orders
    const totalOrders = await Order.countDocuments({
      isDeleted: false,
      ...dateFilter
    });

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $match: {
          isDeleted: false,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Orders by device type
    const ordersByDeviceType = await Order.aggregate([
      {
        $match: {
          isDeleted: false,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            deviceTypeId: '$device.deviceTypeId',
            deviceTypeName: '$device.deviceTypeName'
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: '$finalCost' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Revenue stats
    const revenueStats = await Order.aggregate([
      {
        $match: {
          isDeleted: false,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalCost' },
          totalEstimated: { $sum: '$estimatedCost' },
          totalAdvance: { $sum: '$advancePayment' },
          totalBalance: { $sum: '$balancePayment' }
        }
      }
    ]);

    // Payments summary
    const paymentStats = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Technician performance
    const technicianPerformance = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          actualCompletionDate: dateFilter.createdAt || { $exists: true }
        }
      },
      {
        $group: {
          _id: '$assignedTo.technicianId',
          technicianName: { $first: '$assignedTo.technicianName' },
          totalOrders: { $sum: 1 },
          avgCompletionTime: {
            $avg: {
              $divide: [
                { $subtract: ['$actualCompletionDate', '$receivedDate'] },
                1000 * 60 * 60 * 24
              ]
            }
          },
          totalRevenue: { $sum: '$finalCost' }
        }
      },
      {
        $sort: { totalOrders: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Popular services
    const popularServices = await Order.aggregate([
      {
        $match: {
          isDeleted: false,
          ...dateFilter
        }
      },
      {
        $unwind: '$services'
      },
      {
        $group: {
          _id: {
            serviceTypeId: '$services.serviceTypeId',
            serviceTypeName: '$services.serviceTypeName'
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: '$services.actualCost' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Revenue trends (by month)
    const revenueTrends = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' }
          },
          totalRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Active engineers count (formerly technicians)
    const activeEngineers = await Staff.countDocuments({
      role: 'engineer',
      status: 'active'
    });

    // Total customers
    const totalCustomers = await Customer.countDocuments({
      status: 'active'
    });

    // ======= TASK/SUBTASK ANALYTICS =======

    // All subtasks statistics
    const allSubTasks = await SubTask.find({ isDeleted: false, ...dateFilter });
    const taskStats = {
      totalTasks: allSubTasks.length,
      pendingTasks: allSubTasks.filter(t => t.status === 'pending').length,
      inProgressTasks: allSubTasks.filter(t => t.status === 'in_progress').length,
      completedTasks: allSubTasks.filter(t => t.status === 'completed').length,
      blockedTasks: allSubTasks.filter(t => t.status === 'blocked').length,
      cancelledTasks: allSubTasks.filter(t => t.status === 'cancelled').length,
      onHoldTasks: allSubTasks.filter(t => t.status === 'on_hold').length,
    };

    // Tasks by type
    const tasksByType = await SubTask.aggregate([
      {
        $match: { isDeleted: false, ...dateFilter }
      },
      {
        $group: {
          _id: '$taskTypeName',
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Engineer workload distribution
    const engineerWorkload = await SubTask.aggregate([
      {
        $match: {
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          engineerName: { $first: '$assignedToName' },
          totalAssigned: { $sum: 1 },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
          },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalActiveTasks: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'in_progress']] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { totalActiveTasks: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Task completion trends (last 7 days)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const taskCompletionTrend = await SubTask.aggregate([
      {
        $match: {
          isDeleted: false,
          status: 'completed',
          completedAt: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' },
            day: { $dayOfMonth: '$completedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // ======= CRITICAL ITEMS =======

    // Overdue tasks (tasks past due date and not completed)
    const now = new Date();
    const overdueTasks = await SubTask.find({
      isDeleted: false,
      status: { $nin: ['completed', 'cancelled'] },
      dueDate: { $lt: now }
    })
      .populate('orderId', 'orderNumber customer.name')
      .populate('assignedTo', 'fullName')
      .select('title dueDate status orderNumber assignedToName orderId')
      .sort({ dueDate: 1 })
      .limit(10);

    // Urgent orders (priority: urgent and not completed)
    const urgentOrders = await Order.find({
      isDeleted: false,
      priority: 'urgent',
      status: { $nin: ['completed', 'cancelled'] }
    })
      .select('orderNumber customer.name priority status receivedDate assignedTo')
      .sort({ receivedDate: 1 })
      .limit(10);

    // Blocked tasks
    const blockedTasks = await SubTask.find({
      isDeleted: false,
      status: 'blocked'
    })
      .populate('orderId', 'orderNumber customer.name')
      .populate('assignedTo', 'fullName')
      .select('title status blockedBy orderNumber assignedToName orderId')
      .sort({ updatedAt: -1 })
      .limit(10);

    // Orders with no assignment (todo)
    const todoOrders = await Order.find({
      isDeleted: false,
      assignedTo: { $exists: false },
      status: { $nin: ['completed', 'cancelled'] }
    })
      .select('orderNumber customer.name priority status receivedDate')
      .sort({ priority: -1, receivedDate: 1 })
      .limit(10);

    // Orders with pending payment (high balance)
    const pendingPayments = await Order.find({
      isDeleted: false,
      paymentStatus: { $in: ['unpaid', 'partial'] },
      balancePayment: { $gt: 0 }
    })
      .select('orderNumber customer.name customer.phone balancePayment estimatedCost paymentStatus')
      .sort({ balancePayment: -1 })
      .limit(10);

    // ======= ORDER PRIORITY BREAKDOWN =======
    const ordersByPriority = await Order.aggregate([
      {
        $match: {
          isDeleted: false,
          status: { $nin: ['completed', 'cancelled'] },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // ======= ORDER TRENDS (last 30 days) =======
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const orderTrends = await Order.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: { $gte: last30Days }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$finalCost', '$estimatedCost'] } }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        ordersByStatus,
        ordersByDeviceType,
        ordersByPriority,
        revenue: revenueStats[0] || {
          totalRevenue: 0,
          totalEstimated: 0,
          totalAdvance: 0,
          totalBalance: 0
        },
        payments: paymentStats[0] || { totalPayments: 0, count: 0 },
        technicianPerformance,
        popularServices,
        revenueTrends,
        orderTrends,
        activeEngineers,
        totalCustomers,

        // Task/SubTask Analytics
        taskStats,
        tasksByType,
        engineerWorkload,
        taskCompletionTrend,

        // Critical Items
        criticalItems: {
          overdueTasks,
          urgentOrders,
          blockedTasks,
          todoOrders,
          pendingPayments
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getRecentActivities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = 20 } = req.query;

    const recentOrders = await Order.find({ isDeleted: false })
      .select('orderNumber customer.name status createdAt')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: recentOrders
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
