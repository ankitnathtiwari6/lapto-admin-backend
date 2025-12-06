import jwt from 'jsonwebtoken';
import { IStaff } from '../models/Staff';
import { ICustomer } from '../models/Customer';

interface JwtPayload {
  id: string;
  email?: string;
  phone: string;
  userType: 'staff' | 'customer';
  role?: string;
  companyId?: string;
  isStaff: boolean;
}

export function generateToken(user: IStaff, type: 'staff'): string;
export function generateToken(user: ICustomer, type: 'customer'): string;
export function generateToken(user: IStaff | ICustomer, type: 'staff' | 'customer'): string {
  const payload: JwtPayload = {
    id: user._id.toString(),
    email: user.email,
    phone: user.phone,
    userType: type,
    isStaff: type === 'staff'
  };

  if (type === 'staff') {
    const staffUser = user as IStaff;
    payload.role = staffUser.role;
    payload.companyId = staffUser.companyId?.toString();
  }

  const secret = process.env.JWT_SECRET || 'default-secret-key';
  const expiresIn: string = process.env.JWT_EXPIRE || '7d';

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(
    token,
    process.env.JWT_SECRET || 'default-secret-key'
  ) as JwtPayload;
};
