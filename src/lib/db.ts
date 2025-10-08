import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { supabase } from './supabase';

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
  // Validate stock
  if (product.stock < 0) {
    throw new Error('Stock cannot be negative');
  }

  // Supabase branch
  if (import.meta.env.VITE_SUPABASE_URL) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        category: product.category,
        unit: product.unit,
        price_per_unit: product.pricePerUnit,
        cost_per_unit: product.costPerUnit ?? null,
        stock: product.stock,
        watts: product.watts ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data!.id as string;
  }
  if (window.api) {
    return window.api.invoke('db:addProduct', product);
  }
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.add('products', { ...product, id, createdAt: Date.now() });
  return id;
}

export async function updateProduct(id: string, updates: Partial<Product>) {
  // Validate stock if being updated
  if (updates.stock !== undefined && updates.stock < 0) {
    throw new Error('Stock cannot be negative');
  }

  if (import.meta.env.VITE_SUPABASE_URL) {
    const { error } = await supabase
      .from('products')
      .update({
        name: updates.name,
        category: updates.category,
        unit: updates.unit,
        price_per_unit: updates.pricePerUnit,
        cost_per_unit: updates.costPerUnit,
        stock: updates.stock,
        watts: updates.watts,
      })
      .eq('id', id);
    if (error) throw error;
    return;
  }
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
  if (import.meta.env.VITE_SUPABASE_URL) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  if (window.api) {
    await window.api.invoke('db:deleteProduct', id);
    return;
  }
  const db = await getDB();
  await db.delete('products', id);
}

export async function getAllProducts() {
  if (import.meta.env.VITE_SUPABASE_URL) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      unit: p.unit,
      pricePerUnit: Number(p.price_per_unit),
      costPerUnit: p.cost_per_unit != null ? Number(p.cost_per_unit) : undefined,
      stock: Number(p.stock),
      watts: p.watts ?? undefined,
      createdAt: new Date(p.created_at).getTime(),
    })) as Product[];
  }
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
  if (import.meta.env.VITE_SUPABASE_URL) {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: customer.name,
        phone: customer.phone,
        email: customer.email ?? null,
        address: customer.address ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data!.id as string;
  }
  if (window.api) {
    return window.api.invoke('db:addCustomer', customer);
  }
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.add('customers', { ...customer, id, totalDue: 0, createdAt: Date.now() });
  return id;
}

export async function updateCustomer(id: string, updates: Partial<Customer>) {
  if (import.meta.env.VITE_SUPABASE_URL) {
    const { error } = await supabase
      .from('customers')
      .update({
        name: updates.name,
        phone: updates.phone,
        email: updates.email,
        address: updates.address,
        total_due: updates.totalDue,
      })
      .eq('id', id);
    if (error) throw error;
    return;
  }
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
  if (import.meta.env.VITE_SUPABASE_URL) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email ?? undefined,
      address: c.address ?? undefined,
      totalDue: Number(c.total_due ?? 0),
      createdAt: new Date(c.created_at).getTime(),
    })) as Customer[];
  }
  if (window.api) {
    return window.api.invoke('db:getAllCustomers');
  }
  const db = await getDB();
  return db.getAll('customers');
}

export async function getCustomerByPhone(phone: string) {
  if (import.meta.env.VITE_SUPABASE_URL) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();
    if (error) throw error;
    return data as any;
  }
  const db = await getDB();
  return db.getFromIndex('customers', 'by-phone', phone);
}

// Invoice operations
export async function createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt'>) {
  if (import.meta.env.VITE_SUPABASE_URL) {
    const payload: any = {
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId ?? '',
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone ?? '',
      items: invoice.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unit: it.unit,
        pricePerUnit: it.pricePerUnit,
        costPerUnit: it.costPerUnit ?? null,
        total: it.total,
      })),
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      paid: invoice.paid,
      due: invoice.due,
      paymentMethod: invoice.paymentMethod,
      status: invoice.status,
    };
    const { data, error } = await supabase.rpc('create_invoice_rpc', { inv: payload });
    if (error) throw error;
    return data as string;
  }
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
  if (import.meta.env.VITE_SUPABASE_URL) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      customerId: inv.customer_id ?? undefined,
      customerName: inv.customer_name,
      items: (inv.invoice_items ?? []).map((it: any) => ({
        productId: it.product_id,
        productName: it.product_name,
        quantity: it.quantity,
        unit: it.unit,
        pricePerUnit: Number(it.price_per_unit),
        costPerUnit: it.cost_per_unit != null ? Number(it.cost_per_unit) : undefined,
        total: Number(it.total),
      })),
      subtotal: Number(inv.subtotal),
      tax: Number(inv.tax),
      total: Number(inv.total),
      paid: Number(inv.paid),
      due: Number(inv.due),
      paymentMethod: inv.payment_method,
      status: inv.status,
      createdAt: new Date(inv.created_at).getTime(),
      createdBy: inv.created_by,
      customerPhone: inv.customer_phone ?? undefined,
    })) as Invoice[];
  }
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
  if (import.meta.env.VITE_SUPABASE_URL) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      customerId: inv.customer_id ?? undefined,
      customerName: inv.customer_name,
      items: (inv.invoice_items ?? []).map((it: any) => ({
        productId: it.product_id,
        productName: it.product_name,
        quantity: it.quantity,
        unit: it.unit,
        pricePerUnit: Number(it.price_per_unit),
        costPerUnit: it.cost_per_unit != null ? Number(it.cost_per_unit) : undefined,
        total: Number(it.total),
      })),
      subtotal: Number(inv.subtotal),
      tax: Number(inv.tax),
      total: Number(inv.total),
      paid: Number(inv.paid),
      due: Number(inv.due),
      paymentMethod: inv.payment_method,
      status: inv.status,
      createdAt: new Date(inv.created_at).getTime(),
      createdBy: inv.created_by,
      customerPhone: inv.customer_phone ?? undefined,
    })) as Invoice[];
  }
  if (window.api) {
    return window.api.invoke('db:getInvoicesByStatus', status);
  }
  const db = await getDB();
  return db.getAllFromIndex('invoices', 'by-status', status);
}

// Payment operations
export async function addPayment(payment: Omit<Payment, 'id' | 'createdAt'>) {
  if (import.meta.env.VITE_SUPABASE_URL) {
    // 1) Insert payment
    const { error } = await supabase.from('payments').insert({
      invoice_id: payment.invoiceId,
      customer_id: payment.customerId ?? null,
      amount: payment.amount,
      method: payment.method,
    });
    if (error) throw error;
    // 2) Read invoice
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', payment.invoiceId)
      .single();
    if (invErr) throw invErr;
    if (!invoice) return 'ok';
    // 3) Compute new totals
    const newPaid = Number(invoice.paid || 0) + payment.amount;
    const newDue = Number(invoice.total || 0) - newPaid;
    const newStatus = newDue <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    // 4) Update invoice
    const { error: upErr } = await supabase
      .from('invoices')
      .update({ paid: newPaid, due: newDue, status: newStatus })
      .eq('id', payment.invoiceId);
    if (upErr) throw upErr;
    // 5) Update customer due if applicable
    if (invoice.customer_id) {
      const { data: cust, error: custErr } = await supabase
        .from('customers')
        .select('total_due')
        .eq('id', invoice.customer_id)
        .single();
      if (!custErr && cust) {
        const { error: custUpErr } = await supabase
          .from('customers')
          .update({ total_due: Number(cust.total_due || 0) - payment.amount })
          .eq('id', invoice.customer_id);
        if (custUpErr) throw custUpErr;
      }
    }
    return 'ok';
  }
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
