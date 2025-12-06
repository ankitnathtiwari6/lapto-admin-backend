import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import SaleRecord from '../models/SaleRecord';
import PurchaseRecord from '../models/PurchaseRecord';
import mongoose from 'mongoose';

// Get sales summary for GST reporting
export const getSalesSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { financialYear, quarter, month, fromDate, toDate } = req.query;

    // Build filter
    const filter: any = { isDeleted: false, isCancelled: false };

    if (financialYear) {
      filter.financialYear = financialYear;
    }

    if (quarter) {
      filter.quarter = quarter;
    }

    if (month) {
      filter.month = parseInt(month as string);
    }

    if (fromDate || toDate) {
      filter.saleDate = {};
      if (fromDate) {
        filter.saleDate.$gte = new Date(fromDate as string);
      }
      if (toDate) {
        filter.saleDate.$lte = new Date(toDate as string);
      }
    }

    const sales = await SaleRecord.find(filter).sort({ saleDate: -1 });

    // Calculate summary
    const summary = {
      totalSales: sales.length,
      totalTaxableValue: sales.reduce((sum, s) => sum + s.taxableValue, 0),
      totalCGST: sales.reduce((sum, s) => sum + s.cgst, 0),
      totalSGST: sales.reduce((sum, s) => sum + s.sgst, 0),
      totalIGST: sales.reduce((sum, s) => sum + s.igst, 0),
      totalGST: sales.reduce((sum, s) => sum + s.totalGST, 0),
      totalAmount: sales.reduce((sum, s) => sum + s.finalAmount, 0),
      totalPaid: sales.reduce((sum, s) => sum + s.paidAmount, 0),
      totalPending: sales.reduce((sum, s) => sum + s.balanceAmount, 0)
    };

    res.status(200).json({
      success: true,
      data: {
        summary,
        sales
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching sales summary'
    });
  }
};

// Get purchases summary for GST reporting
export const getPurchasesSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { financialYear, quarter, month, fromDate, toDate } = req.query;

    // Build filter
    const filter: any = { isDeleted: false, isCancelled: false };

    if (financialYear) {
      filter.financialYear = financialYear;
    }

    if (quarter) {
      filter.quarter = quarter;
    }

    if (month) {
      filter.month = parseInt(month as string);
    }

    if (fromDate || toDate) {
      filter.purchaseDate = {};
      if (fromDate) {
        filter.purchaseDate.$gte = new Date(fromDate as string);
      }
      if (toDate) {
        filter.purchaseDate.$lte = new Date(toDate as string);
      }
    }

    const purchases = await PurchaseRecord.find(filter).sort({ purchaseDate: -1 });

    // Calculate summary
    const summary = {
      totalPurchases: purchases.length,
      totalTaxableValue: purchases.reduce((sum, p) => sum + p.taxableValue, 0),
      totalCGST: purchases.reduce((sum, p) => sum + p.cgst, 0),
      totalSGST: purchases.reduce((sum, p) => sum + p.sgst, 0),
      totalIGST: purchases.reduce((sum, p) => sum + p.igst, 0),
      totalGST: purchases.reduce((sum, p) => sum + p.totalGST, 0),
      totalAmount: purchases.reduce((sum, p) => sum + p.finalAmount, 0),
      totalPaid: purchases.reduce((sum, p) => sum + p.paidAmount, 0),
      totalPending: purchases.reduce((sum, p) => sum + p.balanceAmount, 0)
    };

    res.status(200).json({
      success: true,
      data: {
        summary,
        purchases
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching purchases summary'
    });
  }
};

// Get GSTR-1 data (Outward supplies - Sales)
export const getGSTR1Data = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { financialYear, quarter, month } = req.query;

    if (!financialYear) {
      res.status(400).json({
        success: false,
        message: 'Financial year is required'
      });
      return;
    }

    const filter: any = {
      isDeleted: false,
      isCancelled: false,
      financialYear
    };

    if (quarter) {
      filter.quarter = quarter;
    }

    if (month) {
      filter.month = parseInt(month as string);
    }

    const sales = await SaleRecord.find(filter).sort({ saleDate: 1 });

    // Group by tax rate for B2B supplies
    const b2bSupplies = sales.filter(s => s.customerGSTIN);
    const b2cSupplies = sales.filter(s => !s.customerGSTIN);

    // Group by GST rate
    const taxRateSummary: any = {};
    sales.forEach(sale => {
      const rate = sale.gstRate;
      if (!taxRateSummary[rate]) {
        taxRateSummary[rate] = {
          gstRate: rate,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
          count: 0
        };
      }
      taxRateSummary[rate].taxableValue += sale.taxableValue;
      taxRateSummary[rate].cgst += sale.cgst;
      taxRateSummary[rate].sgst += sale.sgst;
      taxRateSummary[rate].igst += sale.igst;
      taxRateSummary[rate].totalTax += sale.totalGST;
      taxRateSummary[rate].count++;
    });

    const gstr1Data = {
      period: quarter || `Month ${month}`,
      financialYear,
      b2b: {
        count: b2bSupplies.length,
        totalTaxableValue: b2bSupplies.reduce((sum, s) => sum + s.taxableValue, 0),
        totalTax: b2bSupplies.reduce((sum, s) => sum + s.totalGST, 0),
        supplies: b2bSupplies
      },
      b2c: {
        count: b2cSupplies.length,
        totalTaxableValue: b2cSupplies.reduce((sum, s) => sum + s.taxableValue, 0),
        totalTax: b2cSupplies.reduce((sum, s) => sum + s.totalGST, 0)
      },
      taxRateSummary: Object.values(taxRateSummary),
      totals: {
        totalInvoices: sales.length,
        totalTaxableValue: sales.reduce((sum, s) => sum + s.taxableValue, 0),
        totalCGST: sales.reduce((sum, s) => sum + s.cgst, 0),
        totalSGST: sales.reduce((sum, s) => sum + s.sgst, 0),
        totalIGST: sales.reduce((sum, s) => sum + s.igst, 0),
        totalTax: sales.reduce((sum, s) => sum + s.totalGST, 0)
      }
    };

    res.status(200).json({
      success: true,
      data: gstr1Data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating GSTR-1 data'
    });
  }
};

