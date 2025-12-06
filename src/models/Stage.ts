import mongoose, { Schema, Document } from 'mongoose';

export interface IStage extends Document {
  name: string;
  slug: string;
  description?: string;
  order: number;
  color: string;
  isFinal: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StageSchema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  order: { type: Number, required: true },
  color: { type: String, default: '#7C3AED' },
  isFinal: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

StageSchema.index({ order: 1 });
StageSchema.index({ slug: 1 });
StageSchema.index({ isActive: 1 });

export default mongoose.model<IStage>('Stage', StageSchema);
