import { Request, Response } from 'express';
import Stage from '../models/Stage';

// Get all stages
export const getStages = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const filter: any = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const stages = await Stage.find(filter).sort({ order: 1 });
    res.json({ success: true, data: stages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get stage by ID
export const getStageById = async (req: Request, res: Response) => {
  try {
    const stage = await Stage.findById(req.params.id);
    if (!stage) {
      return res.status(404).json({ success: false, message: 'Stage not found' });
    }
    res.json({ success: true, data: stage });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create stage
export const createStage = async (req: Request, res: Response) => {
  try {
    const { name, description, order, color, isFinal } = req.body;

    // Generate slug from name
    const slug = name.toLowerCase().replace(/\s+/g, '_');

    // Check if slug already exists
    const existingStage = await Stage.findOne({ slug });
    if (existingStage) {
      return res.status(400).json({ success: false, message: 'Stage with this name already exists' });
    }

    const stage = new Stage({
      name,
      slug,
      description,
      order,
      color: color || '#7C3AED',
      isFinal: isFinal || false
    });

    await stage.save();
    res.status(201).json({ success: true, data: stage });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update stage
export const updateStage = async (req: Request, res: Response) => {
  try {
    const { name, description, order, color, isFinal, isActive } = req.body;

    const updateData: any = {};
    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/\s+/g, '_');
    }
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;
    if (color) updateData.color = color;
    if (isFinal !== undefined) updateData.isFinal = isFinal;
    if (isActive !== undefined) updateData.isActive = isActive;

    const stage = await Stage.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!stage) {
      return res.status(404).json({ success: false, message: 'Stage not found' });
    }

    res.json({ success: true, data: stage });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete stage
export const deleteStage = async (req: Request, res: Response) => {
  try {
    const stage = await Stage.findByIdAndDelete(req.params.id);
    if (!stage) {
      return res.status(404).json({ success: false, message: 'Stage not found' });
    }
    res.json({ success: true, message: 'Stage deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Seed default stages
export const seedStages = async (req: Request, res: Response) => {
  try {
    const existingCount = await Stage.countDocuments();
    if (existingCount > 0) {
      return res.status(400).json({ success: false, message: 'Stages already exist' });
    }

    const defaultStages = [
      { name: 'Pending', slug: 'pending', order: 1, color: '#F59E0B', isFinal: false },
      { name: 'Assigned', slug: 'assigned', order: 2, color: '#3B82F6', isFinal: false },
      { name: 'In Diagnosis', slug: 'in_diagnosis', order: 3, color: '#8B5CF6', isFinal: false },
      { name: 'Awaiting Approval', slug: 'awaiting_approval', order: 4, color: '#F97316', isFinal: false },
      { name: 'Approved', slug: 'approved', order: 5, color: '#10B981', isFinal: false },
      { name: 'In Progress', slug: 'in_progress', order: 6, color: '#6366F1', isFinal: false },
      { name: 'Parts Ordered', slug: 'parts_ordered', order: 7, color: '#EC4899', isFinal: false },
      { name: 'Quality Check', slug: 'quality_check', order: 8, color: '#14B8A6', isFinal: false },
      { name: 'Completed', slug: 'completed', order: 9, color: '#22C55E', isFinal: false },
      { name: 'Ready for Pickup', slug: 'ready_for_pickup', order: 10, color: '#84CC16', isFinal: false },
      { name: 'Delivered', slug: 'delivered', order: 11, color: '#10B981', isFinal: true },
      { name: 'Cancelled', slug: 'cancelled', order: 12, color: '#EF4444', isFinal: true },
      { name: 'On Hold', slug: 'on_hold', order: 13, color: '#6B7280', isFinal: false }
    ];

    await Stage.insertMany(defaultStages);
    res.status(201).json({ success: true, message: 'Default stages created', data: defaultStages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
