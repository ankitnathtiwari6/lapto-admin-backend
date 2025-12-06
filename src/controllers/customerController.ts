import { Response } from 'express';
import Customer from '../models/Customer';
import { AuthRequest } from '../middleware/auth';

export const getAllCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { fullName: new RegExp(search as string, 'i') },
        { phone: new RegExp(search as string, 'i') },
        { email: new RegExp(search as string, 'i') }
      ];
    }

    const customers = await Customer.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Customer.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: customers.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: customers
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id).select('-password');

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.create(req.body);

    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Don't allow password update through this endpoint
    if (req.body.password) delete req.body.password;

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedCustomer
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: null,
      message: 'Customer deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const searchCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || (query as string).length < 2) {
      res.status(200).json({
        success: true,
        data: []
      });
      return;
    }

    const customers = await Customer.find({
      status: 'active',
      $or: [
        { fullName: new RegExp(query as string, 'i') },
        { phone: new RegExp(query as string, 'i') },
        { email: new RegExp(query as string, 'i') }
      ]
    })
      .select('fullName phone email customerDetails.address')
      .limit(10)
      .sort({ 'customerDetails.lastVisit': -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: customers
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
