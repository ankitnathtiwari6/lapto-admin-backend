import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

interface ICustomerDetails {
  address: string;
  alternatePhone?: string;
  totalOrders: number;
  totalSpent: number;
  lastVisit?: Date;
}

export interface ICustomer extends Document {
  fullName: string;
  email?: string;
  phone: string;
  password?: string;
  customerDetails: ICustomerDetails;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const CustomerSchema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, sparse: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String },
  customerDetails: {
    address: { type: String, required: true },
    alternatePhone: String,
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastVisit: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Indexes
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ status: 1 });

// Hash password before saving
CustomerSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
CustomerSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
