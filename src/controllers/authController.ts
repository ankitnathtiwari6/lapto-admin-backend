import { Request, Response } from 'express';
import Customer, { ICustomer } from '../models/Customer';
import Staff, { IStaff } from '../models/Staff';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, phone, password, role, companyId, isStaff } = req.body;

    // Determine if registering staff or customer
    const registeringStaff = isStaff || (role && role !== 'customer');

    if (registeringStaff) {
      // Register Staff User (admin/engineer)
      // Check if companyId is provided
      if (!companyId) {
        res.status(400).json({
          success: false,
          message: 'Company ID is required for staff registration'
        });
        return;
      }

      const existingStaff = await Staff.findOne({
        phone,
        companyId
      });

      if (existingStaff) {
        res.status(400).json({
          success: false,
          message: 'Staff user already exists with this phone number in this company'
        });
        return;
      }

      const staff = await Staff.create({
        fullName,
        email,
        phone,
        password,
        role: role || 'engineer',
        companyId
      });

      const token = generateToken(staff, 'staff');

      res.status(201).json({
        success: true,
        data: {
          user: {
            _id: staff._id,
            fullName: staff.fullName,
            email: staff.email,
            phone: staff.phone,
            role: staff.role,
            companyId: staff.companyId,
            status: staff.status,
            isStaff: true,
            createdAt: staff.createdAt,
            updatedAt: staff.updatedAt
          },
          token
        }
      });
    } else {
      // Register Customer
      const existingCustomer = await Customer.findOne({
        $or: [{ email }, { phone }]
      });

      if (existingCustomer) {
        res.status(400).json({
          success: false,
          message: 'Customer already exists with this email or phone'
        });
        return;
      }

      const customer = await Customer.create({
        fullName,
        email,
        phone,
        password,
        customerDetails: {
          totalOrders: 0,
          totalSpent: 0
        }
      });

      const token = generateToken(customer, 'customer');

      res.status(201).json({
        success: true,
        data: {
          user: {
            _id: customer._id,
            fullName: customer.fullName,
            email: customer.email,
            phone: customer.phone,
            status: customer.status,
            isStaff: false,
            customerDetails: customer.customerDetails,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt
          },
          token
        }
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide phone and password'
      });
      return;
    }

    let user: IStaff | ICustomer | null = null;
    let userType: 'staff' | 'customer' = 'customer';

    // Try staff first, then customer
    user = await Staff.findOne({ phone }).select('+password');
    if (user) {
      userType = 'staff';
    } else {
      user = await Customer.findOne({ phone }).select('+password');
      userType = 'customer';
    }

    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'Your account is not active'
      });
      return;
    }

    user.lastLogin = new Date();
    await user.save();

    // Type-safe token generation based on userType
    let token: string;
    if (userType === 'staff') {
      token = generateToken(user as IStaff, 'staff');
    } else {
      token = generateToken(user as ICustomer, 'customer');
    }

    const userData: any = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      isStaff: userType === 'staff',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    if (userType === 'staff') {
      const staffUser = user as IStaff;
      userData.role = staffUser.role;
      userData.companyId = staffUser.companyId;
    } else {
      const customerUser = user as ICustomer;
      userData.customerDetails = customerUser.customerDetails;
    }

    res.status(200).json({
      success: true,
      data: {
        user: userData,
        token
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let user: IStaff | ICustomer | null = null;
    let userType: 'staff' | 'customer' = 'customer';

    // Check if user is staff or customer based on the JWT payload
    if (req.user.isStaff || req.user.userType === 'staff') {
      user = await Staff.findById(req.user.id);
      userType = 'staff';
    } else {
      user = await Customer.findById(req.user.id);
      userType = 'customer';
    }

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const userData: any = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      isStaff: userType === 'staff',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    if (userType === 'staff') {
      const staffUser = user as IStaff;
      userData.role = staffUser.role;
      userData.companyId = staffUser.companyId;
    } else {
      const customerUser = user as ICustomer;
      userData.customerDetails = customerUser.customerDetails;
    }

    res.status(200).json({
      success: true,
      data: {
        user: userData
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
