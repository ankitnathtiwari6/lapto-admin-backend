import { Response } from 'express';
import Staff from '../models/Staff';
import Order from '../models/Order';
import SubTask from '../models/SubTask';
import { AuthRequest } from '../middleware/auth';

export const getAllStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, status, page = 1, limit = 10, search, companyId } = req.query;
    const filter: any = {};

    // Filter by company if provided or from context
    const targetCompanyId = companyId || req.companyId;
    if (targetCompanyId) {
      filter.companyId = targetCompanyId;
    }

    // Support filtering by role
    if (role) {
      const roles = (role as string).split(',').map(r => r.trim());
      filter.role = { $in: roles };
    }

    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { fullName: new RegExp(search as string, 'i') },
        { phone: new RegExp(search as string, 'i') },
        { email: new RegExp(search as string, 'i') }
      ];
    }

    const staff = await Staff.find(filter)
      .select('-password')
      .populate('companyId', 'companyName gstin')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Staff.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: staff.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: staff
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getEngineers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: any = {
      role: 'engineer',
      status: 'active'
    };

    // Filter by company if provided
    const companyId = req.query.companyId || req.companyId;
    if (companyId) {
      filter.companyId = companyId;
    }

    const engineers = await Staff.find(filter)
      .select('-password')
      .populate('companyId', 'companyName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: engineers.length,
      data: engineers
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getStaffById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await Staff.findById(req.params.id)
      .select('-password')
      .populate('companyId', 'companyName gstin');

    if (!staff) {
      res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: staff
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const createStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Require companyId
    if (!req.body.companyId && !req.companyId) {
      res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
      return;
    }

    const staffData = {
      ...req.body,
      companyId: req.body.companyId || req.companyId
    };

    const staff = await Staff.create(staffData);

    res.status(201).json({
      success: true,
      data: staff
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const updateStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
      return;
    }

    // Don't allow password update through this endpoint
    if (req.body.password) delete req.body.password;

    const updatedStaff = await Staff.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedStaff
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const deleteStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);

    if (!staff) {
      res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: null,
      message: 'Staff member deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Calculate commission for a staff member based on an order
const calculateCommission = (staff: any, orderAmount: number): number => {
  if (!staff.compensationType || staff.compensationType === 'fixed') {
    return 0;
  }

  if (staff.compensationType === 'commission' || staff.compensationType === 'both') {
    if (staff.commissionType === 'percentage') {
      return (orderAmount * (staff.commissionRate || 0)) / 100;
    } else if (staff.commissionType === 'fixed_per_order') {
      return staff.fixedCommissionAmount || 0;
    }
  }

  return 0;
};

// Get all staff with order statistics and commission
export const getStaffWithStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, status, companyId } = req.query;
    const filter: any = {};

    const targetCompanyId = companyId || req.companyId;
    if (targetCompanyId) {
      filter.companyId = targetCompanyId;
    }

    if (role) {
      const roles = (role as string).split(',').map(r => r.trim());
      filter.role = { $in: roles };
    }

    if (status) {
      filter.status = status;
    }

    const staffMembers = await Staff.find(filter).select('-password').lean();

    // Get order statistics for each staff member
    const staffWithStats = await Promise.all(
      staffMembers.map(async (staff) => {
        const orders = await Order.find({
          'assignedTo.userId': staff._id,
          isDeleted: false
        }).lean();

        const totalOrders = orders.length;
        const completedOrders = orders.filter(order =>
          order.stageName?.toLowerCase().includes('completed') ||
          order.stageName?.toLowerCase().includes('delivered')
        ).length;

        const pendingOrders = orders.filter(order =>
          !order.stageName?.toLowerCase().includes('completed') &&
          !order.stageName?.toLowerCase().includes('delivered')
        ).length;

        // Calculate total commission earned from orders
        let totalOrderCommission = 0;
        orders.forEach(order => {
          const orderAmount = order.finalCost || order.estimatedCost;
          totalOrderCommission += calculateCommission(staff, orderAmount);
        });

        // Get sub-tasks assigned to this staff member
        const subTasks = await SubTask.find({
          assignedTo: staff._id,
          isDeleted: false
        }).lean();

        const totalSubTasks = subTasks.length;
        const completedSubTasks = subTasks.filter(st => st.status === 'completed').length;
        const pendingSubTasks = subTasks.filter(st => st.status !== 'completed').length;

        // Calculate commission from completed paid sub-tasks
        const totalSubTaskCommission = subTasks
          .filter(st => st.isPaid && st.status === 'completed')
          .reduce((sum, st) => sum + (st.amount || 0), 0);

        // Calculate total order value
        const totalOrderValue = orders.reduce((sum, order) =>
          sum + (order.finalCost || order.estimatedCost), 0
        );

        // Total commission is sum of order commission and sub-task commission
        const totalCommission = totalOrderCommission + totalSubTaskCommission;

        return {
          ...staff,
          orderStats: {
            totalOrders,
            completedOrders,
            pendingOrders,
            totalOrderValue,
            totalOrderCommission,
            totalSubTasks,
            completedSubTasks,
            pendingSubTasks,
            totalSubTaskCommission,
            totalCommission
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      count: staffWithStats.length,
      data: staffWithStats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get detailed orders for a specific staff member with commission breakdown
export const getStaffOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, stageId, fromDate, toDate } = req.query;

    const staff = await Staff.findById(id).select('-password').lean();
    if (!staff) {
      res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
      return;
    }

    // Get sub-tasks assigned to this staff member first
    const subTaskFilter: any = {
      assignedTo: id,
      isDeleted: false
    };

    if (fromDate || toDate) {
      subTaskFilter.createdAt = {};
      if (fromDate) subTaskFilter.createdAt.$gte = new Date(fromDate as string);
      if (toDate) subTaskFilter.createdAt.$lte = new Date(toDate as string);
    }

    const allSubTasks = await SubTask.find(subTaskFilter)
      .populate('orderId', 'orderNumber customer')
      .sort({ createdAt: -1 })
      .lean();

    // Get unique order IDs from subtasks
    const subTaskOrderIds = allSubTasks
      .map(st => st.orderId?._id)
      .filter(Boolean);

    // Build filter for orders: either assigned to staff OR has subtasks assigned to staff
    const filter: any = {
      $or: [
        { 'assignedTo.userId': id },
        { _id: { $in: subTaskOrderIds } }
      ],
      isDeleted: false
    };

    if (stageId) {
      filter.stageId = stageId;
    }

    if (fromDate || toDate) {
      filter.receivedDate = {};
      if (fromDate) filter.receivedDate.$gte = new Date(fromDate as string);
      if (toDate) filter.receivedDate.$lte = new Date(toDate as string);
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('device.deviceTypeId', 'name')
      .lean();

    const total = await Order.countDocuments(filter);

    // Calculate commission for each order and include its subtasks
    const ordersWithCommission = orders.map(order => {
      const orderAmount = order.finalCost || order.estimatedCost;
      const orderCommission = calculateCommission(staff, orderAmount);

      // Find subtasks for this specific order
      const orderSubTasks = allSubTasks.filter(st =>
        st.orderId && st.orderId._id.toString() === order._id.toString()
      );

      // Calculate subtask commission for this order
      const subTaskCommission = orderSubTasks
        .filter(st => st.isPaid && st.status === 'completed')
        .reduce((sum, st) => sum + (st.amount || 0), 0);

      return {
        ...order,
        orderCommission,
        subTaskCommission,
        commission: orderCommission + subTaskCommission,
        subTasks: orderSubTasks.map(st => ({
          _id: st._id,
          title: st.title,
          status: st.status,
          amount: st.amount || 0,
          isPaid: st.isPaid
        })),
        commissionDetails: {
          compensationType: staff.compensationType,
          commissionType: staff.commissionType,
          commissionRate: staff.commissionRate,
          fixedCommissionAmount: staff.fixedCommissionAmount
        }
      };
    });

    // Calculate commission from all sub-tasks
    const totalSubTaskCommission = allSubTasks
      .filter(st => st.isPaid && st.status === 'completed')
      .reduce((sum, st) => sum + (st.amount || 0), 0);

    // Calculate summary
    const totalOrderCommission = ordersWithCommission.reduce((sum, order) => sum + (order.orderCommission || 0), 0);
    const totalOrderValue = ordersWithCommission.reduce((sum, order) =>
      sum + (order.finalCost || order.estimatedCost), 0
    );
    const totalCommission = totalOrderCommission + totalSubTaskCommission;

    res.status(200).json({
      success: true,
      count: ordersWithCommission.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: {
        staff: {
          _id: staff._id,
          fullName: staff.fullName,
          phone: staff.phone,
          email: staff.email,
          role: staff.role,
          compensationType: staff.compensationType,
          fixedSalary: staff.fixedSalary,
          commissionRate: staff.commissionRate,
          commissionType: staff.commissionType,
          fixedCommissionAmount: staff.fixedCommissionAmount
        },
        orders: ordersWithCommission,
        summary: {
          totalOrders: total,
          totalOrderValue,
          totalOrderCommission,
          totalSubTasks: allSubTasks.length,
          completedSubTasks: allSubTasks.filter(st => st.status === 'completed').length,
          totalSubTaskCommission,
          totalCommission,
          averageCommissionPerOrder: total > 0 ? totalOrderCommission / total : 0
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
