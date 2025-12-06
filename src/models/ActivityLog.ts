import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  logType: string;
  action: string;
  orderId?: mongoose.Types.ObjectId;
  orderNumber?: string;
  userId?: mongoose.Types.ObjectId;
  userName?: string;
  userRole?: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  category: 'order' | 'user' | 'payment' | 'system' | 'security';
  severity: 'info' | 'warning' | 'error' | 'critical';
}

const ActivityLogSchema = new Schema({
  logType: {
    type: String,
    enum: [
      'order_created', 'order_updated', 'status_changed',
      'assignment_changed', 'payment_received', 'note_added',
      'part_added', 'service_added', 'service_updated',
      'user_action', 'system_action'
    ],
    required: true
  },
  action: { type: String, required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'ServiceOrder' },
  orderNumber: String,
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  userRole: String,
  previousValue: Schema.Types.Mixed,
  newValue: Schema.Types.Mixed,
  metadata: Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
  category: {
    type: String,
    enum: ['order', 'user', 'payment', 'system', 'security'],
    default: 'order'
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  }
}, {
  timestamps: false
});

// Indexes
ActivityLogSchema.index({ orderId: 1, timestamp: -1 });
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ logType: 1, timestamp: -1 });
ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ category: 1, severity: 1, timestamp: -1 });

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
