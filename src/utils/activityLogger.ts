import OrderActivityLog from '../models/OrderActivityLog';
import mongoose from 'mongoose';

interface LogActivityParams {
  orderId: string | mongoose.Types.ObjectId;
  orderNumber: string;
  companyId: string | mongoose.Types.ObjectId;
  activityType: string;
  title: string;
  description?: string;
  performedBy: string | mongoose.Types.ObjectId;
  performedByName: string;
  stageId?: string | mongoose.Types.ObjectId;
  stageName?: string;
  subTaskId?: string | mongoose.Types.ObjectId;
  subTaskTitle?: string;
  assignedTo?: string;
  previousValue?: string;
  newValue?: string;
  metadata?: Record<string, any>;
}

export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    await OrderActivityLog.create({
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      companyId: params.companyId,
      activityType: params.activityType,
      title: params.title,
      description: params.description,
      performedBy: params.performedBy,
      performedByName: params.performedByName,
      stageId: params.stageId,
      stageName: params.stageName,
      subTaskId: params.subTaskId,
      subTaskTitle: params.subTaskTitle,
      assignedTo: params.assignedTo,
      previousValue: params.previousValue,
      newValue: params.newValue,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging should not break the main operation
  }
};
