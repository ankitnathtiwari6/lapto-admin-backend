import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import Staff from '../models/Staff';
import Customer from '../models/Customer';

export interface AuthRequest extends Request {
  user?: any;
  companyId?: string; // Current company context
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Not authorized to access this route' });
      return;
    }

    const decoded = verifyToken(token);

    // Check if user is staff or customer based on JWT payload
    if (decoded.isStaff || decoded.userType === 'staff') {
      // Staff user
      req.user = await Staff.findById(decoded.id).select('-password').populate('companyId', 'companyName');
      if (req.user) {
        req.user.isStaff = true;
        // Set company context from user's companyId
        req.companyId = req.user.companyId?._id?.toString() || req.user.companyId?.toString();
      }
    } else if (decoded.userType === 'customer') {
      // Customer
      req.user = await Customer.findById(decoded.id).select('-password');
    }

    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    if (req.user.status !== 'active') {
      res.status(401).json({ success: false, message: 'User account is not active' });
      return;
    }

    // Add JWT payload info to req.user for easier access
    req.user.userType = decoded.userType;
    if (decoded.role) req.user.role = decoded.role;
    if (decoded.companyId) req.companyId = decoded.companyId;

    // Allow override of company context from header (for multi-company staff)
    const companyIdHeader = req.headers['x-company-id'] as string;
    if (companyIdHeader && req.user.isStaff) {
      req.companyId = companyIdHeader;
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized to access this route`
      });
      return;
    }
    next();
  };
};
