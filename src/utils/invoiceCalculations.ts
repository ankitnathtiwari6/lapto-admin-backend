interface ServiceItem {
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

interface InvoiceCalculations {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalAmount: number;
  roundOff: number;
  finalAmount: number;
}

export const calculateInvoiceAmounts = (
  services: ServiceItem[],
  additionalDiscount: number = 0,
  taxRate: number = 18,
  isInterState: boolean = false
): InvoiceCalculations => {
  // Calculate subtotal from all services
  const subtotal = services.reduce((sum, service) => {
    const itemTotal = service.quantity * service.unitPrice;
    return sum + itemTotal;
  }, 0);

  // Calculate total discount (service-level + additional discount)
  const serviceDiscounts = services.reduce((sum, service) => {
    return sum + service.discount;
  }, 0);
  const totalDiscount = serviceDiscounts + additionalDiscount;

  // Taxable amount after discount
  const taxableAmount = subtotal - totalDiscount;

  // Calculate GST based on inter-state or intra-state
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterState) {
    // Inter-state: IGST
    igst = (taxableAmount * taxRate) / 100;
  } else {
    // Intra-state: CGST + SGST (split equally)
    cgst = (taxableAmount * (taxRate / 2)) / 100;
    sgst = (taxableAmount * (taxRate / 2)) / 100;
  }

  const totalTax = cgst + sgst + igst;

  // Total amount before rounding
  const totalAmount = taxableAmount + totalTax;

  // Round off to nearest rupee
  const finalAmount = Math.round(totalAmount);
  const roundOff = finalAmount - totalAmount;

  return {
    subtotal,
    discount: totalDiscount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    totalTax,
    totalAmount,
    roundOff,
    finalAmount
  };
};

export const calculateServiceItemAmounts = (
  quantity: number,
  unitPrice: number,
  discount: number = 0,
  taxRate: number = 18
) => {
  const subtotal = quantity * unitPrice;
  const discountedAmount = subtotal - discount;
  const taxAmount = (discountedAmount * taxRate) / 100;
  const totalAmount = discountedAmount + taxAmount;

  return {
    subtotal,
    taxAmount,
    totalAmount
  };
};

export const calculatePaymentStatus = (
  finalAmount: number,
  paidAmount: number
): 'unpaid' | 'partial' | 'paid' => {
  if (paidAmount === 0) return 'unpaid';
  if (paidAmount >= finalAmount) return 'paid';
  return 'partial';
};
