import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  db,
  getFullDatabase,
  replaceFullDatabase,
  resetToDemoData,
  j,
  rowToProduct,
  rowToSale,
  rowToPurchase,
  rowToShoppingItem,
  rowToCustomer,
  rowToFollowUp,
  rowToSupplier,
  rowToSettings,
} from './server/db.js';
import { AuthService, AuthError, requireAuth, requirePermission, AuthedRequest } from './server/auth.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

function statusOf(product: any) {
  const stock = Number(product.currentStock || 0);
  const threshold = Number(product.minStockLevel || product.reorderLevel || 5);
  return stock === 0 ? 'out-of-stock' : stock <= threshold ? 'low-stock' : 'in-stock';
}

// =========================================================================
// AUTH ENDPOINTS
// =========================================================================
app.post('/api/auth/login-pin', (req, res) => {
  try {
    const { pin } = req.body;
    const result = AuthService.loginWithPin(pin);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(err instanceof AuthError ? err.status : 401).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login-email', (req, res) => {
  try {
    const { email, password } = req.body;
    const result = AuthService.loginWithEmail(email, password);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(err instanceof AuthError ? err.status : 401).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, displayName, role, phone, pin, storeLocation } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ success: false, error: 'Email, password and display name are required.' });
    }
    const result = AuthService.registerStaff({
      email, password, displayName, role: role || 'cashier', phone, pin, storeLocation,
    });
    res.status(201).json({ success: true, ...result });
  } catch (err: any) {
    res.status(err instanceof AuthError ? err.status : 400).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
  const user = AuthService.getUserByUid(req.authUser!.uid);
  if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
  res.json({ success: true, user });
});

app.get('/api/auth/staff', requireAuth, requirePermission('canEditSettings'), (_req, res) => {
  res.json({ success: true, data: AuthService.listStaff() });
});

app.delete('/api/auth/staff/:uid', requireAuth, requirePermission('canEditSettings'), (req, res) => {
  AuthService.deactivateStaff(req.params.uid);
  res.json({ success: true, message: 'Staff account deactivated.' });
});

app.get('/api/auth/session-logs', requireAuth, (_req, res) => {
  res.json({ success: true, data: AuthService.getSessionLogs() });
});

app.delete('/api/auth/session-logs', requireAuth, requirePermission('canEditSettings'), (_req, res) => {
  AuthService.clearSessionLogs();
  res.json({ success: true });
});

// =========================================================================
// HEALTH & FULL-DATABASE SYNC
// =========================================================================
app.get('/api/health', (_req, res) => {
  const database = getFullDatabase();
  res.json({
    status: 'ok',
    connected: true,
    serverTime: new Date().toISOString(),
    lastUpdated: database.lastUpdated,
    metrics: {
      productsCount: database.products.length,
      salesCount: database.sales.length,
      purchasesCount: database.purchases.length,
      customersCount: database.customers.length,
      followUpsCount: database.followUps.length,
      shoppingListCount: database.shoppingList.length,
    },
  });
});

app.get('/api/database', requireAuth, (_req, res) => {
  res.json({ success: true, data: getFullDatabase() });
});

app.post('/api/database', requireAuth, (req, res) => {
  const incoming = req.body;
  if (!incoming || !Array.isArray(incoming.products)) {
    return res.status(400).json({ success: false, error: 'Invalid database payload structure' });
  }
  replaceFullDatabase(incoming);
  res.json({ success: true, message: 'Database saved successfully', lastUpdated: new Date().toISOString() });
});

// =========================================================================
// PRODUCTS
// =========================================================================
app.get('/api/products', requireAuth, (_req, res) => {
  res.json({ success: true, data: (db.prepare('SELECT * FROM products').all() as any[]).map(rowToProduct) });
});

