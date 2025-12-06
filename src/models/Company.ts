import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  companyName: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
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
  gstin: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  defaultGstRate: { type: Number, required: true, default: 18 },
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
