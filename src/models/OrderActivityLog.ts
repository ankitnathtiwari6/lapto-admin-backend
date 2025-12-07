import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderActivityLog extends Document {
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  companyId: mongoose.Types.ObjectId;

  // Activity type
  activityType:
    | 'order_created'
    | 'order_updated'
    | 'order_assigned'
    | 'order_reassigned'
    | 'stage_changed'
    | 'subtask_created'
    | 'subtask_updated'
    | 'subtask_status_changed'
    | 'subtask_assigned'
    | 'subtask_reassigned'
    | 'subtask_deleted'
    | 'payment_added'
    | 'note_added'
    | 'device_updated'
    | 'customer_updated';

  // Activity details
  title: string;
  description?: string;

  // Related entities
  stageId?: mongoose.Types.ObjectId;
  stageName?: string;
  subTaskId?: mongoose.Types.ObjectId;
  subTaskTitle?: string;
  assignedTo?: string; // Staff name who was assigned
  previousValue?: string;
  newValue?: string;

  // Metadata
  performedBy: mongoose.Types.ObjectId;
  performedByName: string;
  metadata?: Record<string, any>; // Additional flexible data

  createdAt: Date;
  updatedAt: Date;
}

const OrderActivityLogSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  orderNumber: { type: String, required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },

  activityType: {
    type: String,
    required: true,
    enum: [
      'order_created',
      'order_updated',
      'order_assigned',
      'order_reassigned',
      'stage_changed',
      'subtask_created',
      'subtask_updated',
      'subtask_status_changed',
      'subtask_assigned',
      'subtask_reassigned',
      'subtask_deleted',
      'payment_added',
      'note_added',
      'device_updated',
      'customer_updated'
    ]
  },

  title: { type: String, required: true },
  description: String,

  // Related entities
  stageId: { type: Schema.Types.ObjectId, ref: 'Stage' },
  stageName: String,
  subTaskId: { type: Schema.Types.ObjectId, ref: 'SubTask' },
  subTaskTitle: String,
  assignedTo: String,
  previousValue: String,
  newValue: String,

  // Metadata
  performedBy: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  performedByName: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
}, {
  timestamps: true
});

// Indexes for efficient queries
OrderActivityLogSchema.index({ orderId: 1, createdAt: -1 });
OrderActivityLogSchema.index({ companyId: 1, createdAt: -1 });
OrderActivityLogSchema.index({ activityType: 1 });
OrderActivityLogSchema.index({ subTaskId: 1 });

export default mongoose.model<IOrderActivityLog>('OrderActivityLog', OrderActivityLogSchema);
