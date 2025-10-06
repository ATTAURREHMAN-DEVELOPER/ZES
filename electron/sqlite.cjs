const path = require('path');
const os = require('os');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbDir = path.join(os.homedir(), '.zes-local');
const dbPath = path.join(dbDir, 'store.sqlite');
let db;

function ensureDir() {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
}

function ensureDb() {
  ensureDir();
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    pricePerUnit REAL NOT NULL,
    costPerUnit REAL,
    stock INTEGER NOT NULL,
    watts TEXT,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    totalDue REAL NOT NULL,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoiceNumber TEXT NOT NULL,
    customerId TEXT,
    customerName TEXT NOT NULL,
    customerPhone TEXT,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    paid REAL NOT NULL,
    due REAL NOT NULL,
    paymentMethod TEXT NOT NULL,
    status TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    createdBy TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    invoiceId TEXT NOT NULL,
    productId TEXT NOT NULL,
    productName TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit TEXT NOT NULL,
    pricePerUnit REAL NOT NULL,
    costPerUnit REAL,
    total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoiceId TEXT NOT NULL,
    customerId TEXT,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    createdBy TEXT NOT NULL
  );
  `);
}

const dbApi = {
  'db:addProduct': (product) => {
    const id = product.id || crypto.randomUUID();
    const stmt = db.prepare(`INSERT INTO products (id,name,category,unit,pricePerUnit,costPerUnit,stock,watts,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`);
    stmt.run(id, product.name, product.category, product.unit, product.pricePerUnit, product.costPerUnit ?? null, product.stock, product.watts ?? null, Date.now());
    return id;
  },
  'db:updateProduct': (id, updates) => {
    const keys = Object.keys(updates);
    if (keys.length === 0) return true;
    const fields = keys.map(k => `${k} = ?`).join(',');
    const values = keys.map(k => updates[k]);
    const stmt = db.prepare(`UPDATE products SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
    return true;
  },
  'db:deleteProduct': (id) => {
    db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
    return true;
  },
  'db:getAllProducts': () => {
    return db.prepare(`SELECT * FROM products ORDER BY createdAt DESC`).all();
  },

  'db:getAllCustomers': () => db.prepare(`SELECT * FROM customers ORDER BY createdAt DESC`).all(),
  'db:addCustomer': (c) => {
    const id = c.id || crypto.randomUUID();
    db.prepare(`INSERT INTO customers (id,name,phone,email,address,totalDue,createdAt) VALUES (?,?,?,?,?,?,?)`).run(id, c.name, c.phone, c.email ?? null, c.address ?? null, 0, Date.now());
    return id;
  },
  'db:updateCustomer': (id, updates) => {
    const keys = Object.keys(updates);
    if (keys.length === 0) return true;
    const fields = keys.map(k => `${k} = ?`).join(',');
    const values = keys.map(k => updates[k]);
    db.prepare(`UPDATE customers SET ${fields} WHERE id = ?`).run(...values, id);
    return true;
  },

  'db:createInvoice': (invoice) => {
    const id = invoice.id || crypto.randomUUID();
    const createdAt = Date.now();
    db.prepare(`INSERT INTO invoices (id,invoiceNumber,customerId,customerName,customerPhone,subtotal,tax,total,paid,due,paymentMethod,status,createdAt,createdBy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, invoice.invoiceNumber, invoice.customerId ?? null, invoice.customerName, invoice.customerPhone ?? null, invoice.subtotal, invoice.tax, invoice.total, invoice.paid, invoice.due, invoice.paymentMethod, invoice.status, createdAt, invoice.createdBy);
    const itemStmt = db.prepare(`INSERT INTO invoice_items (invoiceId,productId,productName,quantity,unit,pricePerUnit,costPerUnit,total) VALUES (?,?,?,?,?,?,?,?)`);
    for (const it of invoice.items) {
      itemStmt.run(id, it.productId, it.productName, it.quantity, it.unit, it.pricePerUnit, it.costPerUnit ?? null, it.total);
      // decrement stock
      db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`).run(it.quantity, it.productId);
    }
    if (invoice.customerId && invoice.due > 0) {
      db.prepare(`UPDATE customers SET totalDue = totalDue + ? WHERE id = ?`).run(invoice.due, invoice.customerId);
    }
    return id;
  },
  'db:getAllInvoices': () => {
    const invs = db.prepare(`SELECT * FROM invoices ORDER BY createdAt DESC`).all();
    const itemsByInv = db.prepare(`SELECT * FROM invoice_items WHERE invoiceId = ?`);
    return invs.map((inv) => ({ ...inv, items: itemsByInv.all(inv.id) }));
  },
  'db:getInvoicesByStatus': (status) => {
    const invs = db.prepare(`SELECT * FROM invoices WHERE status = ? ORDER BY createdAt DESC`).all(status);
    const itemsByInv = db.prepare(`SELECT * FROM invoice_items WHERE invoiceId = ?`);
    return invs.map((inv) => ({ ...inv, items: itemsByInv.all(inv.id) }));
  },
  'db:addPayment': (payment) => {
    const id = payment.id || crypto.randomUUID();
    db.prepare(`INSERT INTO payments (id,invoiceId,customerId,amount,method,createdAt,createdBy) VALUES (?,?,?,?,?,?,?)`).run(id, payment.invoiceId, payment.customerId ?? null, payment.amount, payment.method, Date.now(), payment.createdBy);
    const inv = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(payment.invoiceId);
    if (inv) {
      const newPaid = inv.paid + payment.amount;
      const newDue = inv.total - newPaid;
      const newStatus = newDue === 0 ? 'paid' : newDue < inv.total ? 'partial' : 'unpaid';
      db.prepare(`UPDATE invoices SET paid = ?, due = ?, status = ? WHERE id = ?`).run(newPaid, newDue, newStatus, inv.id);
      if (inv.customerId) {
        db.prepare(`UPDATE customers SET totalDue = totalDue - ? WHERE id = ?`).run(payment.amount, inv.customerId);
      }
    }
    return id;
  },
};

module.exports = { ensureDb, dbApi, dbPath };


