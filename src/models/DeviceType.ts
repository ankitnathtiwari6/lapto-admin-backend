import mongoose, { Schema, Document } from 'mongoose';

interface IFieldDefinition {
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'dropdown' | 'checkbox';
  isRequired: boolean;
  options?: string[];
  placeholder?: string;
}

export interface IDeviceType extends Document {
  name: string;
  slug: string;
  fieldDefinitions: IFieldDefinition[];
  requiresSerialNumber: boolean;
  requiresIMEI: boolean;
  requiresPassword: boolean;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const FieldDefinitionSchema = new Schema({
  fieldName: { type: String, required: true },
  fieldLabel: { type: String, required: true },
  fieldType: {
    type: String,
    enum: ['text', 'number', 'dropdown', 'checkbox'],
    required: true
  },
  isRequired: { type: Boolean, default: false },
  options: [{ type: String }],
  placeholder: { type: String }
});

const DeviceTypeSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  fieldDefinitions: { type: [FieldDefinitionSchema], default: [] },
  requiresSerialNumber: { type: Boolean, default: false },
  requiresIMEI: { type: Boolean, default: false },
  requiresPassword: { type: Boolean, default: false },
  icon: { type: String },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Staff', required: false }
}, {
  timestamps: true
});

// Indexes
DeviceTypeSchema.index({ slug: 1 });
DeviceTypeSchema.index({ isActive: 1 });

export default mongoose.model<IDeviceType>('DeviceType', DeviceTypeSchema);
