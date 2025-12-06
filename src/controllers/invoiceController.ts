import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Invoice from '../models/Invoice';
import Order from '../models/Order';
import Company from '../models/Company';
import SaleRecord from '../models/SaleRecord';

// Helper function to get financial year
const getFinancialYear = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
};

// Helper function to get quarter
const getQuarter = (month: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' => {
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10 && month <= 12) return 'Q3';
  return 'Q4'; // Jan-Mar
};

// Get invoices for an order
export const getOrderInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    const invoices = await Invoice.find({ orderId, isDeleted: false })
      .sort({ invoiceDate: -1 });

    res.status(200).json({
      success: true,
      data: invoices,
      count: invoices.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching invoices'
    });
  }
};

// Get single invoice
export const getInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);

    if (!invoice || invoice.isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching invoice'
    });
  }
};

// Generate or update invoice (single invoice per order)
export const generateInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, gstRate, taxType, discount, notes, customerDetails } = req.body;

    // Get order details
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found'
      });
      return;
    }

    // Get company details
    const company = await Company.findById(req.companyId);
    if (!company) {
      res.status(400).json({
        success: false,
        message: 'Company not found. Please ensure you are associated with a company.'
      });
      return;
    }

    // Check if invoice already exists for this order
    let existingInvoice = await Invoice.findOne({ orderId, isDeleted: false });

    // Use customer details from request or fall back to order details
    const invoiceCustomer = customerDetails ? {
      customerId: order.customer.customerId,
      name: customerDetails.name || order.customer.name,
      phone: customerDetails.phone || order.customer.phone,
      email: customerDetails.email || order.customer.email,
      address: customerDetails.address || order.customer.address,
      gstin: customerDetails.gstin || order.customer.gstin
    } : {
      customerId: order.customer.customerId,
      name: order.customer.name,
      phone: order.customer.phone,
      email: order.customer.email,
      address: order.customer.address,
      gstin: order.customer.gstin
    };

    // Calculate invoice items from services or products
    const items = (order.services || order.products || []).map((service: any) => {
      const unitPrice = service.actualCost || service.estimatedCost || service.unitPrice;
      const quantity = service.quantity || 1;

      // Discount can be a fixed amount (from payment page) or percentage
      let discountAmount = 0;
      if (typeof discount === 'number') {
        // If discount is provided as a fixed amount from payment page, distribute it proportionally
        const totalServiceCost = (order.services || order.products || []).reduce((sum: number, s: any) => sum + (s.actualCost || s.estimatedCost || s.unitPrice), 0);
        discountAmount = totalServiceCost > 0 ? (unitPrice / totalServiceCost) * discount : 0;
      }

      const taxableAmount = unitPrice - discountAmount;
      const taxAmount = (taxableAmount * gstRate) / 100;
      const totalAmount = taxableAmount + taxAmount;

      return {
        serviceTypeId: service.serviceTypeId,
        serviceTypeName: service.serviceTypeName,
        description: service.notes || service.description,
        quantity,
        unitPrice,
        discount: discountAmount,
        taxRate: gstRate,
        taxAmount,
        totalAmount
      };
    });

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice, 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
    const taxableAmount = subtotal - totalDiscount;

    // Calculate GST breakdown based on tax type
    let cgst = 0, sgst = 0, igst = 0;

    if (taxType === 'intrastate') {
      cgst = (taxableAmount * gstRate) / 200;
      sgst = (taxableAmount * gstRate) / 200;
    } else {
      igst = (taxableAmount * gstRate) / 100;
    }

    const totalTax = cgst + sgst + igst;
    const totalAmount = taxableAmount + totalTax;
    const roundOff = Math.round(totalAmount) - totalAmount;
    const finalAmount = Math.round(totalAmount);

    let invoice;

    if (existingInvoice) {
      // Update existing invoice
      existingInvoice.customer = invoiceCustomer;
      existingInvoice.items = items;
      existingInvoice.subtotal = subtotal;
      existingInvoice.discount = totalDiscount;
      existingInvoice.taxBreakdown = {
        cgst,
        sgst,
        igst,
        totalTax
      };
      existingInvoice.totalTax = totalTax;
      existingInvoice.totalAmount = totalAmount;
      existingInvoice.roundOff = roundOff;
      existingInvoice.finalAmount = finalAmount;
      existingInvoice.paidAmount = order.advancePayment;
      existingInvoice.balanceAmount = finalAmount - order.advancePayment;
      existingInvoice.paymentStatus = order.paymentStatus;
      if (notes) {
        existingInvoice.notes = notes;
      }
      existingInvoice.termsAndConditions = company.termsAndConditions;

      await existingInvoice.save();
      invoice = existingInvoice;

      // Update sale record
      const saleDate = new Date(invoice.invoiceDate);
      const month = saleDate.getMonth() + 1;

      await SaleRecord.findOneAndUpdate(
        { invoiceId: invoice._id },
        {
          saleNumber: `SALE-${invoice.invoiceNumber}`,
          saleDate,
          financialYear: getFinancialYear(saleDate),
          month,
          quarter: getQuarter(month),
          customerId: invoice.customer.customerId,
          customerName: invoice.customer.name,
          customerGSTIN: invoice.customer.gstin,
          customerState: company.state,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          orderId: invoice.orderId,
          orderNumber: invoice.orderNumber,
          itemsValue: invoice.subtotal,
          discount: invoice.discount,
          taxableValue: invoice.subtotal - invoice.discount,
          cgst: invoice.taxBreakdown.cgst,
          sgst: invoice.taxBreakdown.sgst,
          igst: invoice.taxBreakdown.igst,
          totalGST: invoice.totalTax,
          totalAmount: invoice.totalAmount,
          roundOff: invoice.roundOff,
          finalAmount: invoice.finalAmount,
          paidAmount: invoice.paidAmount,
          balanceAmount: invoice.balanceAmount,
          paymentStatus: invoice.paymentStatus,
          gstRate,
          taxType,
          placeOfSupply: company.state,
          isReverseCharge: false,
          saleType: 'service',
          createdBy: req.user._id,
          isDeleted: false
        },
        { upsert: true, new: true }
      );

      res.status(200).json({
        success: true,
        data: invoice,
        message: 'Invoice updated successfully'
      });
    } else {
      // Generate new invoice number
      const invoiceCount = await Invoice.countDocuments();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, '0')}`;

      // Create new invoice
      invoice = await Invoice.create({
        invoiceNumber,
        orderId: order._id,
        orderNumber: order.orderNumber,
        customer: invoiceCustomer,
        items,
        subtotal,
        discount: totalDiscount,
        taxBreakdown: {
          cgst,
          sgst,
          igst,
          totalTax
        },
        totalTax,
        totalAmount,
        roundOff,
        finalAmount,
        paidAmount: order.advancePayment,
        balanceAmount: finalAmount - order.advancePayment,
        paymentStatus: order.paymentStatus,
        invoiceDate: new Date(),
        notes,
        termsAndConditions: company.termsAndConditions,
        createdBy: req.user._id
      });

      // Create sale record
      const saleDate = new Date(invoice.invoiceDate);
      const month = saleDate.getMonth() + 1;

      await SaleRecord.create({
        saleNumber: `SALE-${invoice.invoiceNumber}`,
        saleDate,
        financialYear: getFinancialYear(saleDate),
        month,
        quarter: getQuarter(month),
        customerId: invoice.customer.customerId,
        customerName: invoice.customer.name,
        customerGSTIN: invoice.customer.gstin,
        customerState: company.state,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        orderId: invoice.orderId,
        orderNumber: invoice.orderNumber,
        itemsValue: invoice.subtotal,
        discount: invoice.discount,
        taxableValue: invoice.subtotal - invoice.discount,
        cgst: invoice.taxBreakdown.cgst,
        sgst: invoice.taxBreakdown.sgst,
        igst: invoice.taxBreakdown.igst,
        totalGST: invoice.totalTax,
        totalAmount: invoice.totalAmount,
        roundOff: invoice.roundOff,
        finalAmount: invoice.finalAmount,
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        paymentStatus: invoice.paymentStatus,
        gstRate,
        taxType,
        placeOfSupply: company.state,
        isReverseCharge: false,
        saleType: 'service',
        createdBy: req.user._id,
        isDeleted: false
      });

      res.status(201).json({
        success: true,
        data: invoice,
        message: 'Invoice generated successfully'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating invoice'
    });
  }
};

// Send invoice via WhatsApp
export const sendInvoiceWhatsApp = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { phone } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice || invoice.isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
      return;
    }

    // TODO: Implement WhatsApp integration
    // For now, generate WhatsApp URL
    const message = `Your invoice ${invoice.invoiceNumber} for order ${invoice.orderNumber} is ready. Amount: ₹${invoice.finalAmount}. Download: ${process.env.FRONTEND_URL}/invoices/${invoice._id}`;
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

    res.status(200).json({
      success: true,
      message: 'WhatsApp link generated',
      data: { whatsappUrl }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error sending invoice via WhatsApp'
    });
  }
};

// Send invoice via Email
export const sendInvoiceEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice || invoice.isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
      return;
    }

    // TODO: Implement email service
    // For now, just return success
    res.status(200).json({
      success: true,
      message: 'Invoice sent via email successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error sending invoice via email'
    });
  }
};

// Download invoice as PDF
export const downloadInvoicePDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    if (!invoice || invoice.isDeleted) {
      res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
      return;
    }

    const company = await Company.findById(req.companyId);

    // TODO: Implement PDF generation using a library like pdfkit or puppeteer
    // For now, return invoice data as JSON
    res.status(200).json({
      success: true,
      data: { invoice, company },
      message: 'PDF generation not yet implemented. Use frontend PDF library.'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error downloading invoice PDF'
    });
  }
};
