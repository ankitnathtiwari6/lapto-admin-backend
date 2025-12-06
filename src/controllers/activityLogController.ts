import { Response } from 'express';
import OrderActivityLog from '../models/OrderActivityLog';
import { AuthRequest } from '../middleware/auth';

// Get activity logs for a specific order
export const getOrderActivityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { limit = 50, offset = 0, activityType } = req.query;

    const filter: any = { orderId };

    // Optional filter by activity type
    if (activityType) {
      filter.activityType = activityType;
    }

    const activities = await OrderActivityLog.find(filter)
      .sort({ createdAt: -1 }) // Most recent first
      .limit(Number(limit))
      .skip(Number(offset));

    const totalCount = await OrderActivityLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + activities.length < totalCount
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get activity logs for a company
export const getCompanyActivityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.companyId;
    const { limit = 100, offset = 0, activityType, startDate, endDate } = req.query;

    if (!companyId) {
      res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
      return;
    }

    const filter: any = { companyId };

    // Optional filter by activity type
    if (activityType) {
      filter.activityType = activityType;
    }

    // Optional date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate as string);
      }
    }

    const activities = await OrderActivityLog.find(filter)
      .sort({ createdAt: -1 }) // Most recent first
      .limit(Number(limit))
      .skip(Number(offset));

    const totalCount = await OrderActivityLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + activities.length < totalCount
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get activity logs for a specific subtask
export const getSubTaskActivityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subTaskId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const activities = await OrderActivityLog.find({ subTaskId })
      .sort({ createdAt: -1 }) // Most recent first
      .limit(Number(limit))
      .skip(Number(offset));

    const totalCount = await OrderActivityLog.countDocuments({ subTaskId });

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + activities.length < totalCount
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
