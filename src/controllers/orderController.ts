import { Request, Response } from "express";
import Order from "../models/Order";
import Product from "../models/Product";
import Staff from "../models/Staff";
import Stage from "../models/Stage";
import Invoice from "../models/Invoice";
import SubTask from "../models/SubTask";
import ActivityLog from "../models/ActivityLog";
import { generateOrderNumber } from "../utils/orderNumber";
import { generateInvoiceNumber } from "../utils/invoiceNumber";
import {
  calculateInvoiceAmounts,
  calculateServiceItemAmounts,
  calculatePaymentStatus,
} from "../utils/invoiceCalculations";
import { AuthRequest } from "../middleware/auth";
import { logActivity } from "../utils/activityLogger";

export const createOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Require companyId
    const companyId = req.body.companyId || req.companyId;
    if (!companyId) {
      res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
      return;
    }

    const orderType = req.body.orderType || 'service'; // default to service for backward compatibility
    const orderNumber = await generateOrderNumber();
    const invoiceNumber = await generateInvoiceNumber();

    let serviceItems: any[] = [];
    let productItems: any[] = [];
    let initialStage = null;
    let assignedTo = undefined;
    let stageHistoryEntries: any[] = [];

    // Handle Service Order or Mixed Order with services
    if (orderType === 'service' || orderType === 'mixed') {
      // Get the initial stage (order=1 or first stage)
      initialStage = await Stage.findOne({ isActive: true }).sort({
        order: 1,
      });
      if (!initialStage) {
        res.status(400).json({
          success: false,
          message: "No stages configured. Please seed stages first.",
        });
        return;
      }

      // Process services if provided
      if (req.body.services && req.body.services.length > 0) {
        serviceItems = req.body.services.map((service: any) => {
          const { taxAmount, totalAmount } = calculateServiceItemAmounts(
            service.quantity || 1,
            service.unitPrice || service.estimatedCost || 0,
            service.discount || 0,
            service.taxRate || 18
          );

          return {
            ...service,
            quantity: service.quantity || 1,
            unitPrice: service.unitPrice || service.estimatedCost || 0,
            discount: service.discount || 0,
            taxRate: service.taxRate || 18,
            taxAmount,
            totalAmount,
            estimatedCost: service.estimatedCost || service.unitPrice || 0,
          };
        });
      }

      stageHistoryEntries = [
        {
          stageId: initialStage._id,
          stageName: initialStage.name,
          timestamp: new Date(),
          updatedBy: req.user.id,
          updatedByName: req.user.fullName,
          notes: "Order created",
        },
      ];
    }

    // Handle Product Order or Mixed Order with products
    if (orderType === 'product' || orderType === 'mixed') {
      if (req.body.products && req.body.products.length > 0) {
        // Process products and calculate amounts
        productItems = await Promise.all(req.body.products.map(async (product: any) => {
          // Check if it's a custom product (ID starts with "custom-product-")
          const isCustomProduct = typeof product.productId === 'string' && product.productId.startsWith('custom-product-');

          let productDoc = null;
          if (!isCustomProduct) {
            productDoc = await Product.findById(product.productId);
            if (!productDoc) {
              throw new Error(`Product not found: ${product.productId}`);
            }
          }

          const { taxAmount, totalAmount } = calculateServiceItemAmounts(
            product.quantity || 1,
            product.unitPrice || (productDoc?.unitPrice) || 0,
            product.discount || 0,
            product.taxRate || (productDoc?.taxRate) || 18
          );

          return {
            productId: isCustomProduct ? product.productId : product.productId,
            productName: product.productName || (productDoc?.name) || '',
            sku: product.sku || (productDoc?.sku),
            description: product.description || (productDoc?.description),
            quantity: product.quantity || 1,
            unitPrice: product.unitPrice || (productDoc?.unitPrice) || 0,
            discount: product.discount || 0,
            taxRate: product.taxRate || (productDoc?.taxRate) || 18,
            taxAmount,
            totalAmount,
            isCustom: isCustomProduct,
          };
        }));
      }
    }

    // Validation: Ensure at least one service or product exists
    if (serviceItems.length === 0 && productItems.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one service or product is required",
      });
      return;
    }

    // Combine service and product items for invoice calculation
    const allItems = [...serviceItems, ...productItems];

    // Calculate invoice totals
    const invoiceCalcs = calculateInvoiceAmounts(
      allItems,
      req.body.discount || 0,
      req.body.taxRate || 18,
      req.body.isInterState || false
    );

    // Determine payment status
    const paidAmount = req.body.paidAmount || req.body.advancePayment || 0;
    const paymentStatus = calculatePaymentStatus(
      invoiceCalcs.finalAmount,
      paidAmount
    );

    // Handle engineer assignment if provided (for service or mixed orders with services)
    let currentStage = initialStage;
    if ((orderType === 'service' || orderType === 'mixed') && req.body.engineerId) {
      const engineer = await Staff.findById(req.body.engineerId);
      if (engineer && engineer.role === "engineer") {
        assignedTo = {
          userId: req.body.engineerId,
          userName: engineer.fullName,
          assignedAt: new Date(),
          assignedBy: req.user.id,
        };

        // Get 'assigned' stage
        const assignedStage = await Stage.findOne({
          slug: "assigned",
          isActive: true,
        });
        if (assignedStage) {
          currentStage = assignedStage;
          stageHistoryEntries.push({
            stageId: assignedStage._id,
            stageName: assignedStage.name,
            timestamp: new Date(),
            updatedBy: req.user.id,
            updatedByName: req.user.fullName,
            assignedTo: engineer.fullName,
            notes: `Assigned to ${engineer.fullName}`,
          });
        }
      }
    }

    // Create the order with type-specific fields
    const orderData: any = {
      ...req.body,
      companyId,
      orderNumber,
      voucherNo: req.body.voucherNo || undefined,
      invoiceNumber,
      orderType,
      customerId: req.body.customer?.customerId || req.body.customerId || undefined,
      subtotal: invoiceCalcs.subtotal,
      discount: invoiceCalcs.discount,
      taxRate: req.body.taxRate || 18,
      cgst: invoiceCalcs.cgst,
      sgst: invoiceCalcs.sgst,
      igst: invoiceCalcs.igst,
      totalTax: invoiceCalcs.totalTax,
      roundOff: invoiceCalcs.roundOff,
      estimatedCost: invoiceCalcs.finalAmount,
      paidAmount,
      advancePayment: paidAmount,
      balancePayment: invoiceCalcs.finalAmount - paidAmount,
      paymentStatus,
      createdBy: req.user.id,
    };

    // Add services if present
    if (serviceItems.length > 0) {
      if (!currentStage) {
        res.status(500).json({
          success: false,
          message: "Stage configuration error",
        });
        return;
      }
      orderData.services = serviceItems;
      orderData.receivedDate = new Date();
      orderData.assignedTo = assignedTo;
      orderData.stageId = currentStage._id;
      orderData.stageName = currentStage.name;
      orderData.stageHistory = stageHistoryEntries;
    }

    // Add products if present
    if (productItems.length > 0) {
      orderData.products = productItems;
    }

    const order = await Order.create(orderData);

    // Create invoice items from both services and products
    const invoiceItems = [
      ...serviceItems.map((service: any) => ({
        serviceTypeId: service.serviceTypeId,
        serviceTypeName: service.serviceTypeName,
        description: service.description,
        quantity: service.quantity,
        unitPrice: service.unitPrice,
        discount: service.discount,
        taxRate: service.taxRate,
        taxAmount: service.taxAmount,
        totalAmount: service.totalAmount,
      })),
      ...productItems.map((product: any) => ({
        productId: product.productId,
        productName: product.productName,
        sku: product.sku,
        description: product.description,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        discount: product.discount,
        taxRate: product.taxRate,
        taxAmount: product.taxAmount,
        totalAmount: product.totalAmount,
      }))
    ];

    const invoice = await Invoice.create({
      invoiceNumber,
      orderId: order._id,
      orderNumber,
      customer: req.body.customer,
      items: invoiceItems,
      subtotal: invoiceCalcs.subtotal,
      discount: invoiceCalcs.discount,
      taxBreakdown: {
        cgst: invoiceCalcs.cgst,
        sgst: invoiceCalcs.sgst,
        igst: invoiceCalcs.igst,
        totalTax: invoiceCalcs.totalTax,
      },
      totalTax: invoiceCalcs.totalTax,
      totalAmount: invoiceCalcs.totalAmount,
      roundOff: invoiceCalcs.roundOff,
      finalAmount: invoiceCalcs.finalAmount,
      paidAmount,
      balanceAmount: invoiceCalcs.finalAmount - paidAmount,
      paymentStatus,
      invoiceDate: new Date(),
      createdBy: req.user.id,
    });

    // Update order with invoice reference
    order.invoiceId = invoice._id as any;
    await order.save();

    // Log order creation activity
    await logActivity({
      orderId: order._id,
      orderNumber: order.orderNumber,
      companyId,
      activityType: 'order_created',
      title: 'Order Created',
      description: `Order ${order.orderNumber} created for ${order.customer.name}`,
      performedBy: req.user.id,
      performedByName: req.user.fullName,
      stageId: currentStage?._id,
      stageName: currentStage?.name,
    });

    // Log assignment if engineer was assigned during creation
    if (assignedTo) {
      await logActivity({
        orderId: order._id,
        orderNumber: order.orderNumber,
        companyId,
        activityType: 'order_assigned',
        title: 'Order Assigned',
        description: `Order assigned to ${assignedTo.userName}`,
        performedBy: req.user.id,
        performedByName: req.user.fullName,
        assignedTo: assignedTo.userName,
        stageId: currentStage?._id,
        stageName: currentStage?.name,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        order,
        invoice,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const getAllOrders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      stageId,
      engineerId,
      deviceTypeId,
      page = 1,
      limit = 10,
      search,
      companyId,
    } = req.query;
    const filter: any = { isDeleted: false };

    // Filter by company
    const targetCompanyId = companyId || req.companyId;
    if (targetCompanyId) {
      filter.companyId = targetCompanyId;
    }

    if (stageId) filter.stageId = stageId;
    if (engineerId) filter["assignedTo.userId"] = engineerId;
    if (deviceTypeId) filter["device.deviceTypeId"] = deviceTypeId;
    if (search) {
      filter.$or = [
        { orderNumber: new RegExp(search as string, "i") },
        { "customer.name": new RegExp(search as string, "i") },
        { "customer.phone": new RegExp(search as string, "i") },
      ];
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate("assignedTo.userId", "fullName phone")
      .populate("device.deviceTypeId", "name slug");

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const getOrderById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("assignedTo.userId", "fullName phone email")
      .populate("device.deviceTypeId", "name slug fieldDefinitions")
      .populate("services.serviceTypeId", "name description")
      .populate("products.productId", "name sku");

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const updateOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    // Update customer details
    if (req.body.customer) {
      order.customer = { ...order.customer, ...req.body.customer };
      // Update customerId if provided in customer object
      if (req.body.customer.customerId) {
        order.customerId = req.body.customer.customerId;
      }
    }

    // Update customerId if provided directly
    if (req.body.customerId !== undefined) {
      order.customerId = req.body.customerId;
    }

    // Update services with actual costs
    if (req.body.services && Array.isArray(req.body.services)) {
      order.services = req.body.services.map((service: any) => {
        const { taxAmount, totalAmount } = calculateServiceItemAmounts(
          service.quantity || 1,
          service.actualCost || service.unitPrice || service.estimatedCost || 0,
          service.discount || 0,
          service.taxRate || 18
        );

        return {
          ...service,
          quantity: service.quantity || 1,
          unitPrice: service.unitPrice || service.estimatedCost || 0,
          actualCost: service.actualCost,
          discount: service.discount || 0,
          taxRate: service.taxRate || 18,
          taxAmount,
          totalAmount,
        };
      });

      // Recalculate invoice totals based on actual costs
      const invoiceCalcs = calculateInvoiceAmounts(
        order.services || [],
        req.body.discount || order.discount || 0,
        req.body.taxRate || order.taxRate || 18,
        req.body.isInterState || false
      );

      order.subtotal = invoiceCalcs.subtotal;
      order.discount = invoiceCalcs.discount;
      order.cgst = invoiceCalcs.cgst;
      order.sgst = invoiceCalcs.sgst;
      order.igst = invoiceCalcs.igst;
      order.totalTax = invoiceCalcs.totalTax;
      order.roundOff = invoiceCalcs.roundOff;

      // Update final cost if not explicitly provided
      if (req.body.finalCost === undefined) {
        order.finalCost = invoiceCalcs.finalAmount;
      }
    }

    // Update priority
    if (req.body.priority) {
      order.priority = req.body.priority;
    }

    // Update estimated cost
    if (req.body.estimatedCost !== undefined) {
      order.estimatedCost = req.body.estimatedCost;
    }

    // Update final cost (can be manually set from payment page)
    if (req.body.finalCost !== undefined) {
      order.finalCost = req.body.finalCost;
    }

    // Update payment details
    if (req.body.advancePayment !== undefined) {
      order.advancePayment = req.body.advancePayment;
      const totalCost = order.finalCost || order.estimatedCost;
      order.balancePayment = totalCost - req.body.advancePayment;

      // Update payment status
      order.paymentStatus = calculatePaymentStatus(
        totalCost,
        req.body.advancePayment
      );
    }

    // Update balance payment if provided
    if (req.body.balancePayment !== undefined) {
      order.balancePayment = req.body.balancePayment;
    }

    // Update payment status if provided
    if (req.body.paymentStatus) {
      order.paymentStatus = req.body.paymentStatus;
    }

    // Update tax configuration
    if (req.body.taxRate !== undefined) {
      order.taxRate = req.body.taxRate;
    }

    await order.save();

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const updateOrderStage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { stageId, notes } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    const stage = await Stage.findById(stageId);
    if (!stage) {
      res.status(400).json({
        success: false,
        message: "Invalid stage",
      });
      return;
    }

    order.stageId = stage._id as any;
    order.stageName = stage.name;
    if (!order.stageHistory) {
      order.stageHistory = [];
    }
    order.stageHistory.push({
      stageId: stage._id as any,
      stageName: stage.name,
      timestamp: new Date(),
      updatedBy: req.user.id,
      updatedByName: req.user.fullName,
      notes,
    });

    await order.save();

    // Log stage change activity
    const previousStage = order.stageHistory && order.stageHistory.length > 1
      ? order.stageHistory[order.stageHistory.length - 2].stageName
      : 'None';

    await logActivity({
      orderId: order._id,
      orderNumber: order.orderNumber,
      companyId: order.companyId,
      activityType: 'stage_changed',
      title: 'Stage Changed',
      description: `Stage changed from "${previousStage}" to "${stage.name}"${notes ? ` - ${notes}` : ''}`,
      performedBy: req.user.id,
      performedByName: req.user.fullName,
      stageId: stage._id,
      stageName: stage.name,
      previousValue: previousStage,
      newValue: stage.name,
      assignedTo: order.assignedTo?.userName,
    });

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const updateOrderStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, notes } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'returned', 'reopened'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status",
      });
      return;
    }

    const previousStatus = order.status;
    order.status = status;

    await order.save();

    // Log status change activity
    await logActivity({
      orderId: order._id,
      orderNumber: order.orderNumber,
      companyId: order.companyId,
      activityType: 'order_updated',
      title: 'Status Changed',
      description: `Order status changed from "${previousStatus}" to "${status}"${notes ? ` - ${notes}` : ''}`,
      performedBy: req.user.id,
      performedByName: req.user.fullName,
      previousValue: previousStatus,
      newValue: status,
    });

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const assignEngineer = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Accept both engineerId and technicianId for backward compatibility
    const engineerId = req.body.engineerId || req.body.technicianId;
    const { notes } = req.body;

    if (!engineerId) {
      res.status(400).json({
        success: false,
        message: "Engineer ID is required",
      });
      return;
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    const engineer = await Staff.findById(engineerId);
    if (!engineer) {
      res.status(400).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check if user is active
    if (engineer.status !== 'active') {
      res.status(400).json({
        success: false,
        message: "User is not active",
      });
      return;
    }

    // Capture previous assignee for activity logging
    const previousAssignee = order.assignedTo?.userName;

    order.assignedTo = {
      userId: engineerId,
      userName: engineer.fullName,
      assignedAt: new Date(),
      assignedBy: req.user.id,
    };

    // Get 'assigned' stage
    const assignedStage = await Stage.findOne({
      slug: "assigned",
      isActive: true,
    });
    if (assignedStage) {
      order.stageId = assignedStage._id as any;
      order.stageName = assignedStage.name;
      if (!order.stageHistory) {
        order.stageHistory = [];
      }
      order.stageHistory.push({
        stageId: assignedStage._id as any,
        stageName: assignedStage.name,
        timestamp: new Date(),
        updatedBy: req.user.id,
        updatedByName: req.user.fullName,
        assignedTo: engineer.fullName,
        notes: notes || `Assigned to ${engineer.fullName}`,
      });
    }

    await order.save();

    // Determine if this is a new assignment or reassignment
    const isReassignment = previousAssignee && previousAssignee !== engineer.fullName;

    // Log assignment activity
    await logActivity({
      orderId: order._id,
      orderNumber: order.orderNumber,
      companyId: order.companyId,
      activityType: isReassignment ? 'order_reassigned' : 'order_assigned',
      title: isReassignment ? 'Order Reassigned' : 'Order Assigned',
      description: isReassignment
        ? `Order reassigned from ${previousAssignee} to ${engineer.fullName}${notes ? ` - ${notes}` : ''}`
        : `Order assigned to ${engineer.fullName}${notes ? ` - ${notes}` : ''}`,
      performedBy: req.user.id,
      performedByName: req.user.fullName,
      stageId: assignedStage?._id,
      stageName: assignedStage?.name,
      assignedTo: engineer.fullName,
      previousValue: isReassignment ? previousAssignee : undefined,
      newValue: engineer.fullName,
    });

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const addNote = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { note, type = "internal" } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    const noteObj = {
      note,
      addedBy: req.user.id,
      addedByName: req.user.fullName,
      timestamp: new Date(),
    };

    if (type === "internal") {
      order.internalNotes.push(noteObj);
    } else {
      order.customerNotes.push(noteObj);
    }

    await order.save();

    // Log note activity
    await logActivity({
      orderId: order._id,
      orderNumber: order.orderNumber,
      companyId: order.companyId,
      activityType: 'note_added',
      title: 'Note Added',
      description: `${type === 'internal' ? 'Internal' : 'Customer'} note added: ${note}`,
      performedBy: req.user.id,
      performedByName: req.user.fullName,
      stageId: order.stageId,
      stageName: order.stageName,
      metadata: { noteType: type },
    });

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const deleteOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    // Soft delete the order
    order.isDeleted = true;
    await order.save();

    // Delete all associated subtasks
    await SubTask.deleteMany({ orderId: req.params.id });

    // Delete all associated activity logs
    await ActivityLog.deleteMany({ orderId: req.params.id });

    // Optionally delete associated invoice
    if (order.invoiceId) {
      await Invoice.findByIdAndDelete(order.invoiceId);
    }

    res.status(200).json({
      success: true,
      message: "Order and associated data deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const checkStatusByPhone = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phone } = req.params;

    const orders = await Order.find({
      "customer.phone": phone,
      isDeleted: false,
    })
      .select(
        "orderNumber orderType status receivedDate estimatedCompletionDate device.deviceTypeName device.brand device.model"
      )
      .sort({ createdAt: -1 })
      .limit(10);

    if (orders.length === 0) {
      res.status(404).json({
        success: false,
        message: "No orders found for this phone number",
      });
      return;
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// Get order statistics
export const getOrderStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { fromDate, toDate, companyId } = req.query;
    const filter: any = { isDeleted: false };

    // Filter by company
    const targetCompanyId = companyId || req.companyId;
    if (targetCompanyId) {
      filter.companyId = targetCompanyId;
    }

    // Date range filter
    if (fromDate || toDate) {
      filter.receivedDate = {};
      if (fromDate) {
        filter.receivedDate.$gte = new Date(fromDate as string);
      }
      if (toDate) {
        filter.receivedDate.$lte = new Date(toDate as string);
      }
    }

    const orders = await Order.find(filter);

    // Calculate statistics
    const totalOrders = orders.length;
    const totalOrderValue = orders.reduce(
      (sum, order) => sum + (order.finalCost || order.estimatedCost),
      0
    );
    const totalPaymentReceived = orders.reduce(
      (sum, order) => sum + order.advancePayment,
      0
    );
    const totalPending = orders.reduce(
      (sum, order) => sum + order.balancePayment,
      0
    );

    // Completed orders (those with 'completed' or 'delivered' stage)
    const completedOrders = orders.filter(
      (order) =>
        order.stageName?.toLowerCase().includes("completed") ||
        order.stageName?.toLowerCase().includes("delivered")
    );
    const totalCompletedValue = completedOrders.reduce(
      (sum, order) => sum + (order.finalCost || order.estimatedCost),
      0
    );

    // Payment status breakdown
    const paymentStatusBreakdown = {
      paid: orders.filter((o) => o.paymentStatus === "paid").length,
      partial: orders.filter((o) => o.paymentStatus === "partial").length,
      unpaid: orders.filter((o) => o.paymentStatus === "unpaid").length,
    };

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalOrderValue,
        totalPaymentReceived,
        totalPending,
        totalCompletedOrders: completedOrders.length,
        totalCompletedValue,
        paymentStatusBreakdown,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching order statistics",
    });
  }
};

// Add payment to order
export const addPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, method, notes } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        message: "Valid payment amount is required",
      });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    // Update payment details
    const newPaidAmount = order.advancePayment + amount;
    const totalCost = order.finalCost || order.estimatedCost;
    const newBalancePayment = totalCost - newPaidAmount;

    // Determine payment status
    let paymentStatus: "unpaid" | "partial" | "paid" = "partial";
    if (newPaidAmount >= totalCost) {
      paymentStatus = "paid";
    } else if (newPaidAmount === 0) {
      paymentStatus = "unpaid";
    }

    // Add payment note
    const paymentNote = {
      note: `Payment received: ₹${amount} via ${method}${
        notes ? ` - ${notes}` : ""
      }`,
      addedBy: req.user._id,
      addedByName: req.user.fullName,
      timestamp: new Date(),
    };

    order.advancePayment = newPaidAmount;
    order.balancePayment = newBalancePayment;
    order.paymentStatus = paymentStatus;
    order.internalNotes.push(paymentNote);

    await order.save();

    // Log payment activity
    await logActivity({
      orderId: order._id,
      orderNumber: order.orderNumber,
      companyId: order.companyId,
      activityType: 'payment_added',
      title: 'Payment Received',
      description: `Payment of ₹${amount} received via ${method}. Balance: ₹${newBalancePayment}${notes ? ` - ${notes}` : ''}`,
      performedBy: req.user.id,
      performedByName: req.user.fullName,
      stageId: order.stageId,
      stageName: order.stageName,
      metadata: {
        amount,
        method,
        totalPaid: newPaidAmount,
        balance: newBalancePayment,
        paymentStatus,
      },
    });

    res.status(200).json({
      success: true,
      data: order,
      message: "Payment added successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error adding payment",
    });
  }
};
