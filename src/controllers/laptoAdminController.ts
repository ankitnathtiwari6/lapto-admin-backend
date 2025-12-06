import { Request, Response } from 'express';
import Company from '../models/Company';
import Staff from '../models/Staff';

// Middleware to verify Lapto Admin password
const verifyLaptoAdminPassword = (password: string): boolean => {
  const adminPassword = process.env.LAPTO_ADMIN_PASSWORD || '12345';
  return password === adminPassword;
};

// Create a company (no auth required, only password)
export const createCompanyAsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password, companyData } = req.body;

    // Verify admin password
    if (!password || !verifyLaptoAdminPassword(password)) {
      res.status(401).json({
        success: false,
        message: 'Invalid Lapto Admin password'
      });
      return;
    }

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
    } = companyData;

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
      createdBy: null // Lapto Admin created - no specific user reference needed
    });

    res.status(201).json({
      success: true,
      data: company,
      message: 'Company created successfully by Lapto Admin'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Add staff member to company (no auth required, only password)
export const addCompanyUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password, userData } = req.body;

    // Verify admin password
    if (!password || !verifyLaptoAdminPassword(password)) {
      res.status(401).json({
        success: false,
        message: 'Invalid Lapto Admin password'
      });
      return;
    }

    const {
      fullName,
      email,
      phone,
      password: userPassword,
      role,
      companyId,
      status
    } = userData;

    // Validate companyId exists
    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    // Check if staff member with same phone and companyId exists
    const existingUser = await Staff.findOne({ phone, companyId });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Staff member with this phone number already exists in this company'
      });
      return;
    }

    const staffMember = await Staff.create({
      fullName,
      email,
      phone,
      password: userPassword,
      role,
      companyId,
      status: status || 'active'
    });

    // Remove password from response
    const userResponse = staffMember.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: userResponse,
      message: 'Staff member created successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Remove staff member (no auth required, only password)
export const removeCompanyUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.body;
    const { userId } = req.params;

    // Verify admin password
    if (!password || !verifyLaptoAdminPassword(password)) {
      res.status(401).json({
        success: false,
        message: 'Invalid Lapto Admin password'
      });
      return;
    }

    const user = await Staff.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
      return;
    }

    await Staff.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'Staff member removed successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Update staff member (no auth required, only password)
export const updateCompanyUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password, userData } = req.body;
    const { userId } = req.params;

    // Verify admin password
    if (!password || !verifyLaptoAdminPassword(password)) {
      res.status(401).json({
        success: false,
        message: 'Invalid Lapto Admin password'
      });
      return;
    }

    const user = await Staff.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
      return;
    }

    const updatedUser = await Staff.findByIdAndUpdate(
      userId,
      userData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Staff member updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get all companies (no auth required, only password)
export const getAllCompaniesAsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.query;

    // Verify admin password
    if (!password || !verifyLaptoAdminPassword(password as string)) {
      res.status(401).json({
        success: false,
        message: 'Invalid Lapto Admin password'
      });
      return;
    }

    const { page = 1, limit = 10, search } = req.query;
    const filter: any = {};

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
      .limit(Number(limit));

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

// Get staff members by company ID (no auth required, only password)
export const getCompanyUsersAsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.query;
    const { companyId } = req.params;

    // Verify admin password
    if (!password || !verifyLaptoAdminPassword(password as string)) {
      res.status(401).json({
        success: false,
        message: 'Invalid Lapto Admin password'
      });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    const users = await Staff.find({ companyId })
      .select('-password')
      .populate('companyId', 'companyName gstin')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Delete a company (no auth required, only password)
export const deleteCompanyAsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.body;
    const { companyId } = req.params;

    // Verify admin password
    if (!password || !verifyLaptoAdminPassword(password)) {
      res.status(401).json({
        success: false,
        message: 'Invalid Lapto Admin password'
      });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    await Company.findByIdAndDelete(companyId);
    await Staff.deleteMany({ companyId });

    res.status(200).json({
      success: true,
      message: 'Company and all its staff members deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
