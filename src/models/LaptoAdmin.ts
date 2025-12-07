import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ILaptoAdmin extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'lapto_admin';
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const LaptoAdminSchema = new Schema({
  name: { type: String, required: true, default: 'Lapto Admin' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, required: true, default: 'lapto_admin' },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Hash password before saving
LaptoAdminSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
LaptoAdminSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<ILaptoAdmin>('LaptoAdmin', LaptoAdminSchema);