// Get GSTR-3B data (Summary return)
export const getGSTR3BData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { financialYear, month } = req.query;

    if (!financialYear || !month) {
      res.status(400).json({
        success: false,
        message: 'Financial year and month are required'
      });
      return;
    }

    const monthNum = parseInt(month as string);

    // Get sales for the month
    const sales = await SaleRecord.find({
      isDeleted: false,
      isCancelled: false,
      financialYear,
      month: monthNum
    });

    // Get purchases for the month
    const purchases = await PurchaseRecord.find({
      isDeleted: false,
      isCancelled: false,
      financialYear,
      month: monthNum
    });

    // Calculate outward supplies (sales)
    const outwardSupplies = {
      totalTaxableValue: sales.reduce((sum, s) => sum + s.taxableValue, 0),
      totalCGST: sales.reduce((sum, s) => sum + s.cgst, 0),
      totalSGST: sales.reduce((sum, s) => sum + s.sgst, 0),
      totalIGST: sales.reduce((sum, s) => sum + s.igst, 0),
      totalTax: sales.reduce((sum, s) => sum + s.totalGST, 0)
    };

    // Calculate inward supplies (purchases) - Input Tax Credit
    const inwardSupplies = {
      totalTaxableValue: purchases.reduce((sum, p) => sum + p.taxableValue, 0),
      totalCGST: purchases.reduce((sum, p) => sum + p.cgst, 0),
      totalSGST: purchases.reduce((sum, p) => sum + p.sgst, 0),
      totalIGST: purchases.reduce((sum, p) => sum + p.igst, 0),
      totalTax: purchases.reduce((sum, p) => sum + p.totalGST, 0)
    };

    // Calculate net tax liability
    const netTaxLiability = {
      cgst: Math.max(0, outwardSupplies.totalCGST - inwardSupplies.totalCGST),
      sgst: Math.max(0, outwardSupplies.totalSGST - inwardSupplies.totalSGST),
      igst: Math.max(0, outwardSupplies.totalIGST - inwardSupplies.totalIGST),
      total: 0
    };

    netTaxLiability.total = netTaxLiability.cgst + netTaxLiability.sgst + netTaxLiability.igst;

    const gstr3bData = {
      financialYear,
      month: monthNum,
      outwardSupplies,
      inwardSupplies,
      netTaxLiability,
      summary: {
        totalSales: sales.length,
        totalPurchases: purchases.length,
        taxPayable: netTaxLiability.total
      }
    };

    res.status(200).json({
      success: true,
      data: gstr3bData
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating GSTR-3B data'
    });
  }
};

// Get profit and loss statement
export const getProfitLoss = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { financialYear, fromDate, toDate } = req.query;

    const salesFilter: any = { isDeleted: false, isCancelled: false };
    const purchasesFilter: any = { isDeleted: false, isCancelled: false };

    if (financialYear) {
      salesFilter.financialYear = financialYear;
      purchasesFilter.financialYear = financialYear;
    }

    if (fromDate || toDate) {
      salesFilter.saleDate = {};
      purchasesFilter.purchaseDate = {};

      if (fromDate) {
        salesFilter.saleDate.$gte = new Date(fromDate as string);
        purchasesFilter.purchaseDate.$gte = new Date(fromDate as string);
      }
      if (toDate) {
        salesFilter.saleDate.$lte = new Date(toDate as string);
        purchasesFilter.purchaseDate.$lte = new Date(toDate as string);
      }
    }

    const sales = await SaleRecord.find(salesFilter);
    const purchases = await PurchaseRecord.find(purchasesFilter);

    const totalRevenue = sales.reduce((sum, s) => sum + s.finalAmount, 0);
    const totalCost = purchases.reduce((sum, p) => sum + p.finalAmount, 0);
    const grossProfit = totalRevenue - totalCost;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const profitLoss = {
      period: financialYear || 'Custom Period',
      revenue: {
        totalSales: totalRevenue,
        salesCount: sales.length,
        averageSaleValue: sales.length > 0 ? totalRevenue / sales.length : 0
      },
      costs: {
        totalPurchases: totalCost,
        purchaseCount: purchases.length,
        averagePurchaseValue: purchases.length > 0 ? totalCost / purchases.length : 0
      },
      profit: {
        grossProfit,
        grossProfitMargin,
        netProfit: grossProfit // Can be adjusted with operational expenses
      },
      gst: {
        salesGST: sales.reduce((sum, s) => sum + s.totalGST, 0),
        purchaseGST: purchases.reduce((sum, p) => sum + p.totalGST, 0)
      }
    };

    res.status(200).json({
      success: true,
      data: profitLoss
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating profit & loss statement'
    });
  }
};

