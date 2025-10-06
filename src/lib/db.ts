import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface Product {
  id: string;
  name: string;
  category: string;
  unit: 'piece' | 'meter' | 'pack';
  pricePerUnit: number;
  costPerUnit?: number;
  stock: number;
  watts?: string;
  createdAt: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalDue: number;
  createdAt: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  due: number;
  paymentMethod: 'cash' | 'card' | 'easypay' | 'jazzcash' | 'bank';
  status: 'paid' | 'partial' | 'unpaid';
  createdAt: number;
  createdBy: string;
}

interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  costPerUnit?: number;
  total: number;
}

interface Payment {
  id: string;
  invoiceId: string;
  customerId?: string;
  amount: number;
  method: 'cash' | 'card' | 'easypay' | 'jazzcash' | 'bank';
  createdAt: number;
  createdBy: string;
}

interface ElectricStoreDB extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: { 'by-category': string };
  };
  customers: {
    key: string;
    value: Customer;
    indexes: { 'by-phone': string };
  };
  invoices: {
    key: string;
    value: Invoice;
    indexes: { 'by-customer': string; 'by-status': string; 'by-date': number };
  };
  payments: {
    key: string;
    value: Payment;
    indexes: { 'by-invoice': string; 'by-customer': string };
  };
}

let dbInstance: IDBPDatabase<ElectricStoreDB> | null = null;

export async function getDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ElectricStoreDB>('electric-store-db', 1, {
    upgrade(db) {
      // Products store
      const productStore = db.createObjectStore('products', { keyPath: 'id' });
      productStore.createIndex('by-category', 'category');

      // Customers store
      const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
      customerStore.createIndex('by-phone', 'phone');

      // Invoices store
      const invoiceStore = db.createObjectStore('invoices', { keyPath: 'id' });
      invoiceStore.createIndex('by-customer', 'customerId');
      invoiceStore.createIndex('by-status', 'status');
      invoiceStore.createIndex('by-date', 'createdAt');

      // Payments store
      const paymentStore = db.createObjectStore('payments', { keyPath: 'id' });
      paymentStore.createIndex('by-invoice', 'invoiceId');
      paymentStore.createIndex('by-customer', 'customerId');
    },
  });

  return dbInstance;
}

// Product operations
export async function addProduct(product: Omit<Product, 'id' | 'createdAt'>) {
  if (window.api) {
    return window.api.invoke('db:addProduct', product);
  }
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.add('products', { ...product, id, createdAt: Date.now() });
  return id;
}

export async function updateProduct(id: string, updates: Partial<Product>) {
  if (window.api) {
    await window.api.invoke('db:updateProduct', id, updates);
    return;
  }
  const db = await getDB();
  const product = await db.get('products', id);
  if (!product) throw new Error('Product not found');
  await db.put('products', { ...product, ...updates });
}

export async function deleteProduct(id: string) {
  if (window.api) {
    await window.api.invoke('db:deleteProduct', id);
    return;
  }
  const db = await getDB();
  await db.delete('products', id);
}

export async function getAllProducts() {
  if (window.api) {
    return window.api.invoke('db:getAllProducts');
  }
  const db = await getDB();
  return db.getAll('products');
}

export async function getProductsByCategory(category: string) {
  const db = await getDB();
  return db.getAllFromIndex('products', 'by-category', category);
}

// Customer operations
export async function addCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'totalDue'>) {
  if (window.api) {
    return window.api.invoke('db:addCustomer', customer);
  }
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.add('customers', { ...customer, id, totalDue: 0, createdAt: Date.now() });
  return id;
}

export async function updateCustomer(id: string, updates: Partial<Customer>) {
  if (window.api) {
    await window.api.invoke('db:updateCustomer', id, updates);
    return;
  }
  const db = await getDB();
  const customer = await db.get('customers', id);
  if (!customer) throw new Error('Customer not found');
  await db.put('customers', { ...customer, ...updates });
}

export async function getAllCustomers() {
  if (window.api) {
    return window.api.invoke('db:getAllCustomers');
  }
  const db = await getDB();
  return db.getAll('customers');
}

export async function getCustomerByPhone(phone: string) {
  const db = await getDB();
  return db.getFromIndex('customers', 'by-phone', phone);
}

// Invoice operations
export async function createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt'>) {
  if (window.api) {
    return window.api.invoke('db:createInvoice', invoice);
  }
  const db = await getDB();
  const id = crypto.randomUUID();
  const newInvoice = { ...invoice, id, createdAt: Date.now() };
  await db.add('invoices', newInvoice);
  if (invoice.due > 0 && invoice.customerId) {
    const customer = await db.get('customers', invoice.customerId);
    if (customer) {
      await updateCustomer(invoice.customerId, { totalDue: customer.totalDue + invoice.due });
    }
  }
  for (const item of invoice.items) {
    const product = await db.get('products', item.productId);
    if (product) {
      await updateProduct(item.productId, { stock: product.stock - item.quantity });
    }
  }
  return id;
}

export async function getAllInvoices() {
  if (window.api) {
    return window.api.invoke('db:getAllInvoices');
  }
  const db = await getDB();
  return db.getAll('invoices');
}

export async function getInvoicesByCustomer(customerId: string) {
  const db = await getDB();
  return db.getAllFromIndex('invoices', 'by-customer', customerId);
}

export async function getInvoicesByStatus(status: 'paid' | 'partial' | 'unpaid') {
  if (window.api) {
    return window.api.invoke('db:getInvoicesByStatus', status);
  }
  const db = await getDB();
  return db.getAllFromIndex('invoices', 'by-status', status);
}

// Payment operations
export async function addPayment(payment: Omit<Payment, 'id' | 'createdAt'>) {
  if (window.api) {
    return window.api.invoke('db:addPayment', payment);
  }
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.add('payments', { ...payment, id, createdAt: Date.now() });
  const invoice = await db.get('invoices', payment.invoiceId);
  if (invoice) {
    const newPaid = invoice.paid + payment.amount;
    const newDue = invoice.total - newPaid;
    const newStatus = newDue === 0 ? 'paid' : newDue < invoice.total ? 'partial' : 'unpaid';
    await db.put('invoices', { ...invoice, paid: newPaid, due: newDue, status: newStatus });
    if (invoice.customerId) {
      const customer = await db.get('customers', invoice.customerId);
      if (customer) {
        await updateCustomer(invoice.customerId, { totalDue: customer.totalDue - payment.amount });
      }
    }
  }
  return id;
}

export async function getPaymentsByInvoice(invoiceId: string) {
  const db = await getDB();
  return db.getAllFromIndex('payments', 'by-invoice', invoiceId);
}

export type { Product, Customer, Invoice, InvoiceItem, Payment };
