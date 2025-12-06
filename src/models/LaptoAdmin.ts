import mongoose, { Schema, Document } from 'mongoose';

export interface ILaptoAdmin extends Document {
  name: string;
  role: 'lapto_admin';
  createdAt: Date;
  updatedAt: Date;
}

const LaptoAdminSchema = new Schema({
  name: { type: String, required: true, default: 'Lapto Admin' },
  role: { type: String, required: true, default: 'lapto_admin' }
}, {
  timestamps: true
});

export default mongoose.model<ILaptoAdmin>('LaptoAdmin', LaptoAdminSchema);
