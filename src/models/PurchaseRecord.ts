import mongoose, { Schema, Document } from 'mongoose';

// For tracking all purchase transactions (Parts, equipment, etc.)
export interface IPurchaseRecord extends Document {
  purchaseNumber: string;
  purchaseDate: Date;
  financialYear: string; // e.g., "2024-25"
  month: number; // 1-12
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';

  // Vendor details
  vendorId?: mongoose.Types.ObjectId;
  vendorName: string;
  vendorGSTIN?: string;
  vendorState?: string;

  // Purchase details
  invoiceNumber: string; // Vendor's invoice number
  invoiceDate: Date;

  // Items purchased
  items: Array<{
    itemName: string;
    description?: string;
    hsnCode?: string; // HSN/SAC code for GST
    quantity: number;
    unitPrice: number;
    discount: number;
    taxableValue: number;
    gstRate: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
  }>;

  // Financial breakdown
  itemsValue: number;
  discount: number;
  taxableValue: number;

  // GST breakdown
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;

  // Totals
  totalAmount: number;
  roundOff: number;
  finalAmount: number;

  // Payment tracking
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';

  // GST details
  taxType: 'intrastate' | 'interstate';
  placeOfSupply: string;
  isReverseCharge: boolean;

  // Category
  purchaseType: 'parts' | 'equipment' | 'consumables' | 'services' | 'other';
  category?: string;

  // Delivery details
  deliveryDate?: Date;
  receivedBy?: mongoose.Types.ObjectId;

  // Cancellation
  isCancelled: boolean;
  cancelledAt?: Date;
  cancelReason?: string;

  // Attachments
  documents?: Array<{
    fileName: string;
    fileUrl: string;
    uploadedAt: Date;
  }>;

  // Metadata
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseRecordSchema = new Schema({
  purchaseNumber: { type: String, required: true, unique: true },
  purchaseDate: { type: Date, required: true, default: Date.now },
  financialYear: { type: String, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },

  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  vendorName: { type: String, required: true },
  vendorGSTIN: String,
  vendorState: String,

  invoiceNumber: { type: String, required: true },
  invoiceDate: { type: Date, required: true },

  items: [{
    itemName: { type: String, required: true },
    description: String,
    hsnCode: String,
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    taxableValue: { type: Number, required: true },
    gstRate: { type: Number, required: true },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true }
  }],

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

  taxType: { type: String, enum: ['intrastate', 'interstate'], required: true },
  placeOfSupply: { type: String, required: true },
  isReverseCharge: { type: Boolean, default: false },

  purchaseType: {
    type: String,
    enum: ['parts', 'equipment', 'consumables', 'services', 'other'],
    required: true
  },
  category: String,

  deliveryDate: Date,
  receivedBy: { type: Schema.Types.ObjectId, ref: 'CompanyUser' },

  isCancelled: { type: Boolean, default: false },
  cancelledAt: Date,
  cancelReason: String,

  documents: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now }
  }],

  notes: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'CompanyUser', required: true },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes
PurchaseRecordSchema.index({ purchaseNumber: 1 });
PurchaseRecordSchema.index({ purchaseDate: -1 });
PurchaseRecordSchema.index({ financialYear: 1, month: 1 });
PurchaseRecordSchema.index({ quarter: 1, financialYear: 1 });
PurchaseRecordSchema.index({ vendorGSTIN: 1 });
PurchaseRecordSchema.index({ paymentStatus: 1 });
PurchaseRecordSchema.index({ isDeleted: 1 });

export default mongoose.model<IPurchaseRecord>('PurchaseRecord', PurchaseRecordSchema);
