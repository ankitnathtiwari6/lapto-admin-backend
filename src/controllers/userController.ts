import { Response } from 'express';
import Staff from '../models/Staff';
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

    const updatedUser = await Staff.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser
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