app.post('/api/products', requireAuth, requirePermission('canAddProduct'), (req, res) => {
  const id = req.body.id || `prod-${Date.now()}`;
  const product = {
    minStockLevel: null, reorderLevel: null, supplierId: null, supplierName: null, status: null, notes: null,
    ...req.body,
    id,
    dateAdded: req.body.dateAdded || new Date().toISOString().split('T')[0],
  };
  db.prepare(`INSERT INTO products (id,sku,name,category,unit,buyingPrice,sellingPrice,openingStock,currentStock,minStockLevel,reorderLevel,supplierId,supplierName,status,dateAdded,notes)
    VALUES (@id,@sku,@name,@category,@unit,@buyingPrice,@sellingPrice,@openingStock,@currentStock,@minStockLevel,@reorderLevel,@supplierId,@supplierName,@status,@dateAdded,@notes)`).run(product);
  res.status(201).json({ success: true, data: rowToProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id)) });
});

app.put('/api/products/:id', requireAuth, requirePermission('canEditProduct'), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Product not found' });
  const merged = { ...existing, ...req.body, id };
  db.prepare(`UPDATE products SET sku=@sku,name=@name,category=@category,unit=@unit,buyingPrice=@buyingPrice,sellingPrice=@sellingPrice,
    openingStock=@openingStock,currentStock=@currentStock,minStockLevel=@minStockLevel,reorderLevel=@reorderLevel,
    supplierId=@supplierId,supplierName=@supplierName,status=@status,dateAdded=@dateAdded,notes=@notes WHERE id=@id`).run(merged);
  res.json({ success: true, data: rowToProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id)) });
});

app.delete('/api/products/:id', requireAuth, requirePermission('canDeleteProduct'), (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  db.prepare('DELETE FROM shopping_list WHERE productId = ?').run(id);
  res.json({ success: true, message: 'Product deleted' });
});

