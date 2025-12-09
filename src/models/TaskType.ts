import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskType extends Document {
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

const TaskTypeSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  color: { type: String, default: '#8B5CF6' }, // Default purple color
  icon: String,
  isActive: { type: Boolean, default: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
}, {
  timestamps: true
});

// Indexes
TaskTypeSchema.index({ companyId: 1, isActive: 1 });
TaskTypeSchema.index({ name: 1, companyId: 1 });

export default mongoose.model<ITaskType>('TaskType', TaskTypeSchema);
