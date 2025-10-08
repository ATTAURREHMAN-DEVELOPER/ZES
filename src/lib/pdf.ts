import jsPDF from 'jspdf';
import type { Invoice } from './db';

export function generateInvoicePDF(invoice: Invoice) {
  const doc = new jsPDF();
  
  // Set up colors matching the website's design system
  const primaryColor: [number, number, number] = [255, 193, 7]; // Golden yellow (primary: 45 93% 47%)
  const secondaryColor: [number, number, number] = [14, 165, 233]; // Sky blue (secondary: 200 95% 45%)
  const accentColor: [number, number, number] = [20, 184, 166]; // Teal (accent: 160 75% 45%)
  const destructiveColor: [number, number, number] = [239, 68, 68]; // Red (destructive: 0 84.2% 60.2%)
  const mutedColor: [number, number, number] = [241, 245, 249]; // Light gray (muted: 210 40% 96.1%)
  const sidebarColor: [number, number, number] = [30, 41, 59]; // Dark blue-gray (sidebar: 222 47% 11%)
  
  // Header with background using sidebar color
  doc.setFillColor(...sidebarColor);
  doc.rect(0, 0, 210, 50, 'F');
  
  // Add a golden accent stripe at the bottom
  doc.setFillColor(...primaryColor);
  doc.rect(0, 45, 210, 5, 'F');
  
  // Company logo/name with enhanced typography
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('ZES', 105, 20, { align: 'center' });
  
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text('Zia Electric and Solar Systems', 105, 28, { align: 'center' });
  
  // Shop address with better spacing
  doc.setFontSize(9);
  doc.text('Opposite Faizan e Masjid Abdul Qadir', 105, 35, { align: 'center' });
  doc.text('Qadir Avenue, Halanaka, Hyderabad', 105, 40, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Invoice details box with website colors
  doc.setFillColor(...mutedColor);
  doc.rect(20, 55, 170, 35, 'F');
  doc.setDrawColor(...secondaryColor);
  doc.setLineWidth(1);
  doc.rect(20, 55, 170, 35);
  
  // Invoice details with enhanced styling
  doc.setTextColor(...sidebarColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 30, 68);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 30, 75);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 30, 80);
  doc.text(`Customer: ${invoice.customerName}`, 30, 85);
  
  if (invoice.customerPhone) {
    doc.text(`Phone: ${invoice.customerPhone}`, 30, 90);
  }
  
  // Table header with background
  let y = 100;
  doc.setFillColor(...secondaryColor);
  doc.rect(20, y, 170, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 25, y + 6);
  doc.text('Qty', 100, y + 6);
  doc.text('Unit', 120, y + 6);
  doc.text('Rate', 145, y + 6);
  doc.text('Amount', 170, y + 6);
  
  // Table items
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  y += 15;
  
  invoice.items.forEach((item, index) => {
    // Alternate row colors using website muted color
    if (index % 2 === 0) {
      doc.setFillColor(...mutedColor);
      doc.rect(20, y - 7, 170, 10, 'F');
    }
    
    doc.text(item.productName, 25, y);
    doc.text(item.quantity.toString(), 100, y);
    doc.text(item.unit, 120, y);
    doc.text(`Rs ${item.pricePerUnit.toFixed(2)}`, 145, y);
    doc.text(`Rs ${item.total.toFixed(2)}`, 170, y);
    y += 10;
  });
  
  // Totals section
  y += 5;
  doc.setDrawColor(...secondaryColor);
  doc.setLineWidth(0.5);
  doc.line(120, y, 190, y);
  y += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal:', 120, y);
  doc.text(`Rs ${invoice.subtotal.toFixed(2)}`, 170, y);
  y += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Tax (0%):', 120, y);
  doc.text(`Rs ${invoice.tax.toFixed(2)}`, 170, y);
  y += 8;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Amount:', 120, y);
  doc.text(`Rs ${invoice.total.toFixed(2)}`, 170, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Paid Amount: Rs ${invoice.paid.toFixed(2)}`, 120, y);
  y += 8;
  
  if (invoice.due > 0) {
    doc.setTextColor(220, 38, 127); // Pink for due amount
    doc.setFont('helvetica', 'bold');
    doc.text(`Due Amount: Rs ${invoice.due.toFixed(2)}`, 120, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
  }
  
  // Payment method
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text(`Payment Method: ${invoice.paymentMethod.toUpperCase()}`, 20, y);
  
  // Status badges with website colors
  if (invoice.status === 'paid') {
    doc.setFillColor(...accentColor);
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(150, y - 8, 40, 12, 3, 3, 'F');
    doc.setFontSize(9);
    doc.text('PAID', 170, y - 2, { align: 'center' });
  } else if (invoice.status === 'partial') {
    doc.setFillColor(...primaryColor);
    doc.setTextColor(0, 0, 0);
    doc.roundedRect(150, y - 8, 40, 12, 3, 3, 'F');
    doc.setFontSize(9);
    doc.text('PARTIAL', 170, y - 2, { align: 'center' });
  } else {
    doc.setFillColor(...destructiveColor);
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(150, y - 8, 40, 12, 3, 3, 'F');
    doc.setFontSize(9);
    doc.text('UNPAID', 170, y - 2, { align: 'center' });
  }
  
  doc.setTextColor(0, 0, 0);
  
  // Footer section with enhanced styling
  y += 25;
  
  // Footer background
  doc.setFillColor(...mutedColor);
  doc.rect(10, y - 5, 190, 35, 'F');
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.rect(10, y - 5, 190, 35);
  
  // Thank you message
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Thank you for your business!', 105, y + 5, { align: 'center' });
  
  // Computerized bill notice
  y += 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...sidebarColor);
  doc.text('This is a computerized bill and does not require any signature.', 105, y, { align: 'center' });
  doc.text('For any queries, please contact us at your convenience.', 105, y + 5, { align: 'center' });
  
  // Clean design without page border
  
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
