import mongoose, { Schema, Document } from 'mongoose';

export interface IOutcomeType extends Document {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  companyId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OutcomeTypeSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  color: { type: String, default: '#6B7280' },
  icon: String,
  isActive: { type: Boolean, default: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Staff', required: true }
}, {
  timestamps: true
});

// Indexes
OutcomeTypeSchema.index({ companyId: 1, isActive: 1 });
OutcomeTypeSchema.index({ name: 1, companyId: 1 });

export default mongoose.model<IOutcomeType>('OutcomeType', OutcomeTypeSchema);
