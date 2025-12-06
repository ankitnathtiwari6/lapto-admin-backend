import { Response } from 'express';
import Order from '../models/Order';
import Payment from '../models/Payment';
import Staff from '../models/Staff';
import Customer from '../models/Customer';
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

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        ordersByStatus,
        ordersByDeviceType,
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
        activeEngineers,
        totalCustomers
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
