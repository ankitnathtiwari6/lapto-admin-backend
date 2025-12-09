import { Response } from 'express';
import TaskType from '../models/TaskType';
import { AuthRequest } from '../middleware/auth';

export const getAllTaskTypes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isActive, companyId } = req.query;
    const filter: any = {};

    // Filter by company
    const targetCompanyId = companyId || req.companyId;
    if (targetCompanyId) {
      filter.companyId = targetCompanyId;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const taskTypes = await TaskType.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: taskTypes.length,
      data: taskTypes
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getTaskTypeById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskType = await TaskType.findById(req.params.id);

    if (!taskType) {
      res.status(404).json({
        success: false,
        message: 'Task type not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: taskType
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const createTaskType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.body.companyId || req.companyId;
    if (!companyId) {
      res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
      return;
    }

    const taskType = await TaskType.create({
      ...req.body,
      companyId,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: taskType
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const updateTaskType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskType = await TaskType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!taskType) {
      res.status(404).json({
        success: false,
        message: 'Task type not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: taskType
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const deleteTaskType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskType = await TaskType.findByIdAndDelete(req.params.id);

    if (!taskType) {
      res.status(404).json({
        success: false,
        message: 'Task type not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Task type deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
