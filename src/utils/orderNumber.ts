import Order from '../models/Order';

export const generateOrderNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const lastOrder = await Order.findOne({
    orderNumber: new RegExp(`^ORD-${year}-`)
  }).sort({ orderNumber: -1 });

  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `ORD-${year}-${sequence.toString().padStart(5, '0')}`;
};
