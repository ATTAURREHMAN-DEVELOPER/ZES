import jsPDF from 'jspdf';
import type { Invoice } from './db';

export function generateInvoicePDF(invoice: Invoice) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ZES', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Zia Electric and Solar Systems', 105, 28, { align: 'center' });
  
  // Invoice details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice: ${invoice.invoiceNumber}`, 20, 45);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 20, 52);
  doc.text(`Customer: ${invoice.customerName}`, 20, 59);
  let headerBottom = 65;
  if (invoice.customerPhone) {
    doc.text(`Phone: ${invoice.customerPhone}`, 20, 66);
    headerBottom = 72;
  }
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.line(20, headerBottom, 190, headerBottom);
  
  // Table header
  doc.setFont('helvetica', 'bold');
  let y = headerBottom + 10;
  doc.text('Item', 20, y);
  doc.text('Qty', 100, y);
  doc.text('Unit', 120, y);
  doc.text('Price', 145, y);
  doc.text('Total', 170, y);
  
  // Table items
  doc.setFont('helvetica', 'normal');
  y += 7;
  invoice.items.forEach((item) => {
    doc.text(item.productName, 20, y);
    doc.text(item.quantity.toString(), 100, y);
    doc.text(item.unit, 120, y);
    doc.text(`Rs ${item.pricePerUnit.toFixed(2)}`, 145, y);
    doc.text(`Rs ${item.total.toFixed(2)}`, 170, y);
    y += 7;
  });
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 10;
  
  // Totals
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal:', 120, y);
  doc.text(`Rs ${invoice.subtotal.toFixed(2)}`, 170, y);
  y += 7;
  
  doc.text('Tax:', 120, y);
  doc.text(`Rs ${invoice.tax.toFixed(2)}`, 170, y);
  y += 7;
  
  doc.setFontSize(12);
  doc.text('Total:', 120, y);
  doc.text(`Rs ${invoice.total.toFixed(2)}`, 170, y);
  y += 7;
  
  doc.setFontSize(10);
  doc.text('Paid:', 120, y);
  doc.text(`Rs ${invoice.paid.toFixed(2)}`, 170, y);
  y += 7;
  
  if (invoice.due > 0) {
    doc.setTextColor(255, 0, 0);
    doc.text('Due:', 120, y);
    doc.text(`Rs ${invoice.due.toFixed(2)}`, 170, y);
    doc.setTextColor(0, 0, 0);
  }
  
  // Payment method
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Method: ${invoice.paymentMethod.toUpperCase()}`, 20, y);
  
  // Footer
  doc.setFontSize(8);
  doc.text('Thank you for your business!', 105, 280, { align: 'center' });
  
  return doc;
}

export function savePDF(invoice: Invoice) {
  const doc = generateInvoicePDF(invoice);
  doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
}

export function printPDF(invoice: Invoice) {
  const doc = generateInvoicePDF(invoice);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}
