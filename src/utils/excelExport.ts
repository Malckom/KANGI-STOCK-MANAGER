import * as XLSX from 'xlsx';
import {
  AppDatabase,
  Product,
  Sale,
  Purchase,
  Customer,
  Supplier,
  FollowUp,
  ShoppingListItem,
  AppSettings,
} from '../types';
import { formatDate, formatDateTime } from './formatters';

/**
 * Helper to auto-calculate column widths based on content length
 */
function calculateColumnWidths(data: any[]): { wch: number }[] {
  if (!data || data.length === 0) return [{ wch: 15 }];
  const keys = Object.keys(data[0]);
  return keys.map((key) => {
    let maxLen = key.toString().length;
    for (const row of data) {
      const val = row[key];
      if (val !== undefined && val !== null) {
        const strLen = val.toString().length;
        if (strLen > maxLen) {
          maxLen = strLen;
        }
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
  });
}

/**
 * 1. Export Master Multi-Sheet Workbook with all store operational records
 */
export function exportMasterExcelWorkbook(db: AppDatabase, filename?: string): boolean {
  try {
    const wb = XLSX.utils.book_new();
    const storeName = db.settings?.businessName || 'KANGI Stock Manager';
    const currency = db.settings?.currency || 'KES';
    const timestamp = new Date().toISOString().split('T')[0];

    // --- SHEET 1: Executive Summary ---
    const totalInventoryValue = db.products.reduce(
      (sum, p) => sum + (p.currentStock || 0) * (p.buyingPrice || 0),
      0
    );
    const totalSalesRevenue = db.sales.reduce((sum, s) => sum + (s.totalSale || s.totalAmount || 0), 0);
    const totalProfit = db.sales.reduce((sum, s) => sum + (s.grossProfit || 0), 0);
    const totalPurchasesCost = db.purchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const lowStockCount = db.products.filter(
      (p) => p.currentStock > 0 && p.currentStock <= (p.minStockLevel || 5)
    ).length;
    const outOfStockCount = db.products.filter((p) => (p.currentStock || 0) === 0).length;
    const activeShoppingItems = db.shoppingList.filter((i) => i.purchaseStatus !== 'purchased');
    const estimatedShoppingCost = activeShoppingItems.reduce(
      (sum, i) => sum + (i.estimatedTotalCost || 0),
      0
    );
    const pendingFollowUps = db.followUps.filter((f) => f.status === 'pending').length;

    const summaryRows = [
      { Metric: 'Store Business Name', Value: storeName },
      { Metric: 'Owner / Manager', Value: db.settings?.ownerName || '—' },
      { Metric: 'Phone / M-Pesa', Value: db.settings?.phone || '—' },
      { Metric: 'Location', Value: db.settings?.location || '—' },
      { Metric: 'Report Generation Date', Value: new Date().toLocaleString() },
      { Metric: 'Currency', Value: currency },
      { Metric: '---', Value: '---' },
      { Metric: `Total Inventory Value (${currency} at Cost)`, Value: Math.round(totalInventoryValue) },
      { Metric: 'Total Catalogued Products', Value: db.products.length },
      { Metric: 'Out of Stock Products', Value: outOfStockCount },
      { Metric: 'Low Stock Products (<= Reorder Level)', Value: lowStockCount },
      { Metric: '---', Value: '---' },
      { Metric: `Total Historical Sales Revenue (${currency})`, Value: Math.round(totalSalesRevenue) },
      { Metric: `Total Gross Profit Realized (${currency})`, Value: Math.round(totalProfit) },
      { Metric: 'Total Sales Transactions Count', Value: db.sales.length },
      { Metric: `Total Stock Purchases Cost (${currency})`, Value: Math.round(totalPurchasesCost) },
      { Metric: 'Total Purchases / Stock In Count', Value: db.purchases.length },
      { Metric: '---', Value: '---' },
      { Metric: 'Total Registered Customers', Value: db.customers.length },
      { Metric: 'Pending Customer Follow-ups', Value: pendingFollowUps },
      { Metric: 'Active Items in Shopping Cart', Value: activeShoppingItems.length },
      { Metric: `Estimated Restock Shopping Cost (${currency})`, Value: Math.round(estimatedShoppingCost) },
    ];

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 38 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Overview Summary');

    // --- SHEET 2: Inventory & Stock Valuation ---
    const inventoryRows = db.products.map((p) => {
      const stock = p.currentStock || 0;
      const buyPrice = p.buyingPrice || 0;
      const sellPrice = p.sellingPrice || 0;
      const unitMargin = sellPrice - buyPrice;
      const marginPct = buyPrice > 0 ? ((unitMargin / buyPrice) * 100).toFixed(1) + '%' : '0%';
      const totalValuation = stock * buyPrice;

      let status = 'In Stock';
      if (stock === 0) status = 'OUT OF STOCK';
      else if (stock <= (p.minStockLevel || 5)) status = 'LOW STOCK ALERT';

      return {
        SKU: p.sku || '—',
        'Product Name': p.name,
        Category: p.category,
        'Current Stock': stock,
        Unit: p.unit || 'pcs',
        [`Buying Price (${currency})`]: buyPrice,
        [`Selling Price (${currency})`]: sellPrice,
        [`Unit Profit (${currency})`]: unitMargin,
        'Profit Margin %': marginPct,
        [`Total Valuation (${currency})`]: totalValuation,
        'Min Stock Level': p.minStockLevel || 5,
        'Reorder Point': p.reorderLevel || p.minStockLevel || 5,
        'Stock Status': status,
        'Supplier Name': p.supplierName || '—',
        'Date Added': p.dateAdded || '',
        Notes: p.notes || '',
      };
    });

    const wsInventory = XLSX.utils.json_to_sheet(inventoryRows);
    wsInventory['!cols'] = calculateColumnWidths(inventoryRows);
    XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventory Stock');

    // --- SHEET 3: Sales Ledger ---
    const salesRows = db.sales.map((s) => {
      let itemsSummary = s.productName || '';
      if (s.items && s.items.length > 0) {
        itemsSummary = s.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ');
      }

      return {
        'Receipt / Invoice No': s.receiptNumber || s.invoiceNumber || s.id,
        Date: s.date,
        'Items Description': itemsSummary,
        'Total Quantity': s.quantity || (s.items?.reduce((sum, i) => sum + i.quantity, 0)) || 1,
        [`Total Sale (${currency})`]: s.totalSale || s.totalAmount || 0,
        [`Gross Profit (${currency})`]: s.grossProfit || 0,
        'Payment Method': s.paymentMethod || 'Cash',
        'Reference / M-Pesa Code': s.reference || '',
        'Customer Name': s.customerName || 'Walk-in Customer',
        'Customer Phone': s.customerPhone || '',
        Notes: s.notes || '',
      };
    });

    const wsSales = XLSX.utils.json_to_sheet(salesRows);
    wsSales['!cols'] = calculateColumnWidths(salesRows);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Sales Ledger');

    // --- SHEET 4: Purchases & Stock In ---
    const purchasesRows = db.purchases.map((p) => ({
      'Invoice / Order No': p.invoiceNumber || p.referenceNumber || p.id,
      Date: p.date,
      'Product Name': p.productName,
      SKU: p.sku || '—',
      'Supplier Name': p.supplierName || 'Wholesale Supplier',
      'Quantity In': p.quantity,
      [`Unit Cost (${currency})`]: p.unitCost || p.buyingPrice || 0,
      [`Total Cost (${currency})`]: p.totalCost,
      'Payment Status': p.paymentStatus || 'Paid',
      Notes: p.notes || '',
    }));

    const wsPurchases = XLSX.utils.json_to_sheet(purchasesRows);
    wsPurchases['!cols'] = calculateColumnWidths(purchasesRows);
    XLSX.utils.book_append_sheet(wb, wsPurchases, 'Purchases (Stock In)');

    // --- SHEET 5: Shopping & Restock Cart ---
    const shoppingRows = db.shoppingList.map((item) => ({
      'Product Name': item.productName,
      Category: item.category || 'General',
      'Quantity Required': item.quantityRequired || 0,
      'Quantity Purchased': item.quantityPurchased || 0,
      [`Est. Unit Cost (${currency})`]: item.estimatedUnitPrice || item.estimatedBuyingPrice || 0,
      [`Est. Total Cost (${currency})`]: item.estimatedTotalCost || 0,
      Priority: item.priorityLabelName || 'NORMAL',
      Supplier: item.supplierName || 'Wholesaler',
      Status: item.purchaseStatus === 'purchased' ? 'Purchased / Completed' : 'Pending in Cart',
      'Target Date': item.targetDate || item.targetPurchaseDate || '',
      'Date Added': item.dateAdded ? formatDate(item.dateAdded) : '',
      Notes: item.notes || '',
    }));

    const wsShopping = XLSX.utils.json_to_sheet(shoppingRows);
    wsShopping['!cols'] = calculateColumnWidths(shoppingRows);
    XLSX.utils.book_append_sheet(wb, wsShopping, 'Shopping & Restock List');

    // --- SHEET 6: Customer CRM & Follow-ups ---
    const customerRows = db.customers.map((c) => ({
      'Customer Name': c.name,
      Phone: c.phone,
      Email: c.email || '',
      Location: c.location || '—',
      'Customer Type': c.customerType || 'General Customer',
      'Status': c.status || c.customerStatus || 'Active',
      'Preferred Contact': c.preferredContactMethod || 'Phone',
      [`Total Purchases (${currency})`]: c.totalSpent || c.totalPurchases || 0,
      'Last Contact Date': c.lastContactDate || '—',
      'Next Follow-Up': c.nextFollowUpDate || '—',
      'Date Added': c.dateAdded ? formatDate(c.dateAdded) : '',
    }));

    const wsCustomers = XLSX.utils.json_to_sheet(customerRows);
    wsCustomers['!cols'] = calculateColumnWidths(customerRows);
    XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customer Directory');

    // --- SHEET 7: Follow-ups Schedule ---
    const followUpRows = db.followUps.map((f) => ({
      'Customer Name': f.customerName,
      Phone: f.customerPhone,
      Date: f.date,
      Time: f.time || '',
      'Follow-up Type': f.type || f.followUpType || 'Phone Call',
      'Product / Project': f.productOrService || 'General',
      'Reason / Quotation': f.reasonForFollowUp,
      Status: f.status.toUpperCase(),
      Outcome: f.outcome || '',
      'Google Calendar Synced': f.addToGoogleCalendar ? 'YES' : 'NO',
      Notes: f.notes || '',
    }));

    const wsFollowUps = XLSX.utils.json_to_sheet(followUpRows);
    wsFollowUps['!cols'] = calculateColumnWidths(followUpRows);
    XLSX.utils.book_append_sheet(wb, wsFollowUps, 'Follow-up Schedule');

    // --- SHEET 8: Suppliers Directory ---
    const supplierRows = db.suppliers.map((s) => ({
      'Supplier Name': s.name,
      'Contact Person': s.contactPerson || '',
      Phone: s.phone,
      Email: s.email || '',
      Location: s.location || '',
      'Products Supplied': Array.isArray(s.productsSupplied) ? s.productsSupplied.join(', ') : '',
      'Payment Terms': s.paymentTerms || '',
      Notes: s.notes || '',
    }));

    const wsSuppliers = XLSX.utils.json_to_sheet(supplierRows);
    wsSuppliers['!cols'] = calculateColumnWidths(supplierRows);
    XLSX.utils.book_append_sheet(wb, wsSuppliers, 'Suppliers Directory');

    // Write file
    const outputFilename =
      filename || `KANGI_Store_Master_Workbook_${timestamp}.xlsx`;
    XLSX.writeFile(wb, outputFilename);
    return true;
  } catch (err) {
    console.error('Error generating master Excel workbook:', err);
    return false;
  }
}

/**
 * 2. Export Inventory Valuation Sheet
 */
export function exportInventoryToExcel(
  products: Product[],
  settings?: AppSettings,
  filename?: string
): boolean {
  try {
    const currency = settings?.currency || 'KES';
    const rows = products.map((p) => {
      const stock = p.currentStock || 0;
      const buyPrice = p.buyingPrice || 0;
      const sellPrice = p.sellingPrice || 0;
      const unitMargin = sellPrice - buyPrice;
      const marginPct = buyPrice > 0 ? ((unitMargin / buyPrice) * 100).toFixed(1) + '%' : '0%';
      const totalValuation = stock * buyPrice;

      let status = 'In Stock';
      if (stock === 0) status = 'OUT OF STOCK';
      else if (stock <= (p.minStockLevel || 5)) status = 'LOW STOCK ALERT';

      return {
        SKU: p.sku || '—',
        'Product Name': p.name,
        Category: p.category,
        'Stock on Hand': stock,
        Unit: p.unit || 'pcs',
        [`Buying Price (${currency})`]: buyPrice,
        [`Selling Price (${currency})`]: sellPrice,
        [`Unit Margin (${currency})`]: unitMargin,
        'Margin %': marginPct,
        [`Stock Valuation at Cost (${currency})`]: totalValuation,
        'Reorder Level': p.minStockLevel || 5,
        'Stock Alert Status': status,
        'Supplier Name': p.supplierName || '—',
        Notes: p.notes || '',
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = calculateColumnWidths(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Stock');

    const fname =
      filename || `KANGI_Inventory_Valuation_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fname);
    return true;
  } catch (err) {
    console.error('Error exporting inventory Excel:', err);
    return false;
  }
}

/**
 * 3. Export Sales Report Sheet
 */
export function exportSalesToExcel(
  sales: Sale[],
  settings?: AppSettings,
  filename?: string
): boolean {
  try {
    const currency = settings?.currency || 'KES';
    const rows = sales.map((s) => {
      let itemsSummary = s.productName || '';
      if (s.items && s.items.length > 0) {
        itemsSummary = s.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ');
      }

      return {
        'Receipt / Invoice No': s.receiptNumber || s.invoiceNumber || s.id,
        Date: s.date,
        'Items Description': itemsSummary,
        Quantity: s.quantity || (s.items?.reduce((sum, i) => sum + i.quantity, 0)) || 1,
        [`Total Amount (${currency})`]: s.totalSale || s.totalAmount || 0,
        [`Gross Profit (${currency})`]: s.grossProfit || 0,
        'Payment Method': s.paymentMethod || 'Cash',
        'Reference / M-Pesa': s.reference || '',
        'Customer Name': s.customerName || 'Walk-in Customer',
        'Customer Phone': s.customerPhone || '',
        Notes: s.notes || '',
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = calculateColumnWidths(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Transactions');

    const fname = filename || `KANGI_Sales_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fname);
    return true;
  } catch (err) {
    console.error('Error exporting sales Excel:', err);
    return false;
  }
}

/**
 * 4. Export Purchases / Stock In Sheet
 */
export function exportPurchasesToExcel(
  purchases: Purchase[],
  settings?: AppSettings,
  filename?: string
): boolean {
  try {
    const currency = settings?.currency || 'KES';
    const rows = purchases.map((p) => ({
      'Invoice / Order No': p.invoiceNumber || p.referenceNumber || p.id,
      Date: p.date,
      'Product Name': p.productName,
      SKU: p.sku || '—',
      'Supplier Name': p.supplierName || 'Wholesale Supplier',
      'Quantity In': p.quantity,
      [`Unit Cost (${currency})`]: p.unitCost || p.buyingPrice || 0,
      [`Total Cost (${currency})`]: p.totalCost,
      'Payment Status': p.paymentStatus || 'Paid',
      Notes: p.notes || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = calculateColumnWidths(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Purchases');

    const fname =
      filename || `KANGI_Purchases_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fname);
    return true;
  } catch (err) {
    console.error('Error exporting purchases Excel:', err);
    return false;
  }
}

/**
 * 5. Export Shopping / Procurement Sheet (for wholesaler orders)
 */
export function exportShoppingListToExcel(
  items: ShoppingListItem[],
  settings?: AppSettings,
  filename?: string
): boolean {
  try {
    const currency = settings?.currency || 'KES';
    const rows = items.map((item) => ({
      'Product Name': item.productName,
      Category: item.category || 'General',
      'Quantity Required': item.quantityRequired || 0,
      'Quantity Purchased': item.quantityPurchased || 0,
      [`Estimated Unit Cost (${currency})`]: item.estimatedUnitPrice || item.estimatedBuyingPrice || 0,
      [`Estimated Total Cost (${currency})`]: item.estimatedTotalCost || 0,
      'Priority Level': item.priorityLabelName || 'NORMAL',
      'Preferred Supplier': item.supplierName || 'Wholesaler',
      'Purchase Status': item.purchaseStatus === 'purchased' ? 'Purchased' : 'Pending Order',
      'Target Date': item.targetDate || item.targetPurchaseDate || '',
      Notes: item.notes || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = calculateColumnWidths(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Restock Shopping List');

    const fname =
      filename || `KANGI_Supplier_Order_List_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fname);
    return true;
  } catch (err) {
    console.error('Error exporting shopping list Excel:', err);
    return false;
  }
}

/**
 * 6. Export Customers & Follow-ups Sheet
 */
export function exportCustomersToExcel(
  customers: Customer[],
  followUps: FollowUp[],
  settings?: AppSettings,
  filename?: string
): boolean {
  try {
    const currency = settings?.currency || 'KES';
    const wb = XLSX.utils.book_new();

    const custRows = customers.map((c) => ({
      'Customer Name': c.name,
      Phone: c.phone,
      Email: c.email || '',
      Location: c.location || '—',
      'Customer Type': c.customerType || 'General',
      'Status': c.status || c.customerStatus || 'Active',
      [`Total Spent (${currency})`]: c.totalSpent || c.totalPurchases || 0,
      'Last Contact Date': c.lastContactDate || '—',
      'Next Follow-Up': c.nextFollowUpDate || '—',
      'Date Registered': c.dateAdded ? formatDate(c.dateAdded) : '',
    }));

    const wsCust = XLSX.utils.json_to_sheet(custRows);
    wsCust['!cols'] = calculateColumnWidths(custRows);
    XLSX.utils.book_append_sheet(wb, wsCust, 'Customer CRM');

    const fuRows = followUps.map((f) => ({
      'Customer Name': f.customerName,
      Phone: f.customerPhone,
      Date: f.date,
      Time: f.time || '',
      'Follow-up Type': f.type || f.followUpType || 'Phone Call',
      'Product / Project': f.productOrService || 'General',
      'Reason / Quotation': f.reasonForFollowUp,
      Status: f.status.toUpperCase(),
      Outcome: f.outcome || '',
      'Google Calendar Synced': f.addToGoogleCalendar ? 'YES' : 'NO',
      Notes: f.notes || '',
    }));

    const wsFollowUps = XLSX.utils.json_to_sheet(fuRows);
    wsFollowUps['!cols'] = calculateColumnWidths(fuRows);
    XLSX.utils.book_append_sheet(wb, wsFollowUps, 'Follow-up Schedule');

    const fname =
      filename || `KANGI_Customers_and_Followups_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fname);
    return true;
  } catch (err) {
    console.error('Error exporting customers Excel:', err);
    return false;
  }
}
