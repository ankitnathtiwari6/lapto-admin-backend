import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IStaff extends Document {
  fullName: string;
  email?: string;
  phone: string;
  password?: string;
  role: 'super_admin' | 'admin' | 'engineer' | 'accountant' | 'reception';
  companyId: mongoose.Types.ObjectId;
  status: 'active' | 'inactive' | 'suspended';

  // Compensation details
  compensationType?: 'fixed' | 'commission' | 'both';
  fixedSalary?: number;
  commissionRate?: number; // Percentage (e.g., 10 for 10%)
  commissionType?: 'percentage' | 'fixed_per_order';
  fixedCommissionAmount?: number; // Fixed amount per order if commissionType is 'fixed_per_order'

  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const StaffSchema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, sparse: true },
  phone: { type: String, required: true },
  password: { type: String },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'engineer', 'accountant', 'reception'],
    required: true
  },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },

  // Compensation details
  compensationType: {
    type: String,
    enum: ['fixed', 'commission', 'both'],
    default: 'fixed'
  },
  fixedSalary: { type: Number, default: 0 },
  commissionRate: { type: Number, default: 0 },
  commissionType: {
    type: String,
    enum: ['percentage', 'fixed_per_order'],
    default: 'percentage'
  },
  fixedCommissionAmount: { type: Number, default: 0 },

  lastLogin: Date
}, {
  timestamps: true
});

// Indexes
StaffSchema.index({ email: 1, companyId: 1 });
StaffSchema.index({ phone: 1, companyId: 1 }, { unique: true });
StaffSchema.index({ companyId: 1, role: 1 });
StaffSchema.index({ companyId: 1, status: 1 });

// Hash password before saving
StaffSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
StaffSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IStaff>('Staff', StaffSchema);
