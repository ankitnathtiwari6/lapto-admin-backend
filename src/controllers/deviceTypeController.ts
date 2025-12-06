import { Response } from 'express';
import DeviceType from '../models/DeviceType';
import { AuthRequest } from '../middleware/auth';

export const createDeviceType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deviceType = await DeviceType.create({
      ...req.body,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: deviceType
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getAllDeviceTypes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isActive } = req.query;
    const filter: any = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const deviceTypes = await DeviceType.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: deviceTypes.length,
      data: deviceTypes
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getDeviceTypeById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deviceType = await DeviceType.findById(req.params.id);

    if (!deviceType) {
      res.status(404).json({
        success: false,
        message: 'Device type not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: deviceType
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const updateDeviceType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deviceType = await DeviceType.findById(req.params.id);

    if (!deviceType) {
      res.status(404).json({
        success: false,
        message: 'Device type not found'
      });
      return;
    }

    const oldData = { ...deviceType.toObject() };
    const updatedDeviceType = await DeviceType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedDeviceType
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const deleteDeviceType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deviceType = await DeviceType.findById(req.params.id);

    if (!deviceType) {
      res.status(404).json({
        success: false,
        message: 'Device type not found'
      });
      return;
    }

    await DeviceType.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Device type deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const seedDeviceTypes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const defaultDeviceTypes = [
      {
        name: 'Laptop',
        slug: 'laptop',
        requiresSerialNumber: true,
        requiresIMEI: false,
        requiresPassword: true,
        fieldDefinitions: [
          { fieldName: 'ram', fieldLabel: 'RAM', fieldType: 'dropdown', isRequired: false, options: ['4GB', '8GB', '16GB', '32GB'] },
          { fieldName: 'storage', fieldLabel: 'Storage', fieldType: 'dropdown', isRequired: false, options: ['256GB', '512GB', '1TB', '2TB'] }
        ],
        isActive: true
      },
      {
        name: 'Desktop',
        slug: 'desktop',
        requiresSerialNumber: true,
        requiresIMEI: false,
        requiresPassword: true,
        fieldDefinitions: [
          { fieldName: 'ram', fieldLabel: 'RAM', fieldType: 'dropdown', isRequired: false, options: ['4GB', '8GB', '16GB', '32GB', '64GB'] },
          { fieldName: 'storage', fieldLabel: 'Storage', fieldType: 'dropdown', isRequired: false, options: ['256GB', '512GB', '1TB', '2TB', '4TB'] }
        ],
        isActive: true
      },
      {
        name: 'Mobile Phone',
        slug: 'mobile-phone',
        requiresSerialNumber: false,
        requiresIMEI: true,
        requiresPassword: true,
        fieldDefinitions: [
          { fieldName: 'storage', fieldLabel: 'Storage', fieldType: 'dropdown', isRequired: false, options: ['64GB', '128GB', '256GB', '512GB'] }
        ],
        isActive: true
      },
      {
        name: 'Tablet',
        slug: 'tablet',
        requiresSerialNumber: true,
        requiresIMEI: true,
        requiresPassword: true,
        fieldDefinitions: [
          { fieldName: 'storage', fieldLabel: 'Storage', fieldType: 'dropdown', isRequired: false, options: ['64GB', '128GB', '256GB', '512GB'] }
        ],
        isActive: true
      },
      {
        name: 'Printer',
        slug: 'printer',
        requiresSerialNumber: true,
        requiresIMEI: false,
        requiresPassword: false,
        fieldDefinitions: [
          { fieldName: 'type', fieldLabel: 'Printer Type', fieldType: 'dropdown', isRequired: false, options: ['Inkjet', 'Laser', 'Dot Matrix', 'Thermal'] }
        ],
        isActive: true
      },
      {
        name: 'Monitor',
        slug: 'monitor',
        requiresSerialNumber: true,
        requiresIMEI: false,
        requiresPassword: false,
        fieldDefinitions: [
          { fieldName: 'size', fieldLabel: 'Screen Size', fieldType: 'dropdown', isRequired: false, options: ['21"', '24"', '27"', '32"', '34"'] }
        ],
        isActive: true
      }
    ];

    const createdDeviceTypes = [];
    for (const dt of defaultDeviceTypes) {
      const existing = await DeviceType.findOne({ slug: dt.slug });
      if (!existing) {
        const created = await DeviceType.create({ ...dt, createdBy: req.user.id });
        createdDeviceTypes.push(created);
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdDeviceTypes.length} device types seeded successfully`,
      data: createdDeviceTypes
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
