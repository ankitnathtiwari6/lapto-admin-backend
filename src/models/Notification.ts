import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  recipientType: 'admin' | 'technician' | 'customer';
  title: string;
  message: string;
  type: string;
  relatedOrderId?: mongoose.Types.ObjectId;
  relatedOrderNumber?: string;
  isRead: boolean;
  readAt?: Date;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

const NotificationSchema = new Schema({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipientType: {
    type: String,
    enum: ['admin', 'technician', 'customer'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'order_created', 'order_assigned', 'status_update',
      'payment_received', 'ready_for_pickup', 'overdue_order'
    ],
    required: true
  },
  relatedOrderId: { type: Schema.Types.ObjectId, ref: 'ServiceOrder' },
  relatedOrderNumber: String,
  isRead: { type: Boolean, default: false },
  readAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ relatedOrderId: 1 });
NotificationSchema.index({ createdAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
