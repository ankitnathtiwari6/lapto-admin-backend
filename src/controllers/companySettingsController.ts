import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Company from '../models/Company';

// Get company settings
export const getCompanySettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const company = await Company.findById(req.companyId);

    res.status(200).json({
      success: true,
      data: company
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching company settings'
    });
  }
};

// Create or update company settings
export const upsertCompanySettings = async (req: AuthRequest, res: Response): Promise<void> => {
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

    if (!req.companyId) {
      res.status(400).json({
        success: false,
        message: 'Company ID not found. Please ensure you are associated with a company.'
      });
      return;
    }

    // Update company settings
    const company = await Company.findByIdAndUpdate(
      req.companyId,
      {
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
      },
      { new: true, runValidators: true }
    );

    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: company,
      message: 'Company settings saved successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error saving company settings'
    });
  }
};
