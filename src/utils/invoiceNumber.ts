import Invoice from '../models/Invoice';

export const generateInvoiceNumber = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');

  const prefix = `INV${year}${month}`;

  const lastInvoice = await Invoice.findOne({
    invoiceNumber: new RegExp(`^${prefix}`)
  }).sort({ createdAt: -1 });

  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};
