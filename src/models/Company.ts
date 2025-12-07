import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  companyName: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone: string;
  email: string;
  defaultGstRate: number;
  logo?: string;
  termsAndConditions?: string;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema({
  companyName: { type: String, required: true },
  gstin: { type: String, unique: true, sparse: true },
  address: String,
  city: String,
  state: String,
  pincode: String,
  phone: { type: String, required: true },
  email: { type: String, required: true },
  defaultGstRate: { type: Number, default: 18 },
  logo: String,
  termsAndConditions: String,
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Staff', required: false }
}, {
  timestamps: true
});

// Indexes
CompanySchema.index({ gstin: 1 });
CompanySchema.index({ isActive: 1 });

export default mongoose.model<ICompany>('Company', CompanySchema);
