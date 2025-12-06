import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Company from '../models/Company';
import Staff from '../models/Staff';

// Get all companies
export const getAllCompanies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const filter: any = {};

    // Super admin can see all companies
    // Regular users (staff/company users) can only see their company
    if (req.user.role !== 'super_admin') {
      // Check if this is a staff or company user
      if (req.user.isStaff) {
        // Staff - can see all companies (or restrict as needed)
        // For now, let staff see all
      } else {
        // Staff member - can only see their company
        const staffMember = await Staff.findById(req.user.id);
        if (!staffMember || !staffMember.companyId) {
          res.status(200).json({
            success: true,
            count: 0,
            total: 0,
            page: Number(page),
            pages: 0,
            data: []
          });
          return;
        }
        filter._id = staffMember.companyId;
      }
    }

    if (search) {
      filter.$or = [
        { companyName: new RegExp(search as string, 'i') },
        { gstin: new RegExp(search as string, 'i') },
        { phone: new RegExp(search as string, 'i') }
      ];
    }

    const companies = await Company.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('createdBy', 'fullName email');

    const total = await Company.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: companies.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: companies
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get company by ID
export const getCompanyById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('createdBy', 'fullName email');

    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    // Check if user has access to this company
    if (req.user.role !== 'super_admin' && !req.user.isStaff) {
      const staffMember = await Staff.findById(req.user.id);
      if (!staffMember || staffMember.companyId.toString() !== company._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'You do not have access to this company'
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      data: company
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Create company
export const createCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      companyName,
      gstin,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      defaultGstRate,
      logo,
      termsAndConditions
    } = req.body;

    // Check if GSTIN already exists
    const existingCompany = await Company.findOne({ gstin });
    if (existingCompany) {
      res.status(400).json({
        success: false,
        message: 'Company with this GSTIN already exists'
      });
      return;
    }

    const company = await Company.create({
      companyName,
      gstin,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      defaultGstRate: defaultGstRate || 18,
      logo,
      termsAndConditions,
      createdBy: req.user.id
    });

    // Note: Creator is tracked in company.createdBy
    // If creator is staff, they don't need to be added as company user
    // Staff users have access to all companies

    res.status(201).json({
      success: true,
      data: company,
      message: 'Company created successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Update company
export const updateCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    // Check if user has admin access to this company
    if (req.user.role !== 'super_admin' && !req.user.isStaff) {
      const staffMember = await Staff.findById(req.user.id);
      if (!staffMember ||
          staffMember.companyId.toString() !== company._id.toString() ||
          staffMember.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'You do not have admin access to this company'
        });
        return;
      }
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedCompany,
      message: 'Company updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Delete company
export const deleteCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    // Only super admin can delete companies
    if (req.user.role !== 'super_admin') {
      res.status(403).json({
        success: false,
        message: 'Only super admin can delete companies'
      });
      return;
    }

    await Company.findByIdAndDelete(req.params.id);

    // Delete all staff members for this company
    await Staff.deleteMany({ companyId: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get company users
export const getCompanyUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;
    const { role, page = 1, limit = 10 } = req.query;

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    // Check if user has access to this company
    if (req.user.role !== 'super_admin' && !req.user.isStaff) {
      const staffMember = await Staff.findById(req.user.id);
      if (!staffMember || staffMember.companyId.toString() !== companyId) {
        res.status(403).json({
          success: false,
          message: 'You do not have access to this company'
        });
        return;
      }
    }

    const filter: any = {
      companyId: companyId,
      status: 'active'
    };

    if (role) {
      filter.role = role;
    }

    const users = await Staff.find(filter)
      .select('-password')
      .populate('companyId', 'companyName')
      .sort({ fullName: 1 })
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
