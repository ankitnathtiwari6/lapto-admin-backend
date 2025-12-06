import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceType extends Document {
  name: string;
  slug: string;
  description?: string;
  applicableDeviceTypes: mongoose.Types.ObjectId[];
  estimatedDuration?: number;
  category?: string;
  warrantyPeriod?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceTypeSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  applicableDeviceTypes: [{ type: Schema.Types.ObjectId, ref: 'DeviceType', default: [] }],
  estimatedDuration: { type: Number },
  category: { type: String },
  warrantyPeriod: { type: Number },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Indexes
ServiceTypeSchema.index({ slug: 1 });
ServiceTypeSchema.index({ isActive: 1 });
ServiceTypeSchema.index({ applicableDeviceTypes: 1 });

export default mongoose.model<IServiceType>('ServiceType', ServiceTypeSchema);
