import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  paymentNumber: string;
  invoiceId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  paymentDetails?: {
    transactionId?: string;
    upiId?: string;
    cardLast4?: string;
    chequeNumber?: string;
    bankName?: string;
    accountNumber?: string;
  };
  paymentDate: Date;
  receivedBy: mongoose.Types.ObjectId;
  receivedByName: string;
  notes?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema({
  paymentNumber: { type: String, required: true, unique: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  invoiceNumber: { type: String, required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'ServiceOrder', required: true },
  orderNumber: { type: String, required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'other'],
    required: true
  },
  paymentDetails: {
    transactionId: String,
    upiId: String,
    cardLast4: String,
    chequeNumber: String,
    bankName: String,
    accountNumber: String
  },
  paymentDate: { type: Date, default: Date.now },
  receivedBy: { type: Schema.Types.ObjectId, ref: 'CompanyUser', required: true },
  receivedByName: { type: String, required: true },
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed'
  },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes
PaymentSchema.index({ paymentNumber: 1 });
PaymentSchema.index({ invoiceId: 1 });
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ paymentDate: -1 });
PaymentSchema.index({ paymentMethod: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ isDeleted: 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
