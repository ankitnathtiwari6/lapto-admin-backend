import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Payment from '../models/Payment';
import Invoice from '../models/Invoice';
import Order from '../models/Order';
import SaleRecord from '../models/SaleRecord';

// Get all payments with filters
export const getAllPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fromDate, toDate, paymentStatus, paymentMethod, search } = req.query;

    // Build filter query
    const filter: any = { isDeleted: false };

    // Date range filter
    if (fromDate || toDate) {
      filter.paymentDate = {};
      if (fromDate) {
        filter.paymentDate.$gte = new Date(fromDate as string);
      }
      if (toDate) {
        filter.paymentDate.$lte = new Date(toDate as string);
      }
    }

    // Payment status filter
    if (paymentStatus && paymentStatus !== 'all') {
      filter.status = paymentStatus;
    }

    // Payment method filter
    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod;
    }

    // Search filter (customer name, payment number, order number, invoice number)
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { paymentNumber: { $regex: search, $options: 'i' } },
        { orderNumber: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const payments = await Payment.find(filter)
      .sort({ paymentDate: -1 })
      .populate('invoiceId', 'invoiceNumber finalAmount')
      .populate('orderId', 'orderNumber')
      .populate('receivedBy', 'fullName');

    res.status(200).json({
      success: true,
      data: payments,
      count: payments.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching payments'
    });
  }
};

// Get single payment
export const getPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id)
      .populate('invoiceId')
      .populate('orderId')
      .populate('receivedBy', 'fullName email');

    if (!payment || payment.isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching payment'
    });
  }
};

// Get payments for an invoice
export const getInvoicePayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    const payments = await Payment.find({ invoiceId, isDeleted: false })
      .sort({ paymentDate: -1 })
      .populate('receivedBy', 'fullName');

    res.status(200).json({
      success: true,
      data: payments,
      count: payments.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching payments'
    });
  }
};

// Get payments for an order
export const getOrderPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    const payments = await Payment.find({ orderId, isDeleted: false })
      .sort({ paymentDate: -1 })
      .populate('receivedBy', 'fullName');

    res.status(200).json({
      success: true,
      data: payments,
      count: payments.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching payments'
    });
  }
};

// Record a new payment
export const recordPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      invoiceId,
      amount,
      paymentMethod,
      paymentDetails,
      paymentDate,
      notes
    } = req.body;

    // Validate invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
      return;
    }

    // Validate amount
    if (amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
      return;
    }

    // Check if payment exceeds balance
    if (amount > invoice.balanceAmount) {
      res.status(400).json({
        success: false,
        message: `Payment amount (₹${amount}) exceeds balance amount (₹${invoice.balanceAmount})`
      });
      return;
    }

    // Generate payment number
    const paymentCount = await Payment.countDocuments();
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(5, '0')}`;

    // Create payment record
    const payment = await Payment.create({
      paymentNumber,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      orderId: invoice.orderId,
      orderNumber: invoice.orderNumber,
      customerId: invoice.customer.customerId,
      customerName: invoice.customer.name,
      amount,
      paymentMethod,
      paymentDetails,
      paymentDate: paymentDate || new Date(),
      receivedBy: req.user._id,
      receivedByName: req.user.fullName,
      notes,
      status: 'completed'
    });

    // Update invoice payment status
    invoice.paidAmount += amount;
    invoice.balanceAmount -= amount;

    if (invoice.balanceAmount <= 0) {
      invoice.paymentStatus = 'paid';
    } else if (invoice.paidAmount > 0) {
      invoice.paymentStatus = 'partial';
    }

    await invoice.save();

    // Update service order payment status
    const order = await Order.findById(invoice.orderId);
    if (order) {
      order.advancePayment = invoice.paidAmount;
      order.balancePayment = invoice.balanceAmount;
      order.paymentStatus = invoice.paymentStatus;
      await order.save();
    }

    // Update sale record with new payment amounts
    await SaleRecord.findOneAndUpdate(
      { invoiceId: invoice._id },
      {
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        paymentStatus: invoice.paymentStatus
      }
    );

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment recorded successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error recording payment'
    });
  }
};

// Update payment
export const updatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentDetails, notes, status } = req.body;

    const payment = await Payment.findById(id);
    if (!payment || payment.isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    // Update allowed fields
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (paymentDetails) payment.paymentDetails = paymentDetails;
    if (notes !== undefined) payment.notes = notes;
    if (status) payment.status = status;

    await payment.save();

    res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating payment'
    });
  }
};

// Delete payment (soft delete)
export const deletePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment || payment.isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    // Soft delete
    payment.isDeleted = true;
    await payment.save();

    // Recalculate invoice amounts
    const invoice = await Invoice.findById(payment.invoiceId);
    if (invoice) {
      const payments = await Payment.find({
        invoiceId: payment.invoiceId,
        isDeleted: false
      });

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      invoice.paidAmount = totalPaid;
      invoice.balanceAmount = invoice.finalAmount - totalPaid;

      if (invoice.balanceAmount <= 0) {
        invoice.paymentStatus = 'paid';
      } else if (invoice.paidAmount > 0) {
        invoice.paymentStatus = 'partial';
      } else {
        invoice.paymentStatus = 'unpaid';
      }

      await invoice.save();

      // Update order
      const order = await Order.findById(invoice.orderId);
      if (order) {
        order.advancePayment = invoice.paidAmount;
        order.balancePayment = invoice.balanceAmount;
        order.paymentStatus = invoice.paymentStatus;
        await order.save();
      }

      // Update sale record
      await SaleRecord.findOneAndUpdate(
        { invoiceId: invoice._id },
        {
          paidAmount: invoice.paidAmount,
          balanceAmount: invoice.balanceAmount,
          paymentStatus: invoice.paymentStatus
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting payment'
    });
  }
};

// Get payment statistics
export const getPaymentStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fromDate, toDate } = req.query;

    const filter: any = { isDeleted: false, status: 'completed' };

    if (fromDate || toDate) {
      filter.paymentDate = {};
      if (fromDate) {
        filter.paymentDate.$gte = new Date(fromDate as string);
      }
      if (toDate) {
        filter.paymentDate.$lte = new Date(toDate as string);
      }
    }

    const payments = await Payment.find(filter);

    const stats = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      byMethod: {} as Record<string, { count: number; amount: number }>,
      byStatus: {} as Record<string, { count: number; amount: number }>
    };

    // Group by payment method
    payments.forEach(payment => {
      if (!stats.byMethod[payment.paymentMethod]) {
        stats.byMethod[payment.paymentMethod] = { count: 0, amount: 0 };
      }
      stats.byMethod[payment.paymentMethod].count++;
      stats.byMethod[payment.paymentMethod].amount += payment.amount;

      if (!stats.byStatus[payment.status]) {
        stats.byStatus[payment.status] = { count: 0, amount: 0 };
      }
      stats.byStatus[payment.status].count++;
      stats.byStatus[payment.status].amount += payment.amount;
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching payment statistics'
    });
  }
};
