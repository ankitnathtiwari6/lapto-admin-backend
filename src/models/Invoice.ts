import mongoose, { Schema, Document } from 'mongoose';

interface IInvoiceItem {
  serviceTypeId: string | mongoose.Types.ObjectId;
  serviceTypeName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

interface ITaxBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  customer: {
    customerId?: mongoose.Types.ObjectId;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    gstin?: string;
  };
  items: IInvoiceItem[];
  subtotal: number;
  discount: number;
  taxBreakdown: ITaxBreakdown;
  totalTax: number;
  totalAmount: number;
  roundOff: number;
  finalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  invoiceDate: Date;
  dueDate?: Date;
  notes?: string;
  termsAndConditions?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const InvoiceSchema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'ServiceOrder', required: true },
  orderNumber: { type: String, required: true },
  customer: {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    address: String,
    gstin: String
  },
  items: [{
    serviceTypeId: { type: Schema.Types.Mixed, required: true },
    serviceTypeName: { type: String, required: true },
    description: String,
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 18 },
    taxAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxBreakdown: {
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 }
  },
  totalTax: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  roundOff: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: Date,
  notes: String,
  termsAndConditions: String,
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'CompanyUser', required: true }
}, {
  timestamps: true
});

// Indexes
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ orderId: 1 });
InvoiceSchema.index({ 'customer.phone': 1 });
InvoiceSchema.index({ paymentStatus: 1 });
InvoiceSchema.index({ invoiceDate: -1 });
InvoiceSchema.index({ isDeleted: 1 });

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
