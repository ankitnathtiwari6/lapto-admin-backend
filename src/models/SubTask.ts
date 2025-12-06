import mongoose, { Schema, Document } from 'mongoose';

interface IPartUsed {
  partName: string;
  quantity: number;
  cost: number;
  addedAt: Date;
}

interface ISubTaskUpdate {
  note: string;
  addedBy: mongoose.Types.ObjectId;
  addedByName: string;
  timestamp: Date;
  type: 'comment' | 'status_change' | 'assignment' | 'completion' | 'progress_update';
  oldValue?: string;
  newValue?: string;
}

export interface ISubTask extends Document {
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;

  // Parent task tracking (for nested sub-tasks)
  parentTaskId?: mongoose.Types.ObjectId;
  taskLevel: number;

  // Task details
  title: string;
  description?: string;

  // Assignment
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  assignedTo: mongoose.Types.ObjectId;
  assignedToName: string;
  assignedAt: Date;

  // Progress tracking
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked' | 'on_hold';
  progress: number;

  // Time tracking
  startedAt?: Date;
  completedAt?: Date;

  // Cost tracking (for commission/accounting)
  amount?: number;
  isPaid: boolean; // Whether this task contributes to commission calculation

  // Parts/materials used
  partsUsed?: IPartUsed[];

  // Comments/updates
  updates: ISubTaskUpdate[];

  // Dependencies
  dependencies?: mongoose.Types.ObjectId[];
  blockedBy?: string;

  // Company reference
  companyId: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

const SubTaskSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  orderNumber: { type: String, required: true },

  // Parent task tracking
  parentTaskId: { type: Schema.Types.ObjectId, ref: 'SubTask' },
  taskLevel: { type: Number, default: 0 },

  // Task details
  title: { type: String, required: true },
  description: String,

  // Assignment
  createdBy: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  createdByName: { type: String, required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  assignedToName: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now },

  // Progress tracking
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'blocked', 'on_hold'],
    default: 'pending'
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },

  // Time tracking
  startedAt: Date,
  completedAt: Date,

  // Cost tracking (for commission)
  amount: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: true }, // Whether this task is paid (contributes to commission)

  // Parts/materials used
  partsUsed: [{
    partName: { type: String, required: true },
    quantity: { type: Number, required: true },
    cost: { type: Number, required: true },
    addedAt: { type: Date, default: Date.now }
  }],

  // Comments/updates
  updates: [{
    note: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    addedByName: String,
    timestamp: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['comment', 'status_change', 'assignment', 'completion', 'progress_update'],
      default: 'comment'
    },
    oldValue: String,
    newValue: String
  }],

  // Dependencies
  dependencies: [{ type: Schema.Types.ObjectId, ref: 'SubTask' }],
  blockedBy: String,

  // Company reference
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },

  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes
SubTaskSchema.index({ orderId: 1, isDeleted: 1 });
SubTaskSchema.index({ assignedTo: 1, status: 1 });
SubTaskSchema.index({ createdBy: 1 });
SubTaskSchema.index({ companyId: 1, status: 1 });
SubTaskSchema.index({ parentTaskId: 1 });
SubTaskSchema.index({ orderNumber: 1 });
SubTaskSchema.index({ status: 1, dueDate: 1 });

// Virtual for child sub-tasks
SubTaskSchema.virtual('childTasks', {
  ref: 'SubTask',
  localField: '_id',
  foreignField: 'parentTaskId'
});

export default mongoose.model<ISubTask>('SubTask', SubTaskSchema);
