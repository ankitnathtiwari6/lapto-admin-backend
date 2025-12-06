import { Response } from 'express';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';

export const createProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const companyId = req.body.companyId || req.companyId;
    if (!companyId) {
      res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
      return;
    }

    const product = await Product.create({
      ...req.body,
      companyId,
      slug: req.body.name.toLowerCase().replace(/\s+/g, '-')
    });

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getAllProducts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { search, category, isActive, page = 1, limit = 50 } = req.query;
    const filter: any = {};

    const companyId = req.query.companyId || req.companyId;
    if (companyId) {
      filter.companyId = companyId;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search as string, 'i') },
        { sku: new RegExp(search as string, 'i') },
        { description: new RegExp(search as string, 'i') }
      ];
    }

    const products = await Product.find(filter)
      .sort({ name: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: products
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const getProductById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const updateProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const deleteProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: product
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

export const updateStock = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' or 'subtract'

    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    if (operation === 'add') {
      product.stock += quantity;
    } else if (operation === 'subtract') {
      if (product.stock < quantity) {
        res.status(400).json({
          success: false,
          message: 'Insufficient stock'
        });
        return;
      }
      product.stock -= quantity;
    }

    await product.save();

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
