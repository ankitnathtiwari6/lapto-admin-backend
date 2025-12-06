import { Response } from 'express';
import ServiceType from '../models/ServiceType';
import { AuthRequest } from '../middleware/auth';

export const createServiceType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const serviceType = await ServiceType.create(req.body);

    res.status(201).json({
      success: true,
      data: serviceType
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getAllServiceTypes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isActive, deviceTypeId } = req.query;
    const filter: any = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (deviceTypeId) {
      filter.applicableDeviceTypes = deviceTypeId;
    }

    const serviceTypes = await ServiceType.find(filter)
      .populate('applicableDeviceTypes', 'name slug')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: serviceTypes.length,
      data: serviceTypes
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getServiceTypeById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const serviceType = await ServiceType.findById(req.params.id)
      .populate('applicableDeviceTypes', 'name slug');

    if (!serviceType) {
      res.status(404).json({
        success: false,
        message: 'Service type not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: serviceType
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const updateServiceType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const serviceType = await ServiceType.findById(req.params.id);

    if (!serviceType) {
      res.status(404).json({
        success: false,
        message: 'Service type not found'
      });
      return;
    }

    const updatedServiceType = await ServiceType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedServiceType
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const deleteServiceType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const serviceType = await ServiceType.findById(req.params.id);

    if (!serviceType) {
      res.status(404).json({
        success: false,
        message: 'Service type not found'
      });
      return;
    }

    await ServiceType.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Service type deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const searchServiceTypes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
      return;
    }

    const searchRegex = new RegExp(query, 'i');
    const serviceTypes = await ServiceType.find({
      isActive: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex }
      ]
    })
      .limit(10)
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: serviceTypes.length,
      data: serviceTypes
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const seedServiceTypes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const defaultServiceTypes = [
      {
        name: 'Screen Replacement',
        slug: 'screen-replacement',
        description: 'Complete screen/display replacement service',
        estimatedDuration: 2,
        category: 'Hardware',
        warrantyPeriod: 90,
        isActive: true
      },
      {
        name: 'Battery Replacement',
        slug: 'battery-replacement',
        description: 'Replace old or damaged battery with new one',
        estimatedDuration: 1,
        category: 'Hardware',
        warrantyPeriod: 180,
        isActive: true
      },
      {
        name: 'Keyboard Replacement',
        slug: 'keyboard-replacement',
        description: 'Replace damaged or non-working keyboard',
        estimatedDuration: 2,
        category: 'Hardware',
        warrantyPeriod: 90,
        isActive: true
      },
      {
        name: 'OS Installation',
        slug: 'os-installation',
        description: 'Fresh operating system installation',
        estimatedDuration: 2,
        category: 'Software',
        warrantyPeriod: 30,
        isActive: true
      },
      {
        name: 'Virus Removal',
        slug: 'virus-removal',
        description: 'Complete virus and malware removal',
        estimatedDuration: 1,
        category: 'Software',
        warrantyPeriod: 30,
        isActive: true
      },
      {
        name: 'Data Recovery',
        slug: 'data-recovery',
        description: 'Recover lost or deleted data',
        estimatedDuration: 4,
        category: 'Data',
        warrantyPeriod: 0,
        isActive: true
      },
      {
        name: 'RAM Upgrade',
        slug: 'ram-upgrade',
        description: 'Upgrade system RAM for better performance',
        estimatedDuration: 1,
        category: 'Hardware',
        warrantyPeriod: 365,
        isActive: true
      },
      {
        name: 'SSD Upgrade',
        slug: 'ssd-upgrade',
        description: 'Upgrade to faster SSD storage',
        estimatedDuration: 2,
        category: 'Hardware',
        warrantyPeriod: 365,
        isActive: true
      },
      {
        name: 'Motherboard Repair',
        slug: 'motherboard-repair',
        description: 'Diagnose and repair motherboard issues',
        estimatedDuration: 4,
        category: 'Hardware',
        warrantyPeriod: 90,
        isActive: true
      },
      {
        name: 'General Checkup',
        slug: 'general-checkup',
        description: 'Complete system diagnostic and cleaning',
        estimatedDuration: 1,
        category: 'Maintenance',
        warrantyPeriod: 7,
        isActive: true
      }
    ];

    const createdServiceTypes = [];
    for (const st of defaultServiceTypes) {
      const existing = await ServiceType.findOne({ slug: st.slug });
      if (!existing) {
        const created = await ServiceType.create(st);
        createdServiceTypes.push(created);
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdServiceTypes.length} service types seeded successfully`,
      data: createdServiceTypes
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
