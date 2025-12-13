import mongoose, { Schema, Document } from 'mongoose';

interface ICustomer {
  customerId?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
}

interface IDevice {
  deviceTypeId: mongoose.Types.ObjectId;
  deviceTypeName: string;
  brand: string;
  model: string;
  attributes: Record<string, any>;
  serialNumber?: string;
  purchaseDate?: Date;
  warrantyStatus?: string;
  warrantyExpiryDate?: Date;
  accessories?: string[];
  physicalCondition?: string;
  password?: string;
}

interface IServiceItem {
  serviceTypeId: string | mongoose.Types.ObjectId;
  serviceTypeName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  estimatedCost: number;
  actualCost?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'returned' | 'reopened';
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

interface IProductItem {
  productId: mongoose.Types.ObjectId | string;
  productName: string;
  sku?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  isCustom?: boolean;
}

interface IAssignedTo {
  userId: mongoose.Types.ObjectId;
  userName: string;
  assignedAt: Date;
  assignedBy: mongoose.Types.ObjectId;
}

interface IStageHistory {
  stageId: mongoose.Types.ObjectId;
  stageName: string;
  timestamp: Date;
  updatedBy: mongoose.Types.ObjectId;
  updatedByName: string;
  assignedTo?: string;
  notes?: string;
}

interface IPartUsed {
  partName: string;
  quantity: number;
  cost: number;
  addedAt: Date;
}

interface INote {
  note: string;
  addedBy: mongoose.Types.ObjectId;
  addedByName: string;
  timestamp: Date;
}

interface IImage {
  url: string;
  type: 'before' | 'during' | 'after';
  uploadedAt: Date;
  uploadedBy: mongoose.Types.ObjectId;
}

interface ICustomerFeedback {
  rating: number;
  comment?: string;
  submittedAt: Date;
}

export interface IOrder extends Document {
  orderNumber: string;
  voucherNo?: string;
  orderType: 'service' | 'product' | 'mixed';
  companyId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  customer: ICustomer;

  // Service Order specific fields
  device?: IDevice;
  problemDescription?: string;
  customerComplaints?: string[];
  diagnosedIssues?: string[];
  services?: IServiceItem[];
  assignedTo?: IAssignedTo;
  stageId?: mongoose.Types.ObjectId;
  stageName?: string;
  stageHistory?: IStageHistory[];
  receivedDate?: Date;
  estimatedCompletionDate?: Date;
  actualCompletionDate?: Date;
  deliveryDate?: Date;
  partsUsed?: IPartUsed[];
  warrantyPeriod?: number;
  warrantyExpiryDate?: Date;
  customerFeedback?: ICustomerFeedback;
  images?: IImage[];

  // Product Order specific fields
  products?: IProductItem[];
  shippingAddress?: string;
  shippingMethod?: string;
  shippingCost?: number;
  shippingDate?: Date;
  trackingNumber?: string;

  // Common fields
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'returned' | 'reopened';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subtotal: number;
  discount: number;
  taxRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  roundOff: number;
  estimatedCost: number;
  finalCost?: number;
  paidAmount: number;
  advancePayment: number;
  balancePayment: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paymentMethod?: string;
  invoiceId?: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  internalNotes: INote[];
  customerNotes: INote[];

  // Sub-task tracking
  hasSubTasks: boolean;
  totalSubTasks?: number;
  completedSubTasks?: number;
  subTaskProgress?: number;

  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
}

const OrderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true },
  voucherNo: { type: String },
  orderType: {
    type: String,
    enum: ['service', 'product', 'mixed'],
    required: true
  },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customer: {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    address: String,
    gstin: String
  },

  // Service Order specific fields
  device: {
    deviceTypeId: { type: Schema.Types.ObjectId, ref: 'DeviceType' },
    deviceTypeName: String,
    brand: String,
    model: String,
    attributes: { type: Schema.Types.Mixed },
    serialNumber: String,
    purchaseDate: Date,
    warrantyStatus: String,
    warrantyExpiryDate: Date,
    accessories: [String],
    physicalCondition: String,
    password: String
  },
  problemDescription: String,
  customerComplaints: [String],
  diagnosedIssues: [String],
  services: [{
    serviceTypeId: { type: Schema.Types.ObjectId, ref: 'ServiceType' },
    serviceTypeName: String,
    description: String,
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 18 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
    actualCost: Number,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled', 'returned', 'reopened'],
      default: 'pending'
    },
    startedAt: Date,
    completedAt: Date,
    notes: String
  }],
  assignedTo: {
    userId: { type: Schema.Types.ObjectId, ref: 'Staff' },
    userName: String,
    assignedAt: Date,
    assignedBy: { type: Schema.Types.ObjectId, ref: 'Staff' }
  },
  stageId: { type: Schema.Types.ObjectId, ref: 'Stage' },
  stageName: String,
  stageHistory: [{
    stageId: { type: Schema.Types.ObjectId, ref: 'Stage' },
    stageName: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    updatedByName: String,
    assignedTo: String,
    notes: String
  }],
  receivedDate: Date,
  estimatedCompletionDate: Date,
  actualCompletionDate: Date,
  deliveryDate: Date,
  partsUsed: [{
    partName: { type: String, required: true },
    quantity: { type: Number, required: true },
    cost: { type: Number, required: true },
    addedAt: { type: Date, default: Date.now }
  }],
  warrantyPeriod: Number,
  warrantyExpiryDate: Date,
  customerFeedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: Date
  },
  images: [{
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ['before', 'during', 'after'],
      required: true
    },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Staff' }
  }],

  // Product Order specific fields
  products: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: String,
    description: String,
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 18 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 }
  }],
  shippingAddress: String,
  shippingMethod: String,
  shippingCost: { type: Number, default: 0 },
  shippingDate: Date,
  trackingNumber: String,

  // Common fields
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'returned', 'reopened'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 18 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  estimatedCost: { type: Number, default: 0 },
  finalCost: Number,
  paidAmount: { type: Number, default: 0 },
  advancePayment: { type: Number, default: 0 },
  balancePayment: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  paymentMethod: String,
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  invoiceNumber: String,
  internalNotes: [{
    note: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    addedByName: String,
    timestamp: { type: Date, default: Date.now }
  }],
  customerNotes: [{
    note: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    addedByName: String,
    timestamp: { type: Date, default: Date.now }
  }],

  // Sub-task tracking
  hasSubTasks: { type: Boolean, default: false },
  totalSubTasks: { type: Number, default: 0 },
  completedSubTasks: { type: Number, default: 0 },
  subTaskProgress: { type: Number, default: 0, min: 0, max: 100 },

  createdBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ companyId: 1, createdAt: -1 });
OrderSchema.index({ companyId: 1, orderType: 1 });
OrderSchema.index({ companyId: 1, stageId: 1 });
OrderSchema.index({ customerId: 1 });
OrderSchema.index({ 'customer.phone': 1 });
OrderSchema.index({ 'customer.customerId': 1 });
OrderSchema.index({ stageId: 1, createdAt: -1 });
OrderSchema.index({ 'assignedTo.userId': 1, stageId: 1 });
OrderSchema.index({ 'device.deviceTypeId': 1 });
OrderSchema.index({ 'device.brand': 1, 'device.model': 1 });
OrderSchema.index({ isDeleted: 1, companyId: 1 });

export default mongoose.model<IOrder>('Order', OrderSchema);
