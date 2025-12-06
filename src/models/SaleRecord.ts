import mongoose, { Schema, Document } from 'mongoose';

// For tracking all sales transactions (Service repairs, parts, etc.)
export interface ISaleRecord extends Document {
  saleNumber: string;
  saleDate: Date;
  financialYear: string; // e.g., "2024-25"
  month: number; // 1-12
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; // For quarterly GST returns

  // Customer details
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  customerGSTIN?: string;
  customerState?: string;

  // Transaction details
  invoiceId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;

  // Financial breakdown
  itemsValue: number; // Total value of items/services
  discount: number;
  taxableValue: number; // After discount, before tax

  // GST breakdown
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;

  // Totals
  totalAmount: number; // Including GST
  roundOff: number;
  finalAmount: number;

  // Payment tracking
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';

  // GST details
  gstRate: number;
  taxType: 'intrastate' | 'interstate';
  placeOfSupply: string; // State code
  isReverseCharge: boolean;

  // Category
  saleType: 'service' | 'product' | 'both';
  serviceCategory?: string;

  // Cancellation
  isCancelled: boolean;
  cancelledAt?: Date;
  cancelReason?: string;

  // Metadata
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SaleRecordSchema = new Schema({
  saleNumber: { type: String, required: true, unique: true },
  saleDate: { type: Date, required: true, default: Date.now },
  financialYear: { type: String, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },

  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  customerGSTIN: String,
  customerState: String,

  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  invoiceNumber: { type: String, required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'ServiceOrder', required: true },
  orderNumber: { type: String, required: true },

  itemsValue: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxableValue: { type: Number, required: true },

  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  totalGST: { type: Number, required: true },

  totalAmount: { type: Number, required: true },
  roundOff: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },

  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },

  gstRate: { type: Number, required: true },
  taxType: { type: String, enum: ['intrastate', 'interstate'], required: true },
  placeOfSupply: { type: String, required: true },
  isReverseCharge: { type: Boolean, default: false },

  saleType: { type: String, enum: ['service', 'product', 'both'], default: 'service' },
  serviceCategory: String,

  isCancelled: { type: Boolean, default: false },
  cancelledAt: Date,
  cancelReason: String,

  notes: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'CompanyUser', required: true },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes for efficient querying
SaleRecordSchema.index({ saleNumber: 1 });
SaleRecordSchema.index({ saleDate: -1 });
SaleRecordSchema.index({ financialYear: 1, month: 1 });
SaleRecordSchema.index({ quarter: 1, financialYear: 1 });
SaleRecordSchema.index({ invoiceId: 1 });
SaleRecordSchema.index({ orderId: 1 });
SaleRecordSchema.index({ customerGSTIN: 1 });
SaleRecordSchema.index({ paymentStatus: 1 });
SaleRecordSchema.index({ isDeleted: 1 });

export default mongoose.model<ISaleRecord>('SaleRecord', SaleRecordSchema);
