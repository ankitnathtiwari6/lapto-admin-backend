import { Response } from 'express';
import Staff from '../models/Staff';
import SubTask from '../models/SubTask';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const users = await Staff.find(filter)
      .select('-password')
      .populate('companyId', 'companyName gstin')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Staff.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: users
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await Staff.findById(req.params.id)
      .select('-password')
      .populate('companyId', 'companyName gstin');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Require companyId
    if (!req.body.companyId && !req.companyId) {
      res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
      return;
    }

    const userData = {
      ...req.body,
      companyId: req.body.companyId || req.companyId
    };

    const user = await Staff.create(userData);

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await Staff.findById(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Update user fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'companyId') {
        (user as any)[key] = req.body[key];
      }
    });

    // Save the user (this triggers the pre-save hook to hash password if changed)
    await user.save();

    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;

    res.status(200).json({
      success: true,
      data: userObject
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await Staff.findById(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    await Staff.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
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
      .sort({ createdAt: -1 })
      .lean();

    // Get task statistics for each engineer
    const engineerIds = engineers.map(e => e._id);

    // Get subtask stats using aggregation
    const subTaskStats = await SubTask.aggregate([
      {
        $match: {
          assignedTo: { $in: engineerIds },
          isDeleted: false,
          status: { $in: ['pending', 'in_progress', 'completed'] }
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      }
    ]);

    // Get order-level task stats using aggregation (orders without subtasks)
    const orderStats = await Order.aggregate([
      {
        $match: {
          'assignedTo.userId': { $in: engineerIds },
          isDeleted: false,
          status: { $in: ['pending', 'in_progress', 'completed'] }
        }
      },
      {
        $lookup: {
          from: 'subtasks',
          localField: '_id',
          foreignField: 'orderId',
          as: 'subtasks',
          pipeline: [{ $match: { isDeleted: false } }]
        }
      },
      {
        $match: {
          subtasks: { $size: 0 }
        }
      },
      {
        $group: {
          _id: '$assignedTo.userId',
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      }
    ]);

    // Combine stats
    const statsMap = new Map<string, any>();

    [...subTaskStats, ...orderStats].forEach(stat => {
      const engineerId = stat._id.toString();
      if (!statsMap.has(engineerId)) {
        statsMap.set(engineerId, { pending: 0, in_progress: 0, completed: 0 });
      }
      const currentStats = statsMap.get(engineerId);
      currentStats.pending += stat.pending;
      currentStats.in_progress += stat.in_progress;
      currentStats.completed += stat.completed;
    });

    // Add engineerDetails to each engineer
    const engineersWithDetails = engineers.map(engineer => {
      const stats = statsMap.get(engineer._id.toString()) || { pending: 0, in_progress: 0, completed: 0 };
      return {
        ...engineer,
        engineerDetails: {
          currentWorkload: stats.pending + stats.in_progress,
          totalRepairsCompleted: stats.completed,
          rating: 4.5, // Default rating - can be updated later from a ratings system
          employeeId: `ENG-${engineer._id.toString().slice(-6).toUpperCase()}`, // Generate employee ID from MongoDB _id
          specialization: [] // Default empty - can be added to Staff model later
        }
      };
    });

    res.status(200).json({
      success: true,
      count: engineersWithDetails.length,
      data: engineersWithDetails
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
