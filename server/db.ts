/**
 * KANGI Stock Manager — SQLite persistence layer (better-sqlite3)
 *
 * Replaces the old flat-JSON-file "database" with a real relational
 * database file at data/kangi.db. Complex nested sub-objects that don't
 * need to be queried on their own (customer timelines, sale line items,
 * shopping-history line items, supplier product lists) are stored as
 * JSON text columns — everything else is a real typed column.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import {
  INITIAL_PRODUCTS,
  INITIAL_SUPPLIERS,
  INITIAL_PRIORITY_LABELS,
  INITIAL_CUSTOMERS,
  INITIAL_FOLLOW_UPS,
  INITIAL_SHOPPING_LIST,
  INITIAL_SHOPPING_HISTORY,
  INITIAL_SALES,
  INITIAL_PURCHASES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SETTINGS,
} from '../src/data/seedData.js';

// On a platform with a mounted persistent volume (Railway, Render, etc.),
// set DATA_DIR to that volume's mount path so the database survives
// redeploys. Defaults to ./data next to the running process otherwise.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'kangi.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const DEFAULT_CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Tools & Accessories',
  'Hardware',
  'Lighting',
  'Cables',
  'Paint & Building',
  'Experimental/New Products',
];

// Demo staff — same PINs the frontend has always shipped with. Passwords
// are only used for the optional email/password login; PIN is the primary
// till login on a shared POS terminal.
const DEMO_STAFF = [
  {
    uid: 'demo-admin',
    email: 'admin@kangistock.co.ke',
    displayName: 'James Kangi',
    role: 'admin',
    phone: '+254 712 345 678',
    pin: '1234',
    password: 'demo1234',
    storeLocation: 'Nairobi Main Branch',
  },
  {
    uid: 'demo-manager',
    email: 'manager@kangistock.co.ke',
    displayName: 'Grace Wambui',
    role: 'manager',
    phone: '+254 722 987 654',
    pin: '2222',
    password: 'demo1234',
    storeLocation: 'Nairobi Main Branch',
  },
  {
    uid: 'demo-cashier',
    email: 'cashier@kangistock.co.ke',
    displayName: 'Brian Ochieng',
    role: 'cashier',
    phone: '+254 733 112 233',
    pin: '1111',
    password: 'demo1234',
    storeLocation: 'Nairobi Main Branch',
  },
  {
    uid: 'demo-clerk',
    email: 'clerk@kangistock.co.ke',
    displayName: 'Faith Wanjiku',
    role: 'clerk',
    phone: '+254 799 445 566',
    pin: '3333',
    password: 'demo1234',
    storeLocation: 'Nairobi Main Branch',
  },
];

// ===========================================================================
// SCHEMA
// ===========================================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT, name TEXT, category TEXT, unit TEXT,
    buyingPrice REAL, sellingPrice REAL,
    openingStock REAL, currentStock REAL,
    minStockLevel REAL, reorderLevel REAL,
    supplierId TEXT, supplierName TEXT,
    status TEXT, dateAdded TEXT, notes TEXT
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT, contactPerson TEXT, phone TEXT, email TEXT, location TEXT,
    productsSupplied TEXT, paymentTerms TEXT, notes TEXT, dateAdded TEXT
  );

  CREATE TABLE IF NOT EXISTS priority_labels (
    id TEXT PRIMARY KEY,
    name TEXT, color TEXT, description TEXT, level INTEGER,
    isActive INTEGER, isDefault INTEGER
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT, phone TEXT, email TEXT, location TEXT,
    customerType TEXT, businessName TEXT, status TEXT, customerStatus TEXT,
    preferredContactMethod TEXT, dateAdded TEXT, dateFirstContacted TEXT,
    lastContactDate TEXT, nextFollowUpDate TEXT,
    productInterests TEXT, notesHistory TEXT, notes TEXT, timeline TEXT,
    totalPurchases REAL, totalSpent REAL, totalProfitGenerated REAL
  );

  CREATE TABLE IF NOT EXISTS follow_ups (
    id TEXT PRIMARY KEY,
    customerId TEXT, customerName TEXT, customerPhone TEXT,
    date TEXT, time TEXT, type TEXT, followUpType TEXT,
    productOrService TEXT, reasonForFollowUp TEXT, notes TEXT,
    outcome TEXT, completionNotes TEXT,
    nextFollowUpDate TEXT, nextFollowUpTime TEXT, status TEXT,
    addToGoogleCalendar INTEGER, googleCalendarEventId TEXT,
    googleCalendarSyncStatus TEXT, googleCalendarReminderMinutes INTEGER,
    reminderTiming TEXT, completedAt TEXT, createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS shopping_list (
    id TEXT PRIMARY KEY,
    productId TEXT, productName TEXT, sku TEXT, category TEXT, unit TEXT,
    quantityRequired REAL, quantityPurchased REAL,
    estimatedUnitPrice REAL, estimatedBuyingPrice REAL, estimatedTotalCost REAL,
    supplierId TEXT, supplierName TEXT,
    priorityLabelId TEXT, priorityLabelName TEXT, priorityColor TEXT,
    purchaseStatus TEXT, targetDate TEXT, targetPurchaseDate TEXT,
    dateAdded TEXT, notes TEXT
  );

  CREATE TABLE IF NOT EXISTS shopping_history (
    id TEXT PRIMARY KEY,
    shoppingListItemId TEXT, productName TEXT, sku TEXT,
    supplierId TEXT, supplierName TEXT,
    datePurchased TEXT, date TEXT, itemsCount REAL, totalQuantity REAL,
    quantityPurchased REAL, estimatedUnitPrice REAL, actualUnitPrice REAL,
    estimatedTotalCost REAL, estimatedCost REAL,
    actualTotalCost REAL, actualCost REAL,
    savingsAchieved REAL, savings REAL,
    items TEXT, purchaseRecordId TEXT, notes TEXT
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    receiptNumber TEXT, invoiceNumber TEXT,
    productId TEXT, productName TEXT, sku TEXT, category TEXT,
    quantity REAL, sellingPrice REAL, totalSale REAL,
    unitBuyingPrice REAL, cogs REAL, grossProfit REAL, profitMargin REAL,
    customerId TEXT, customerName TEXT, customerPhone TEXT,
    items TEXT, totalAmount REAL, totalCost REAL,
    paymentMethod TEXT, date TEXT, reference TEXT, notes TEXT, createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    productId TEXT, productName TEXT, sku TEXT,
    supplierId TEXT, supplierName TEXT,
    quantity REAL, unitCost REAL, buyingPrice REAL, totalCost REAL,
    date TEXT, invoiceNumber TEXT, referenceNumber TEXT,
    paymentStatus TEXT, notes TEXT, shoppingListItemId TEXT, createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    date TEXT, productId TEXT, productName TEXT, sku TEXT,
    quantity REAL, movementType TEXT, unitCost REAL,
    referenceNumber TEXT, supplierOrCustomerName TEXT, notes TEXT, createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    businessName TEXT, ownerName TEXT, phone TEXT, email TEXT, location TEXT,
    currency TEXT, lowStockThresholdDefault REAL, receiptFooter TEXT,
    autoAddLowStockToShoppingList INTEGER, defaultPriorityLabelId TEXT,
    googleCalendarConnected INTEGER, googleAccountEmail TEXT, googleClientId TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE, displayName TEXT, photoURL TEXT, role TEXT,
    phone TEXT, pin TEXT, passwordHash TEXT, storeLocation TEXT,
    isActive INTEGER, createdAt TEXT, lastLoginAt TEXT
  );

  CREATE TABLE IF NOT EXISTS session_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT, action TEXT, userName TEXT, userEmail TEXT,
    role TEXT, details TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
  CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
  CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(productId);
  CREATE INDEX IF NOT EXISTS idx_shopping_list_status ON shopping_list(purchaseStatus);
  CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
`);

// ===========================================================================
// JSON <-> ROW HELPERS
// ===========================================================================
const j = (v: any) => (v === undefined || v === null ? null : JSON.stringify(v));
const parseJ = (v: any, fallback: any) => {
  if (v === null || v === undefined) return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};
const bool = (v: any) => (v ? 1 : 0);
const asBool = (v: any) => !!v;

function rowToProduct(r: any) {
  if (!r) return r;
  return { ...r };
}
function rowToSupplier(r: any) {
  if (!r) return r;
  return { ...r, productsSupplied: parseJ(r.productsSupplied, []) };
}
function rowToPriorityLabel(r: any) {
  if (!r) return r;
  return { ...r, isActive: r.isActive === null ? undefined : asBool(r.isActive), isDefault: r.isDefault === null ? undefined : asBool(r.isDefault) };
}
function rowToCustomer(r: any) {
  if (!r) return r;
  let notes: any = r.notes;
  try {
    const parsed = JSON.parse(r.notes);
    if (Array.isArray(parsed)) notes = parsed;
  } catch {
    // plain string notes, leave as-is
  }
  return {
    ...r,
    productInterests: parseJ(r.productInterests, []),
    notesHistory: parseJ(r.notesHistory, []),
    timeline: parseJ(r.timeline, []),
    notes,
  };
}
function rowToFollowUp(r: any) {
  if (!r) return r;
  return { ...r, addToGoogleCalendar: asBool(r.addToGoogleCalendar) };
}
function rowToShoppingItem(r: any) {
  if (!r) return r;
  return { ...r };
}
function rowToShoppingHistory(r: any) {
  if (!r) return r;
  return { ...r, items: r.items ? parseJ(r.items, []) : undefined };
}
function rowToSale(r: any) {
  if (!r) return r;
  return { ...r, items: r.items ? parseJ(r.items, []) : undefined };
}
function rowToPurchase(r: any) {
  if (!r) return r;
  return { ...r };
}
function rowToStockMovement(r: any) {
  if (!r) return r;
  return { ...r };
}
function rowToSettings(r: any) {
  if (!r) return r;
  const { id, ...rest } = r;
  return {
    ...rest,
    autoAddLowStockToShoppingList: r.autoAddLowStockToShoppingList === null ? undefined : asBool(r.autoAddLowStockToShoppingList),
    googleCalendarConnected: r.googleCalendarConnected === null ? undefined : asBool(r.googleCalendarConnected),
  };
}
export function rowToUser(r: any) {
  if (!r) return r;
  const { passwordHash, ...profile } = r;
  return { ...profile, isActive: asBool(r.isActive) };
}

// ===========================================================================
// SEED (only runs once, when the products table is empty)
// ===========================================================================
function seedIfEmpty() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM products').get() as any).c;
  if (count > 0) return;

  const insertMany = db.transaction(() => {
    const insCat = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
    DEFAULT_CATEGORIES.forEach((c) => insCat.run(c));

    const insProd = db.prepare(`INSERT INTO products
      (id, sku, name, category, unit, buyingPrice, sellingPrice, openingStock, currentStock, minStockLevel, reorderLevel, supplierId, supplierName, status, dateAdded, notes)
      VALUES (@id,@sku,@name,@category,@unit,@buyingPrice,@sellingPrice,@openingStock,@currentStock,@minStockLevel,@reorderLevel,@supplierId,@supplierName,@status,@dateAdded,@notes)`);
    INITIAL_PRODUCTS.forEach((p: any) => insProd.run({ minStockLevel: null, reorderLevel: null, supplierId: null, supplierName: null, status: null, notes: null, ...p }));

    const insSup = db.prepare(`INSERT INTO suppliers (id,name,contactPerson,phone,email,location,productsSupplied,paymentTerms,notes,dateAdded)
      VALUES (@id,@name,@contactPerson,@phone,@email,@location,@productsSupplied,@paymentTerms,@notes,@dateAdded)`);
    INITIAL_SUPPLIERS.forEach((s: any) =>
      insSup.run({ contactPerson: null, email: null, paymentTerms: null, notes: null, dateAdded: null, ...s, productsSupplied: j(s.productsSupplied || []) })
    );

    const insLabel = db.prepare(`INSERT INTO priority_labels (id,name,color,description,level,isActive,isDefault)
      VALUES (@id,@name,@color,@description,@level,@isActive,@isDefault)`);
    INITIAL_PRIORITY_LABELS.forEach((l: any) =>
      insLabel.run({ description: null, level: null, ...l, isActive: bool(l.isActive), isDefault: bool(l.isDefault) })
    );

    const insCust = db.prepare(`INSERT INTO customers
      (id,name,phone,email,location,customerType,businessName,status,customerStatus,preferredContactMethod,dateAdded,dateFirstContacted,lastContactDate,nextFollowUpDate,productInterests,notesHistory,notes,timeline,totalPurchases,totalSpent,totalProfitGenerated)
      VALUES (@id,@name,@phone,@email,@location,@customerType,@businessName,@status,@customerStatus,@preferredContactMethod,@dateAdded,@dateFirstContacted,@lastContactDate,@nextFollowUpDate,@productInterests,@notesHistory,@notes,@timeline,@totalPurchases,@totalSpent,@totalProfitGenerated)`);
    INITIAL_CUSTOMERS.forEach((c: any) =>
      insCust.run({
        email: null, businessName: null, status: null, customerStatus: null, preferredContactMethod: null,
        dateAdded: null, dateFirstContacted: null, nextFollowUpDate: null,
        totalPurchases: 0, totalSpent: 0, totalProfitGenerated: 0,
        ...c,
        productInterests: j(c.productInterests || c.productsInterestedIn || []),
        notesHistory: j(c.notesHistory || []),
        notes: typeof c.notes === 'string' ? c.notes : j(c.notes || []),
        timeline: j(c.timeline || []),
      })
    );

    const insFu = db.prepare(`INSERT INTO follow_ups
      (id,customerId,customerName,customerPhone,date,time,type,followUpType,productOrService,reasonForFollowUp,notes,outcome,completionNotes,nextFollowUpDate,nextFollowUpTime,status,addToGoogleCalendar,googleCalendarEventId,googleCalendarSyncStatus,googleCalendarReminderMinutes,reminderTiming,completedAt,createdAt)
      VALUES (@id,@customerId,@customerName,@customerPhone,@date,@time,@type,@followUpType,@productOrService,@reasonForFollowUp,@notes,@outcome,@completionNotes,@nextFollowUpDate,@nextFollowUpTime,@status,@addToGoogleCalendar,@googleCalendarEventId,@googleCalendarSyncStatus,@googleCalendarReminderMinutes,@reminderTiming,@completedAt,@createdAt)`);
    INITIAL_FOLLOW_UPS.forEach((f: any) =>
      insFu.run({
        customerId: null, time: null, type: null, followUpType: null, notes: null, outcome: null,
        completionNotes: null, nextFollowUpDate: null, nextFollowUpTime: null,
        googleCalendarEventId: null, googleCalendarSyncStatus: null, googleCalendarReminderMinutes: null,
        reminderTiming: null, completedAt: null, createdAt: null,
        ...f,
        addToGoogleCalendar: bool(f.addToGoogleCalendar),
      })
    );

    const insShop = db.prepare(`INSERT INTO shopping_list
      (id,productId,productName,sku,category,unit,quantityRequired,quantityPurchased,estimatedUnitPrice,estimatedBuyingPrice,estimatedTotalCost,supplierId,supplierName,priorityLabelId,priorityLabelName,priorityColor,purchaseStatus,targetDate,targetPurchaseDate,dateAdded,notes)
      VALUES (@id,@productId,@productName,@sku,@category,@unit,@quantityRequired,@quantityPurchased,@estimatedUnitPrice,@estimatedBuyingPrice,@estimatedTotalCost,@supplierId,@supplierName,@priorityLabelId,@priorityLabelName,@priorityColor,@purchaseStatus,@targetDate,@targetPurchaseDate,@dateAdded,@notes)`);
    INITIAL_SHOPPING_LIST.forEach((s: any) =>
      insShop.run({
        productId: null, sku: null, category: null, unit: null, estimatedUnitPrice: null, estimatedBuyingPrice: null,
        supplierId: null, supplierName: null, priorityColor: null, targetDate: null,
        targetPurchaseDate: null, dateAdded: null, notes: null, quantityPurchased: 0,
        ...s,
      })
    );

    const insShist = db.prepare(`INSERT INTO shopping_history
      (id,shoppingListItemId,productName,sku,supplierId,supplierName,datePurchased,date,itemsCount,totalQuantity,quantityPurchased,estimatedUnitPrice,actualUnitPrice,estimatedTotalCost,estimatedCost,actualTotalCost,actualCost,savingsAchieved,savings,items,purchaseRecordId,notes)
      VALUES (@id,@shoppingListItemId,@productName,@sku,@supplierId,@supplierName,@datePurchased,@date,@itemsCount,@totalQuantity,@quantityPurchased,@estimatedUnitPrice,@actualUnitPrice,@estimatedTotalCost,@estimatedCost,@actualTotalCost,@actualCost,@savingsAchieved,@savings,@items,@purchaseRecordId,@notes)`);
    INITIAL_SHOPPING_HISTORY.forEach((s: any) =>
      insShist.run({
        shoppingListItemId: null, productName: null, sku: null, supplierId: null,
        datePurchased: null, date: null, itemsCount: null, totalQuantity: null,
        quantityPurchased: null, estimatedUnitPrice: null, actualUnitPrice: null,
        estimatedTotalCost: null, estimatedCost: null, actualTotalCost: null, actualCost: null,
        savingsAchieved: null, savings: null, purchaseRecordId: null, notes: null,
        ...s,
        items: j(s.items),
      })
    );

    const insSale = db.prepare(`INSERT INTO sales
      (id,receiptNumber,invoiceNumber,productId,productName,sku,category,quantity,sellingPrice,totalSale,unitBuyingPrice,cogs,grossProfit,profitMargin,customerId,customerName,customerPhone,items,totalAmount,totalCost,paymentMethod,date,reference,notes,createdAt)
      VALUES (@id,@receiptNumber,@invoiceNumber,@productId,@productName,@sku,@category,@quantity,@sellingPrice,@totalSale,@unitBuyingPrice,@cogs,@grossProfit,@profitMargin,@customerId,@customerName,@customerPhone,@items,@totalAmount,@totalCost,@paymentMethod,@date,@reference,@notes,@createdAt)`);
    INITIAL_SALES.forEach((s: any) =>
      insSale.run({
        receiptNumber: null, invoiceNumber: null, productId: null, productName: null, sku: null,
        category: null, quantity: null, sellingPrice: null, totalSale: null, unitBuyingPrice: null,
        cogs: null, profitMargin: null, customerId: null, customerName: null, customerPhone: null,
        totalAmount: null, totalCost: null, reference: null, notes: null, createdAt: null,
        ...s,
        items: j(s.items),
      })
    );

    const insPurch = db.prepare(`INSERT INTO purchases
      (id,productId,productName,sku,supplierId,supplierName,quantity,unitCost,buyingPrice,totalCost,date,invoiceNumber,referenceNumber,paymentStatus,notes,shoppingListItemId,createdAt)
      VALUES (@id,@productId,@productName,@sku,@supplierId,@supplierName,@quantity,@unitCost,@buyingPrice,@totalCost,@date,@invoiceNumber,@referenceNumber,@paymentStatus,@notes,@shoppingListItemId,@createdAt)`);
    INITIAL_PURCHASES.forEach((p: any) =>
      insPurch.run({
        sku: null, supplierId: null, supplierName: null, unitCost: null, buyingPrice: null,
        invoiceNumber: null, referenceNumber: null, paymentStatus: null, notes: null,
        shoppingListItemId: null, createdAt: null,
        ...p,
      })
    );

    const insMov = db.prepare(`INSERT INTO stock_movements
      (id,date,productId,productName,sku,quantity,movementType,unitCost,referenceNumber,supplierOrCustomerName,notes,createdAt)
      VALUES (@id,@date,@productId,@productName,@sku,@quantity,@movementType,@unitCost,@referenceNumber,@supplierOrCustomerName,@notes,@createdAt)`);
    INITIAL_STOCK_MOVEMENTS.forEach((m: any) =>
      insMov.run({ supplierOrCustomerName: null, notes: null, createdAt: null, ...m })
    );

    db.prepare(`INSERT INTO settings
      (id,businessName,ownerName,phone,email,location,currency,lowStockThresholdDefault,receiptFooter,autoAddLowStockToShoppingList,defaultPriorityLabelId,googleCalendarConnected,googleAccountEmail,googleClientId)
      VALUES (1,@businessName,@ownerName,@phone,@email,@location,@currency,@lowStockThresholdDefault,@receiptFooter,@autoAddLowStockToShoppingList,@defaultPriorityLabelId,@googleCalendarConnected,@googleAccountEmail,@googleClientId)`
    ).run({
      email: null, lowStockThresholdDefault: null, receiptFooter: null, defaultPriorityLabelId: null,
      googleAccountEmail: null, googleClientId: null,
      ...INITIAL_SETTINGS,
      autoAddLowStockToShoppingList: bool((INITIAL_SETTINGS as any).autoAddLowStockToShoppingList),
      googleCalendarConnected: bool((INITIAL_SETTINGS as any).googleCalendarConnected),
    });
  });

  insertMany();
  console.log(`Seeded SQLite database with ${INITIAL_PRODUCTS.length} demo products.`);
}
seedIfEmpty();

function seedUsersIfEmpty() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  if (count > 0) return;
  const insUser = db.prepare(`INSERT INTO users
    (uid,email,displayName,photoURL,role,phone,pin,passwordHash,storeLocation,isActive,createdAt,lastLoginAt)
    VALUES (@uid,@email,@displayName,NULL,@role,@phone,@pin,@passwordHash,@storeLocation,1,@createdAt,NULL)`);
  const insert = db.transaction(() => {
    DEMO_STAFF.forEach((s) => {
      insUser.run({
        uid: s.uid,
        email: s.email,
        displayName: s.displayName,
        role: s.role,
        phone: s.phone,
        pin: s.pin,
        passwordHash: bcrypt.hashSync(s.password, 10),
        storeLocation: s.storeLocation,
        createdAt: new Date().toISOString(),
      });
    });
  });
  insert();
  console.log(`Seeded ${DEMO_STAFF.length} demo staff accounts (PINs: 1234 admin / 2222 manager / 1111 cashier / 3333 clerk).`);
}
seedUsersIfEmpty();

// ===========================================================================
// FULL-DATABASE READ / REPLACE (keeps compatibility with the frontend's
// whole-state sync model in App.tsx)
// ===========================================================================
export function getFullDatabase() {
  const products = (db.prepare('SELECT * FROM products').all() as any[]).map(rowToProduct);
  const categories = (db.prepare('SELECT name FROM categories').all() as any[]).map((r) => r.name);
  const suppliers = (db.prepare('SELECT * FROM suppliers').all() as any[]).map(rowToSupplier);
  const priorityLabels = (db.prepare('SELECT * FROM priority_labels').all() as any[]).map(rowToPriorityLabel);
  const customers = (db.prepare('SELECT * FROM customers').all() as any[]).map(rowToCustomer);
  const followUps = (db.prepare('SELECT * FROM follow_ups').all() as any[]).map(rowToFollowUp);
  const shoppingList = (db.prepare('SELECT * FROM shopping_list').all() as any[]).map(rowToShoppingItem);
  const shoppingHistory = (db.prepare('SELECT * FROM shopping_history').all() as any[]).map(rowToShoppingHistory);
  const sales = (db.prepare('SELECT * FROM sales ORDER BY createdAt DESC').all() as any[]).map(rowToSale);
  const purchases = (db.prepare('SELECT * FROM purchases ORDER BY createdAt DESC').all() as any[]).map(rowToPurchase);
  const stockMovements = (db.prepare('SELECT * FROM stock_movements ORDER BY createdAt DESC').all() as any[]).map(rowToStockMovement);
  const settingsRow = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const settings = rowToSettings(settingsRow) || INITIAL_SETTINGS;

  return {
    products, categories, suppliers, priorityLabels, customers, followUps,
    shoppingList, shoppingHistory, sales, purchases, stockMovements, settings,
    lastUpdated: new Date().toISOString(),
  };
}

/** Wipes and rewrites every table from a full AppDatabase payload (whole-state sync). */
export const replaceFullDatabase = db.transaction((incoming: any) => {
  db.prepare('DELETE FROM products').run();
  db.prepare('DELETE FROM categories').run();
  db.prepare('DELETE FROM suppliers').run();
  db.prepare('DELETE FROM priority_labels').run();
  db.prepare('DELETE FROM customers').run();
  db.prepare('DELETE FROM follow_ups').run();
  db.prepare('DELETE FROM shopping_list').run();
  db.prepare('DELETE FROM shopping_history').run();
  db.prepare('DELETE FROM sales').run();
  db.prepare('DELETE FROM purchases').run();
  db.prepare('DELETE FROM stock_movements').run();

  const insCat = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
  (incoming.categories || []).forEach((c: string) => insCat.run(c));

  const insProd = db.prepare(`INSERT INTO products
    (id,sku,name,category,unit,buyingPrice,sellingPrice,openingStock,currentStock,minStockLevel,reorderLevel,supplierId,supplierName,status,dateAdded,notes)
    VALUES (@id,@sku,@name,@category,@unit,@buyingPrice,@sellingPrice,@openingStock,@currentStock,@minStockLevel,@reorderLevel,@supplierId,@supplierName,@status,@dateAdded,@notes)`);
  (incoming.products || []).forEach((p: any) => insProd.run({ minStockLevel: null, reorderLevel: null, supplierId: null, supplierName: null, status: null, notes: null, ...p }));

  const insSup = db.prepare(`INSERT INTO suppliers (id,name,contactPerson,phone,email,location,productsSupplied,paymentTerms,notes,dateAdded)
    VALUES (@id,@name,@contactPerson,@phone,@email,@location,@productsSupplied,@paymentTerms,@notes,@dateAdded)`);
  (incoming.suppliers || []).forEach((s: any) =>
    insSup.run({ contactPerson: null, email: null, paymentTerms: null, notes: null, dateAdded: null, ...s, productsSupplied: j(s.productsSupplied || []) })
  );

  const insLabel = db.prepare(`INSERT INTO priority_labels (id,name,color,description,level,isActive,isDefault)
    VALUES (@id,@name,@color,@description,@level,@isActive,@isDefault)`);
  (incoming.priorityLabels || []).forEach((l: any) =>
    insLabel.run({ description: null, level: null, ...l, isActive: bool(l.isActive), isDefault: bool(l.isDefault) })
  );

  const insCust = db.prepare(`INSERT INTO customers
    (id,name,phone,email,location,customerType,businessName,status,customerStatus,preferredContactMethod,dateAdded,dateFirstContacted,lastContactDate,nextFollowUpDate,productInterests,notesHistory,notes,timeline,totalPurchases,totalSpent,totalProfitGenerated)
    VALUES (@id,@name,@phone,@email,@location,@customerType,@businessName,@status,@customerStatus,@preferredContactMethod,@dateAdded,@dateFirstContacted,@lastContactDate,@nextFollowUpDate,@productInterests,@notesHistory,@notes,@timeline,@totalPurchases,@totalSpent,@totalProfitGenerated)`);
  (incoming.customers || []).forEach((c: any) =>
    insCust.run({
      email: null, businessName: null, status: null, customerStatus: null, preferredContactMethod: null,
      dateAdded: null, dateFirstContacted: null, nextFollowUpDate: null,
      totalPurchases: 0, totalSpent: 0, totalProfitGenerated: 0,
      ...c,
      productInterests: j(c.productInterests || c.productsInterestedIn || []),
      notesHistory: j(c.notesHistory || []),
      notes: typeof c.notes === 'string' ? c.notes : j(c.notes || []),
      timeline: j(c.timeline || []),
    })
  );

  const insFu = db.prepare(`INSERT INTO follow_ups
    (id,customerId,customerName,customerPhone,date,time,type,followUpType,productOrService,reasonForFollowUp,notes,outcome,completionNotes,nextFollowUpDate,nextFollowUpTime,status,addToGoogleCalendar,googleCalendarEventId,googleCalendarSyncStatus,googleCalendarReminderMinutes,reminderTiming,completedAt,createdAt)
    VALUES (@id,@customerId,@customerName,@customerPhone,@date,@time,@type,@followUpType,@productOrService,@reasonForFollowUp,@notes,@outcome,@completionNotes,@nextFollowUpDate,@nextFollowUpTime,@status,@addToGoogleCalendar,@googleCalendarEventId,@googleCalendarSyncStatus,@googleCalendarReminderMinutes,@reminderTiming,@completedAt,@createdAt)`);
  (incoming.followUps || []).forEach((f: any) =>
    insFu.run({
      customerId: null, time: null, type: null, followUpType: null, notes: null, outcome: null,
      completionNotes: null, nextFollowUpDate: null, nextFollowUpTime: null,
      googleCalendarEventId: null, googleCalendarSyncStatus: null, googleCalendarReminderMinutes: null,
      reminderTiming: null, completedAt: null, createdAt: null,
      ...f,
      addToGoogleCalendar: bool(f.addToGoogleCalendar),
    })
  );

  const insShop = db.prepare(`INSERT INTO shopping_list
    (id,productId,productName,sku,category,unit,quantityRequired,quantityPurchased,estimatedUnitPrice,estimatedBuyingPrice,estimatedTotalCost,supplierId,supplierName,priorityLabelId,priorityLabelName,priorityColor,purchaseStatus,targetDate,targetPurchaseDate,dateAdded,notes)
    VALUES (@id,@productId,@productName,@sku,@category,@unit,@quantityRequired,@quantityPurchased,@estimatedUnitPrice,@estimatedBuyingPrice,@estimatedTotalCost,@supplierId,@supplierName,@priorityLabelId,@priorityLabelName,@priorityColor,@purchaseStatus,@targetDate,@targetPurchaseDate,@dateAdded,@notes)`);
  (incoming.shoppingList || []).forEach((s: any) =>
    insShop.run({
      productId: null, sku: null, category: null, unit: null, estimatedUnitPrice: null, estimatedBuyingPrice: null,
      supplierId: null, supplierName: null, priorityColor: null, targetDate: null,
      targetPurchaseDate: null, dateAdded: null, notes: null, quantityPurchased: 0,
      ...s,
    })
  );

  const insShist = db.prepare(`INSERT INTO shopping_history
    (id,shoppingListItemId,productName,sku,supplierId,supplierName,datePurchased,date,itemsCount,totalQuantity,quantityPurchased,estimatedUnitPrice,actualUnitPrice,estimatedTotalCost,estimatedCost,actualTotalCost,actualCost,savingsAchieved,savings,items,purchaseRecordId,notes)
    VALUES (@id,@shoppingListItemId,@productName,@sku,@supplierId,@supplierName,@datePurchased,@date,@itemsCount,@totalQuantity,@quantityPurchased,@estimatedUnitPrice,@actualUnitPrice,@estimatedTotalCost,@estimatedCost,@actualTotalCost,@actualCost,@savingsAchieved,@savings,@items,@purchaseRecordId,@notes)`);
  (incoming.shoppingHistory || []).forEach((s: any) =>
    insShist.run({
      shoppingListItemId: null, productName: null, sku: null, supplierId: null,
      datePurchased: null, date: null, itemsCount: null, totalQuantity: null,
      quantityPurchased: null, estimatedUnitPrice: null, actualUnitPrice: null,
      estimatedTotalCost: null, estimatedCost: null, actualTotalCost: null, actualCost: null,
      savingsAchieved: null, savings: null, purchaseRecordId: null, notes: null,
      ...s,
      items: j(s.items),
    })
  );

  const insSale = db.prepare(`INSERT INTO sales
    (id,receiptNumber,invoiceNumber,productId,productName,sku,category,quantity,sellingPrice,totalSale,unitBuyingPrice,cogs,grossProfit,profitMargin,customerId,customerName,customerPhone,items,totalAmount,totalCost,paymentMethod,date,reference,notes,createdAt)
    VALUES (@id,@receiptNumber,@invoiceNumber,@productId,@productName,@sku,@category,@quantity,@sellingPrice,@totalSale,@unitBuyingPrice,@cogs,@grossProfit,@profitMargin,@customerId,@customerName,@customerPhone,@items,@totalAmount,@totalCost,@paymentMethod,@date,@reference,@notes,@createdAt)`);
  (incoming.sales || []).forEach((s: any) =>
    insSale.run({
      receiptNumber: null, invoiceNumber: null, productId: null, productName: null, sku: null,
      category: null, quantity: null, sellingPrice: null, totalSale: null, unitBuyingPrice: null,
      cogs: null, profitMargin: null, customerId: null, customerName: null, customerPhone: null,
      totalAmount: null, totalCost: null, reference: null, notes: null, createdAt: null,
      ...s,
      items: j(s.items),
    })
  );

  const insPurch = db.prepare(`INSERT INTO purchases
    (id,productId,productName,sku,supplierId,supplierName,quantity,unitCost,buyingPrice,totalCost,date,invoiceNumber,referenceNumber,paymentStatus,notes,shoppingListItemId,createdAt)
    VALUES (@id,@productId,@productName,@sku,@supplierId,@supplierName,@quantity,@unitCost,@buyingPrice,@totalCost,@date,@invoiceNumber,@referenceNumber,@paymentStatus,@notes,@shoppingListItemId,@createdAt)`);
  (incoming.purchases || []).forEach((p: any) =>
    insPurch.run({
      sku: null, supplierId: null, supplierName: null, unitCost: null, buyingPrice: null,
      invoiceNumber: null, referenceNumber: null, paymentStatus: null, notes: null,
      shoppingListItemId: null, createdAt: null,
      ...p,
    })
  );

  const insMov = db.prepare(`INSERT INTO stock_movements
    (id,date,productId,productName,sku,quantity,movementType,unitCost,referenceNumber,supplierOrCustomerName,notes,createdAt)
    VALUES (@id,@date,@productId,@productName,@sku,@quantity,@movementType,@unitCost,@referenceNumber,@supplierOrCustomerName,@notes,@createdAt)`);
  (incoming.stockMovements || []).forEach((m: any) =>
    insMov.run({ supplierOrCustomerName: null, notes: null, createdAt: null, ...m })
  );

  if (incoming.settings) {
    const s = incoming.settings;
    db.prepare(`INSERT INTO settings
      (id,businessName,ownerName,phone,email,location,currency,lowStockThresholdDefault,receiptFooter,autoAddLowStockToShoppingList,defaultPriorityLabelId,googleCalendarConnected,googleAccountEmail,googleClientId)
      VALUES (1,@businessName,@ownerName,@phone,@email,@location,@currency,@lowStockThresholdDefault,@receiptFooter,@autoAddLowStockToShoppingList,@defaultPriorityLabelId,@googleCalendarConnected,@googleAccountEmail,@googleClientId)
      ON CONFLICT(id) DO UPDATE SET
        businessName=excluded.businessName, ownerName=excluded.ownerName, phone=excluded.phone,
        email=excluded.email, location=excluded.location, currency=excluded.currency,
        lowStockThresholdDefault=excluded.lowStockThresholdDefault, receiptFooter=excluded.receiptFooter,
        autoAddLowStockToShoppingList=excluded.autoAddLowStockToShoppingList,
        defaultPriorityLabelId=excluded.defaultPriorityLabelId,
        googleCalendarConnected=excluded.googleCalendarConnected,
        googleAccountEmail=excluded.googleAccountEmail, googleClientId=excluded.googleClientId`
    ).run({
      email: null, lowStockThresholdDefault: null, receiptFooter: null, defaultPriorityLabelId: null,
      googleAccountEmail: null, googleClientId: null,
      ...s,
      autoAddLowStockToShoppingList: bool(s.autoAddLowStockToShoppingList),
      googleCalendarConnected: bool(s.googleCalendarConnected),
    });
  }
});

export function resetToDemoData() {
  db.prepare('DELETE FROM products').run();
  seedIfEmpty();
  return getFullDatabase();
}

export {
  j, parseJ, bool, asBool,
  rowToProduct, rowToSupplier, rowToPriorityLabel, rowToCustomer, rowToFollowUp,
  rowToShoppingItem, rowToShoppingHistory, rowToSale, rowToPurchase, rowToStockMovement, rowToSettings,
};