// Get balance sheet data
export const getBalanceSheet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { financialYear } = req.query;

    if (!financialYear) {
      res.status(400).json({
        success: false,
        message: 'Financial year is required'
      });
      return;
    }

    // Get all sales for the financial year
    const sales = await SaleRecord.find({
      isDeleted: false,
      isCancelled: false,
      financialYear
    });

    // Get all purchases for the financial year
    const purchases = await PurchaseRecord.find({
      isDeleted: false,
      isCancelled: false,
      financialYear
    });

    // Calculate assets (accounts receivable)
    const accountsReceivable = sales.reduce((sum, s) => sum + s.balanceAmount, 0);

    // Calculate liabilities (accounts payable)
    const accountsPayable = purchases.reduce((sum, p) => sum + p.balanceAmount, 0);

    // Calculate revenue and expenses
    const totalRevenue = sales.reduce((sum, s) => sum + s.finalAmount, 0);
    const totalExpenses = purchases.reduce((sum, p) => sum + p.finalAmount, 0);
    const netIncome = totalRevenue - totalExpenses;

    const balanceSheet = {
      financialYear,
      assets: {
        accountsReceivable,
        cash: sales.reduce((sum, s) => sum + s.paidAmount, 0),
        total: accountsReceivable + sales.reduce((sum, s) => sum + s.paidAmount, 0)
      },
      liabilities: {
        accountsPayable,
        gstPayable: sales.reduce((sum, s) => sum + s.totalGST, 0) -
                     purchases.reduce((sum, p) => sum + p.totalGST, 0),
        total: accountsPayable
      },
      equity: {
        retainedEarnings: netIncome,
        total: netIncome
      },
      summary: {
        totalSales: sales.length,
        totalPurchases: purchases.length,
        netIncome
      }
    };

    res.status(200).json({
      success: true,
      data: balanceSheet
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating balance sheet'
    });
  }
};

// Get monthly trend analysis
export const getMonthlyTrends = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { financialYear } = req.query;

    if (!financialYear) {
      res.status(400).json({
        success: false,
        message: 'Financial year is required'
      });
      return;
    }

    // Aggregate sales by month
    const salesByMonth = await SaleRecord.aggregate([
      {
        $match: {
          isDeleted: false,
          isCancelled: false,
          financialYear: financialYear as string
        }
      },
      {
        $group: {
          _id: '$month',
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' },
          totalTax: { $sum: '$totalGST' },
          totalPaid: { $sum: '$paidAmount' },
          totalPending: { $sum: '$balanceAmount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Aggregate purchases by month
    const purchasesByMonth = await PurchaseRecord.aggregate([
      {
        $match: {
          isDeleted: false,
          isCancelled: false,
          financialYear: financialYear as string
        }
      },
      {
        $group: {
          _id: '$month',
          totalPurchases: { $sum: 1 },
          totalExpenses: { $sum: '$finalAmount' },
          totalTax: { $sum: '$totalGST' },
          totalPaid: { $sum: '$paidAmount' },
          totalPending: { $sum: '$balanceAmount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Merge sales and purchases data
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const salesData = salesByMonth.find(s => s._id === month) || {};
      const purchasesData = purchasesByMonth.find(p => p._id === month) || {};

      return {
        month,
        sales: {
          count: salesData.totalSales || 0,
          revenue: salesData.totalRevenue || 0,
          tax: salesData.totalTax || 0,
          paid: salesData.totalPaid || 0,
          pending: salesData.totalPending || 0
        },
        purchases: {
          count: purchasesData.totalPurchases || 0,
          expenses: purchasesData.totalExpenses || 0,
          tax: purchasesData.totalTax || 0,
          paid: purchasesData.totalPaid || 0,
          pending: purchasesData.totalPending || 0
        },
        profit: (salesData.totalRevenue || 0) - (purchasesData.totalExpenses || 0)
      };
    });

    res.status(200).json({
      success: true,
      data: {
        financialYear,
        monthlyData
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating monthly trends'
    });
  }
};