app.patch('/api/products/:id/stock', requireAuth, requirePermission('canEditProduct'), (req, res) => {
  const { id } = req.params;
  const { newStock, reason } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
  const stockNum = Math.max(0, Number(newStock));
  const status = statusOf({ ...product, currentStock: stockNum });
  db.prepare('UPDATE products SET currentStock = ?, status = ? WHERE id = ?').run(stockNum, status, id);

  db.prepare(`INSERT INTO stock_movements (id,date,productId,productName,sku,quantity,movementType,unitCost,referenceNumber,supplierOrCustomerName,notes,createdAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    `sm-${Date.now()}`, new Date().toISOString().split('T')[0], product.id, product.name, product.sku,
    stockNum, 'ADJUSTMENT', product.buyingPrice, `ADJ-${Date.now().toString().slice(-4)}`, null,
    reason || 'Manual stock adjustment', new Date().toISOString()
  );

  res.json({ success: true, data: rowToProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id)) });
});

// =========================================================================
// SALES
// =========================================================================
app.get('/api/sales', requireAuth, (_req, res) => {
  res.json({ success: true, data: (db.prepare('SELECT * FROM sales ORDER BY createdAt DESC').all() as any[]).map(rowToSale) });
});

app.post('/api/sales', requireAuth, requirePermission('canProcessSales'), (req, res) => {
  const id = req.body.id || `sale-${Date.now()}`;
  const sale = {
    receiptNumber: null, invoiceNumber: null, productId: null, productName: null, sku: null,
    category: null, quantity: null, sellingPrice: null, totalSale: null, unitBuyingPrice: null,
    cogs: null, profitMargin: null, customerId: null, customerName: null, customerPhone: null,
    totalAmount: null, totalCost: null, reference: null, notes: null,
    ...req.body,
    id,
    createdAt: new Date().toISOString(),
  };

  const applySaleTx = db.transaction(() => {
    // 1. Decrement stock
    const lines = Array.isArray(sale.items) && sale.items.length > 0
      ? sale.items
      : sale.productId && sale.quantity ? [{ productId: sale.productId, quantity: sale.quantity }] : [];
    lines.forEach((line: any) => {
      const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(line.productId) as any;
      if (!prod) return;
      const newStock = Math.max(0, Number(prod.currentStock) - Number(line.quantity));
      db.prepare('UPDATE products SET currentStock = ?, status = ? WHERE id = ?')
        .run(newStock, statusOf({ ...prod, currentStock: newStock }), prod.id);
    });

    // 2. Update customer stats + timeline
    if (sale.customerId) {
      const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(sale.customerId) as any;
      if (cust) {
        const totalAmount = sale.totalAmount || sale.totalSale || 0;
        const profit = sale.grossProfit || 0;
        let timeline: any[] = [];
        try { timeline = JSON.parse(cust.timeline) || []; } catch { timeline = []; }
        timeline = [
          {
            id: `time-${Date.now()}`, date: new Date().toISOString(), type: 'SALE',
            title: 'Purchased goods',
            description: `Receipt: ${sale.receiptNumber || sale.id} • Total: KES ${totalAmount}`,
          },
          ...timeline,
        ];
        db.prepare(`UPDATE customers SET totalPurchases = totalPurchases + 1, totalSpent = totalSpent + ?,
          totalProfitGenerated = totalProfitGenerated + ?, lastContactDate = ?, timeline = ? WHERE id = ?`)
          .run(totalAmount, profit, sale.date || new Date().toISOString().split('T')[0], j(timeline), sale.customerId);
      }
    }

    db.prepare(`INSERT INTO sales (id,receiptNumber,invoiceNumber,productId,productName,sku,category,quantity,sellingPrice,totalSale,unitBuyingPrice,cogs,grossProfit,profitMargin,customerId,customerName,customerPhone,items,totalAmount,totalCost,paymentMethod,date,reference,notes,createdAt)
      VALUES (@id,@receiptNumber,@invoiceNumber,@productId,@productName,@sku,@category,@quantity,@sellingPrice,@totalSale,@unitBuyingPrice,@cogs,@grossProfit,@profitMargin,@customerId,@customerName,@customerPhone,@items,@totalAmount,@totalCost,@paymentMethod,@date,@reference,@notes,@createdAt)`)
      .run({ ...sale, items: j(sale.items) });
  });
  applySaleTx();

  res.status(201).json({ success: true, data: rowToSale(db.prepare('SELECT * FROM sales WHERE id = ?').get(id)) });
});

// =========================================================================
// PURCHASES
// =========================================================================
app.get('/api/purchases', requireAuth, (_req, res) => {
  res.json({ success: true, data: (db.prepare('SELECT * FROM purchases ORDER BY createdAt DESC').all() as any[]).map(rowToPurchase) });
});

app.post('/api/purchases', requireAuth, requirePermission('canRecordPurchases'), (req, res) => {
  const id = req.body.id || `po-${Date.now()}`;
  const purchase = {
    sku: null, supplierId: null, supplierName: null, unitCost: null, buyingPrice: null,
    invoiceNumber: null, referenceNumber: null, paymentStatus: null, notes: null, shoppingListItemId: null,
    ...req.body,
    id,
    createdAt: new Date().toISOString(),
  };

  const tx = db.transaction(() => {
    const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(purchase.productId) as any;
    if (prod) {
      const newStock = Number(prod.currentStock) + Number(purchase.quantity);
      const unitCost = purchase.unitCost || purchase.buyingPrice || prod.buyingPrice;
      db.prepare('UPDATE products SET currentStock = ?, buyingPrice = ?, supplierId = ?, status = ? WHERE id = ?')
        .run(newStock, unitCost, purchase.supplierId || prod.supplierId, statusOf({ ...prod, currentStock: newStock }), prod.id);
    }
    db.prepare(`INSERT INTO purchases (id,productId,productName,sku,supplierId,supplierName,quantity,unitCost,buyingPrice,totalCost,date,invoiceNumber,referenceNumber,paymentStatus,notes,shoppingListItemId,createdAt)
      VALUES (@id,@productId,@productName,@sku,@supplierId,@supplierName,@quantity,@unitCost,@buyingPrice,@totalCost,@date,@invoiceNumber,@referenceNumber,@paymentStatus,@notes,@shoppingListItemId,@createdAt)`).run(purchase);
  });
  tx();

  res.status(201).json({ success: true, data: rowToPurchase(db.prepare('SELECT * FROM purchases WHERE id = ?').get(id)) });
});

// =========================================================================
// SHOPPING LIST
// =========================================================================
app.get('/api/shopping-list', requireAuth, (_req, res) => {
  res.json({ success: true, data: (db.prepare('SELECT * FROM shopping_list').all() as any[]).map(rowToShoppingItem) });
});

app.post('/api/shopping-list', requireAuth, (req, res) => {
  const id = req.body.id || `shop-${Date.now()}`;
  const item = {
    productId: null, sku: null, category: null, unit: null, estimatedUnitPrice: null, estimatedBuyingPrice: null,
    supplierId: null, supplierName: null, priorityColor: null, targetDate: null,
    targetPurchaseDate: null, dateAdded: null, notes: null,
    ...req.body,
    id,
    quantityPurchased: req.body.quantityPurchased || 0,
    purchaseStatus: req.body.purchaseStatus || 'pending',
  };
  db.prepare(`INSERT INTO shopping_list (id,productId,productName,sku,category,unit,quantityRequired,quantityPurchased,estimatedUnitPrice,estimatedBuyingPrice,estimatedTotalCost,supplierId,supplierName,priorityLabelId,priorityLabelName,priorityColor,purchaseStatus,targetDate,targetPurchaseDate,dateAdded,notes)
    VALUES (@id,@productId,@productName,@sku,@category,@unit,@quantityRequired,@quantityPurchased,@estimatedUnitPrice,@estimatedBuyingPrice,@estimatedTotalCost,@supplierId,@supplierName,@priorityLabelId,@priorityLabelName,@priorityColor,@purchaseStatus,@targetDate,@targetPurchaseDate,@dateAdded,@notes)`).run(item);
  res.status(201).json({ success: true, data: rowToShoppingItem(db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(id)) });
});

app.put('/api/shopping-list/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Shopping item not found' });
  const merged = { ...existing, ...req.body, id };
  db.prepare(`UPDATE shopping_list SET productId=@productId,productName=@productName,sku=@sku,category=@category,unit=@unit,
    quantityRequired=@quantityRequired,quantityPurchased=@quantityPurchased,estimatedUnitPrice=@estimatedUnitPrice,
    estimatedBuyingPrice=@estimatedBuyingPrice,estimatedTotalCost=@estimatedTotalCost,supplierId=@supplierId,supplierName=@supplierName,
    priorityLabelId=@priorityLabelId,priorityLabelName=@priorityLabelName,priorityColor=@priorityColor,purchaseStatus=@purchaseStatus,
    targetDate=@targetDate,targetPurchaseDate=@targetPurchaseDate,dateAdded=@dateAdded,notes=@notes WHERE id=@id`).run(merged);
  res.json({ success: true, data: rowToShoppingItem(db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(id)) });
});

app.delete('/api/shopping-list/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM shopping_list WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Item removed from shopping list' });
});

app.post('/api/shopping-list/confirm-purchase', requireAuth, requirePermission('canRecordPurchases'), (req, res) => {
  const { item, actualQuantity, actualPrice, supplierId, invoiceNumber, notes } = req.body;
  const todayStr = new Date().toISOString().split('T')[0];

  const result = db.transaction(() => {
    const sup = supplierId ? (db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId) as any) : null;

    const realPurchase = {
      id: `po-${Date.now()}`,
      productId: item.productId || `custom-${Date.now()}`,
      productName: item.productName,
      sku: item.sku || null,
      supplierId: supplierId || null,
      supplierName: sup?.name || item.supplierName || 'Wholesaler',
      quantity: actualQuantity,
      unitCost: actualPrice,
      buyingPrice: actualPrice,
      totalCost: actualQuantity * actualPrice,
      date: todayStr,
      invoiceNumber: invoiceNumber || `PO-${Date.now().toString().slice(-5)}`,
      referenceNumber: null,
      paymentStatus: 'paid',
      notes: notes || 'Restocked via Shopping List',
      shoppingListItemId: item.id,
      createdAt: new Date().toISOString(),
    };

    const estUnitPrice = item.estimatedUnitPrice || item.estimatedBuyingPrice || actualPrice;
    const estTotal = estUnitPrice * actualQuantity;
    const actTotal = actualQuantity * actualPrice;
    const savings = Math.max(0, estTotal - actTotal);

    const historyRecord = {
      id: `shist-${Date.now()}`, shoppingListItemId: item.id, productName: item.productName, sku: item.sku || null,
      supplierId: supplierId || null, supplierName: sup?.name || item.supplierName || 'Wholesaler',
      datePurchased: todayStr, date: todayStr, itemsCount: null, totalQuantity: null,
      quantityPurchased: actualQuantity, estimatedUnitPrice: estUnitPrice, actualUnitPrice: actualPrice,
      estimatedTotalCost: estTotal, estimatedCost: null, actualTotalCost: actTotal, actualCost: null,
      savingsAchieved: savings, savings: null, items: null, purchaseRecordId: realPurchase.id, notes: null,
    };

    const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId) as any;
    if (prod) {
      const newStock = Number(prod.currentStock) + Number(actualQuantity);
      db.prepare('UPDATE products SET currentStock = ?, buyingPrice = ?, supplierId = ?, status = ? WHERE id = ?')
        .run(newStock, actualPrice, supplierId || prod.supplierId, statusOf({ ...prod, currentStock: newStock }), prod.id);
    }

    const listItem = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(item.id) as any;
    if (listItem) {
      const totalBought = (listItem.quantityPurchased || 0) + actualQuantity;
      const isFullyDone = totalBought >= listItem.quantityRequired;
      db.prepare('UPDATE shopping_list SET quantityPurchased = ?, purchaseStatus = ? WHERE id = ?')
        .run(totalBought, isFullyDone ? 'purchased' : 'partial', item.id);
    }

    db.prepare(`INSERT INTO purchases (id,productId,productName,sku,supplierId,supplierName,quantity,unitCost,buyingPrice,totalCost,date,invoiceNumber,referenceNumber,paymentStatus,notes,shoppingListItemId,createdAt)
      VALUES (@id,@productId,@productName,@sku,@supplierId,@supplierName,@quantity,@unitCost,@buyingPrice,@totalCost,@date,@invoiceNumber,@referenceNumber,@paymentStatus,@notes,@shoppingListItemId,@createdAt)`).run(realPurchase);
    db.prepare(`INSERT INTO shopping_history (id,shoppingListItemId,productName,sku,supplierId,supplierName,datePurchased,date,itemsCount,totalQuantity,quantityPurchased,estimatedUnitPrice,actualUnitPrice,estimatedTotalCost,estimatedCost,actualTotalCost,actualCost,savingsAchieved,savings,items,purchaseRecordId,notes)
      VALUES (@id,@shoppingListItemId,@productName,@sku,@supplierId,@supplierName,@datePurchased,@date,@itemsCount,@totalQuantity,@quantityPurchased,@estimatedUnitPrice,@actualUnitPrice,@estimatedTotalCost,@estimatedCost,@actualTotalCost,@actualCost,@savingsAchieved,@savings,@items,@purchaseRecordId,@notes)`).run(historyRecord);

    return { realPurchase, historyRecord };
  })();

  res.json({
    success: true,
    purchase: rowToPurchase(db.prepare('SELECT * FROM purchases WHERE id = ?').get(result.realPurchase.id)),
    history: result.historyRecord,
    shoppingList: (db.prepare('SELECT * FROM shopping_list').all() as any[]).map(rowToShoppingItem),
  });
});

// =========================================================================
// CUSTOMERS
// =========================================================================
app.get('/api/customers', requireAuth, (_req, res) => {
  res.json({ success: true, data: (db.prepare('SELECT * FROM customers').all() as any[]).map(rowToCustomer) });
});

app.post('/api/customers', requireAuth, requirePermission('canManageCustomers'), (req, res) => {
  const id = req.body.id || `cust-${Date.now()}`;
  const customer = {
    email: null, businessName: null, status: null, customerStatus: null, preferredContactMethod: null,
    dateFirstContacted: null, nextFollowUpDate: null,
    ...req.body,
    id,
    totalPurchases: 0, totalSpent: 0, totalProfitGenerated: 0,
    dateAdded: new Date().toISOString().split('T')[0],
  };
  db.prepare(`INSERT INTO customers (id,name,phone,email,location,customerType,businessName,status,customerStatus,preferredContactMethod,dateAdded,dateFirstContacted,lastContactDate,nextFollowUpDate,productInterests,notesHistory,notes,timeline,totalPurchases,totalSpent,totalProfitGenerated)
    VALUES (@id,@name,@phone,@email,@location,@customerType,@businessName,@status,@customerStatus,@preferredContactMethod,@dateAdded,@dateFirstContacted,@lastContactDate,@nextFollowUpDate,@productInterests,@notesHistory,@notes,@timeline,@totalPurchases,@totalSpent,@totalProfitGenerated)`)
    .run({
      ...customer,
      productInterests: j(customer.productInterests || []),
      notesHistory: j(customer.notesHistory || []),
      notes: typeof customer.notes === 'string' ? customer.notes : j(customer.notes || []),
      timeline: j(customer.timeline || []),
    });
  res.status(201).json({ success: true, data: rowToCustomer(db.prepare('SELECT * FROM customers WHERE id = ?').get(id)) });
});

app.put('/api/customers/:id', requireAuth, requirePermission('canManageCustomers'), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Customer not found' });
  const merged = { ...existing, ...req.body, id };
  db.prepare(`UPDATE customers SET name=@name,phone=@phone,email=@email,location=@location,customerType=@customerType,
    businessName=@businessName,status=@status,customerStatus=@customerStatus,preferredContactMethod=@preferredContactMethod,
    dateAdded=@dateAdded,dateFirstContacted=@dateFirstContacted,lastContactDate=@lastContactDate,nextFollowUpDate=@nextFollowUpDate,
    productInterests=@productInterests,notesHistory=@notesHistory,notes=@notes,timeline=@timeline,
    totalPurchases=@totalPurchases,totalSpent=@totalSpent,totalProfitGenerated=@totalProfitGenerated WHERE id=@id`)
    .run({
      ...merged,
      productInterests: j(req.body.productInterests || JSON.parse(existing.productInterests || '[]')),
      notesHistory: j(req.body.notesHistory || JSON.parse(existing.notesHistory || '[]')),
      notes: typeof req.body.notes === 'string' ? req.body.notes : (req.body.notes ? j(req.body.notes) : existing.notes),
      timeline: j(req.body.timeline || JSON.parse(existing.timeline || '[]')),
    });
  res.json({ success: true, data: rowToCustomer(db.prepare('SELECT * FROM customers WHERE id = ?').get(id)) });
});

app.delete('/api/customers/:id', requireAuth, requirePermission('canManageCustomers'), (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Customer deleted' });
});

// =========================================================================
// FOLLOW-UPS
// =========================================================================
app.get('/api/follow-ups', requireAuth, (_req, res) => {
  res.json({ success: true, data: (db.prepare('SELECT * FROM follow_ups').all() as any[]).map(rowToFollowUp) });
});

app.post('/api/follow-ups', requireAuth, (req, res) => {
  const id = req.body.id || `fu-${Date.now()}`;
  const followUp = {
    customerId: null, time: null, type: null, followUpType: null, notes: null, outcome: null,
    completionNotes: null, nextFollowUpDate: null, nextFollowUpTime: null,
    googleCalendarEventId: null, googleCalendarSyncStatus: null, googleCalendarReminderMinutes: null,
    reminderTiming: null, completedAt: null,
    ...req.body,
    id,
    status: req.body.status || 'pending',
    createdAt: new Date().toISOString(),
  };

  const tx = db.transaction(() => {
    if (followUp.customerId) {
      const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(followUp.customerId) as any;
      if (cust) {
        let timeline: any[] = [];
        try { timeline = JSON.parse(cust.timeline) || []; } catch { timeline = []; }
        timeline = [
          {
            id: `time-${Date.now()}`, date: new Date().toISOString(), type: 'FOLLOW_UP',
            title: `Scheduled Follow-up: ${followUp.reasonForFollowUp || followUp.productOrService}`,
            description: `${followUp.type || 'Phone Call'} on ${followUp.date}`,
          },
          ...timeline,
        ];
        db.prepare('UPDATE customers SET lastContactDate = ?, timeline = ? WHERE id = ?')
          .run(followUp.date, j(timeline), followUp.customerId);
      }
    }
    db.prepare(`INSERT INTO follow_ups (id,customerId,customerName,customerPhone,date,time,type,followUpType,productOrService,reasonForFollowUp,notes,outcome,completionNotes,nextFollowUpDate,nextFollowUpTime,status,addToGoogleCalendar,googleCalendarEventId,googleCalendarSyncStatus,googleCalendarReminderMinutes,reminderTiming,completedAt,createdAt)
      VALUES (@id,@customerId,@customerName,@customerPhone,@date,@time,@type,@followUpType,@productOrService,@reasonForFollowUp,@notes,@outcome,@completionNotes,@nextFollowUpDate,@nextFollowUpTime,@status,@addToGoogleCalendar,@googleCalendarEventId,@googleCalendarSyncStatus,@googleCalendarReminderMinutes,@reminderTiming,@completedAt,@createdAt)`)
      .run({ ...followUp, addToGoogleCalendar: followUp.addToGoogleCalendar ? 1 : 0 });
  });
  tx();

  res.status(201).json({ success: true, data: rowToFollowUp(db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(id)) });
});

app.put('/api/follow-ups/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Follow-up not found' });
  const merged = { ...existing, ...req.body, id };
  db.prepare(`UPDATE follow_ups SET customerId=@customerId,customerName=@customerName,customerPhone=@customerPhone,date=@date,time=@time,
    type=@type,followUpType=@followUpType,productOrService=@productOrService,reasonForFollowUp=@reasonForFollowUp,notes=@notes,
    outcome=@outcome,completionNotes=@completionNotes,nextFollowUpDate=@nextFollowUpDate,nextFollowUpTime=@nextFollowUpTime,status=@status,
    addToGoogleCalendar=@addToGoogleCalendar,googleCalendarEventId=@googleCalendarEventId,googleCalendarSyncStatus=@googleCalendarSyncStatus,
    googleCalendarReminderMinutes=@googleCalendarReminderMinutes,reminderTiming=@reminderTiming,completedAt=@completedAt WHERE id=@id`)
    .run({ ...merged, addToGoogleCalendar: merged.addToGoogleCalendar ? 1 : 0 });
  res.json({ success: true, data: rowToFollowUp(db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(id)) });
});

app.delete('/api/follow-ups/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM follow_ups WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Follow-up removed' });
});

app.post('/api/follow-ups/:id/complete', requireAuth, (req, res) => {
  const { id } = req.params;
  const { outcome, completionNotes } = req.body;
  const fu = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(id);
  if (!fu) return res.status(404).json({ success: false, error: 'Follow-up not found' });
  db.prepare('UPDATE follow_ups SET status = ?, outcome = ?, completionNotes = ?, completedAt = ? WHERE id = ?')
    .run('completed', outcome, completionNotes, new Date().toISOString(), id);
  res.json({ success: true, data: rowToFollowUp(db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(id)) });
});

// =========================================================================
// SUPPLIERS
// =========================================================================
app.get('/api/suppliers', requireAuth, (_req, res) => {
  res.json({ success: true, data: (db.prepare('SELECT * FROM suppliers').all() as any[]).map(rowToSupplier) });
});

app.post('/api/suppliers', requireAuth, requirePermission('canManageSuppliers'), (req, res) => {
  const id = req.body.id || `sup-${Date.now()}`;
  const supplier = {
    contactPerson: null, email: null, paymentTerms: null, notes: null,
    ...req.body,
    id,
    dateAdded: new Date().toISOString().split('T')[0],
  };
  db.prepare(`INSERT INTO suppliers (id,name,contactPerson,phone,email,location,productsSupplied,paymentTerms,notes,dateAdded)
    VALUES (@id,@name,@contactPerson,@phone,@email,@location,@productsSupplied,@paymentTerms,@notes,@dateAdded)`)
    .run({ ...supplier, productsSupplied: j(supplier.productsSupplied || []) });
  res.status(201).json({ success: true, data: rowToSupplier(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id)) });
});

app.put('/api/suppliers/:id', requireAuth, requirePermission('canManageSuppliers'), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Supplier not found' });
  const merged = { ...existing, ...req.body, id };
  db.prepare(`UPDATE suppliers SET name=@name,contactPerson=@contactPerson,phone=@phone,email=@email,location=@location,
    productsSupplied=@productsSupplied,paymentTerms=@paymentTerms,notes=@notes,dateAdded=@dateAdded WHERE id=@id`)
    .run({ ...merged, productsSupplied: j(req.body.productsSupplied || JSON.parse(existing.productsSupplied || '[]')) });
  res.json({ success: true, data: rowToSupplier(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id)) });
});

app.delete('/api/suppliers/:id', requireAuth, requirePermission('canManageSuppliers'), (req, res) => {
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Supplier deleted' });
});

// =========================================================================
// SETTINGS & DEMO RESET
// =========================================================================
app.get('/api/settings', requireAuth, (_req, res) => {
  res.json({ success: true, data: rowToSettings(db.prepare('SELECT * FROM settings WHERE id = 1').get()) });
});

app.post('/api/settings', requireAuth, requirePermission('canEditSettings'), (req, res) => {
  const existing = rowToSettings(db.prepare('SELECT * FROM settings WHERE id = 1').get()) as any;
  const merged = { ...existing, ...req.body };
  db.prepare(`INSERT INTO settings (id,businessName,ownerName,phone,email,location,currency,lowStockThresholdDefault,receiptFooter,autoAddLowStockToShoppingList,defaultPriorityLabelId,googleCalendarConnected,googleAccountEmail,googleClientId)
    VALUES (1,@businessName,@ownerName,@phone,@email,@location,@currency,@lowStockThresholdDefault,@receiptFooter,@autoAddLowStockToShoppingList,@defaultPriorityLabelId,@googleCalendarConnected,@googleAccountEmail,@googleClientId)
    ON CONFLICT(id) DO UPDATE SET businessName=excluded.businessName,ownerName=excluded.ownerName,phone=excluded.phone,email=excluded.email,
      location=excluded.location,currency=excluded.currency,lowStockThresholdDefault=excluded.lowStockThresholdDefault,
      receiptFooter=excluded.receiptFooter,autoAddLowStockToShoppingList=excluded.autoAddLowStockToShoppingList,
      defaultPriorityLabelId=excluded.defaultPriorityLabelId,googleCalendarConnected=excluded.googleCalendarConnected,
      googleAccountEmail=excluded.googleAccountEmail,googleClientId=excluded.googleClientId`)
    .run({
      ...merged,
      autoAddLowStockToShoppingList: merged.autoAddLowStockToShoppingList ? 1 : 0,
      googleCalendarConnected: merged.googleCalendarConnected ? 1 : 0,
    });
  res.json({ success: true, data: rowToSettings(db.prepare('SELECT * FROM settings WHERE id = 1').get()) });
});

app.post('/api/reset-demo', requireAuth, requirePermission('canResetDatabase'), (_req, res) => {
  const freshDb = resetToDemoData();
  res.json({ success: true, message: 'Database reset to default demo dataset', data: freshDb });
});

// =========================================================================
// VITE MIDDLEWARE & STATIC ASSETS
// =========================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KANGI Stock Manager backend server (SQLite) running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
