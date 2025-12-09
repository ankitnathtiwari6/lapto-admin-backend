import { Response } from 'express';
import OutcomeType from '../models/OutcomeType';
import { AuthRequest } from '../middleware/auth';

// @desc    Get all outcome types
// @route   GET /api/outcome-types
// @access  Private
export const getAllOutcomeTypes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user.companyId;
    const { isActive } = req.query;

    const filter: any = { companyId };
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const outcomeTypes = await OutcomeType.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: outcomeTypes
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get outcome type by ID
// @route   GET /api/outcome-types/:id
// @access  Private
export const getOutcomeTypeById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const outcomeType = await OutcomeType.findById(req.params.id);

    if (!outcomeType) {
      res.status(404).json({
        success: false,
        message: 'Outcome type not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: outcomeType
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Create outcome type
// @route   POST /api/outcome-types
// @access  Private
export const createOutcomeType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user.companyId;
    const { name, description, color, icon, isActive } = req.body;

    // Check if outcome type with same name exists
    const existingOutcomeType = await OutcomeType.findOne({
      companyId,
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingOutcomeType) {
      res.status(400).json({
        success: false,
        message: 'Outcome type with this name already exists'
      });
      return;
    }

    const outcomeType = await OutcomeType.create({
      name,
      description,
      color,
      icon,
      isActive: isActive !== undefined ? isActive : true,
      companyId,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Outcome type created successfully',
      data: outcomeType
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update outcome type
// @route   PUT /api/outcome-types/:id
// @access  Private
export const updateOutcomeType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, color, icon, isActive } = req.body;

    const outcomeType = await OutcomeType.findById(req.params.id);

    if (!outcomeType) {
      res.status(404).json({
        success: false,
        message: 'Outcome type not found'
      });
      return;
    }

    // Check if updating name to an existing one
    if (name && name !== outcomeType.name) {
      const existingOutcomeType = await OutcomeType.findOne({
        companyId: outcomeType.companyId,
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });

      if (existingOutcomeType) {
        res.status(400).json({
          success: false,
          message: 'Outcome type with this name already exists'
        });
        return;
      }
    }

    if (name !== undefined) outcomeType.name = name;
    if (description !== undefined) outcomeType.description = description;
    if (color !== undefined) outcomeType.color = color;
    if (icon !== undefined) outcomeType.icon = icon;
    if (isActive !== undefined) outcomeType.isActive = isActive;

    await outcomeType.save();

    res.status(200).json({
      success: true,
      message: 'Outcome type updated successfully',
      data: outcomeType
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Delete outcome type
// @route   DELETE /api/outcome-types/:id
// @access  Private
export const deleteOutcomeType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const outcomeType = await OutcomeType.findById(req.params.id);

    if (!outcomeType) {
      res.status(404).json({
        success: false,
        message: 'Outcome type not found'
      });
      return;
    }

    await outcomeType.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Outcome type deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
