import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  description?: string;
  sku?: string;
  category?: string;
  brand?: string;
  unitPrice: number;
  costPrice?: number;
  stock: number;
  lowStockThreshold?: number;
  unit: string; // pcs, kg, ltr, etc.
  taxRate: number;
  images?: string[];
  isActive: boolean;
  companyId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  description: String,
  sku: { type: String, unique: true, sparse: true },
  category: String,
  brand: String,
  unitPrice: { type: Number, required: true, default: 0 },
  costPrice: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  unit: { type: String, default: 'pcs' }, // pieces, kg, ltr, etc.
  taxRate: { type: Number, default: 18 },
  images: [String],
  isActive: { type: Boolean, default: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }
}, {
  timestamps: true
});

// Indexes
ProductSchema.index({ companyId: 1, isActive: 1 });
ProductSchema.index({ companyId: 1, name: 1 });
ProductSchema.index({ companyId: 1, sku: 1 });
ProductSchema.index({ companyId: 1, category: 1 });

export default mongoose.model<IProduct>('Product', ProductSchema);
