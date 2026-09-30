import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AppDatabase,
  loadDatabase,
  saveDatabase,
  resetDatabaseWithDemoData,
} from './utils/storage';
import {
  Product,
  Sale,
  Purchase,
  Customer,
  Supplier,
  FollowUp,
  ShoppingListItem,
  ShoppingHistoryItem,
  PriorityLabel,
  BusinessSettings,
  NavView,
  CustomerNote,
  ProductInterest,
  PaymentMethod,
} from './types';
import { isFollowUpOverdue, isDateToday, getTodayString } from './utils/formatters';
import { GoogleCalendarService } from './services/calendarService';
import { DatabaseAPI } from './services/api';

// Component Views
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { SalesView } from './components/SalesView';
import { PurchasesView } from './components/PurchasesView';
import { ShoppingListView } from './components/ShoppingListView';
import { SuppliersView } from './components/SuppliersView';
import { CustomersView } from './components/CustomersView';
import { FollowUpsView } from './components/FollowUpsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ExcelExportModal } from './components/ExcelExportModal';
import { AuthModal } from './components/AuthModal';
import { SessionManagerModal } from './components/SessionManagerModal';
import { LockScreen } from './components/LockScreen';
import { useAuth } from './services/AuthContext';

export default function App() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    isSessionModalOpen,
    closeSessionModal,
    isAuthenticated,
  } = useAuth();

  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [currentView, setCurrentView] = useState<NavView>('dashboard');

  // Backend Database Connection and Sync state
  const [isDbConnected, setIsDbConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Cross-view state pass-throughs
  const [inventoryLowStockFilterOnly, setInventoryLowStockFilterOnly] = useState(false);
  const [preselectedSupplierForPurchase, setPreselectedSupplierForPurchase] = useState<Supplier | null>(
    null
  );
  const [preselectedCustomerForSale, setPreselectedCustomerForSale] = useState<Customer | null>(null);
  const [preselectedCustomerForFollowUp, setPreselectedCustomerForFollowUp] = useState<Customer | null>(
    null
  );
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isShoppingModeOpen, setIsShoppingModeOpen] = useState(false);
  const [isExcelExportModalOpen, setIsExcelExportModalOpen] = useState(false);

  // Initial load: pull the authoritative state from the SQLite-backed REST API.
  // localStorage remains a same-tab fallback for when the backend is briefly unreachable.
  // Waits for a signed-in session first: the database routes require a token.
  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    const initDatabaseFromBackend = async () => {
      try {
        const apiHealth = await DatabaseAPI.checkHealth();
        if (mounted) setIsDbConnected(apiHealth.ok);

        const res = await DatabaseAPI.fetchFullDatabase();
        if (mounted && res.success && res.data) {
          setDb(res.data);
          saveDatabase(res.data);
          setLastSyncTime(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.warn('Could not sync with backend database at startup, using local data:', err);
        if (mounted) setIsDbConnected(false);
      }
    };

    initDatabaseFromBackend();

    // Heartbeat check every 25 seconds
    const interval = setInterval(async () => {
      const apiHealth = await DatabaseAPI.checkHealth();
      if (mounted) setIsDbConnected(apiHealth.ok);
    }, 25000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Sync state changes to LocalStorage (fallback cache) and the SQLite-backed REST API
  const updateDatabase = useCallback((updater: (prev: AppDatabase) => AppDatabase) => {
    setDb((prevDb) => {
      const newDb = updater(prevDb);
      saveDatabase(newDb);

      setIsSyncing(true);
      DatabaseAPI.saveFullDatabase(newDb)
        .then((result) => {
          setIsDbConnected(result.success);
          if (result.success) {
            setLastSyncTime(new Date().toLocaleTimeString());
          }
        })
        .catch(() => {
          setIsDbConnected(false);
        })
        .finally(() => {
          setIsSyncing(false);
        });

      return newDb;
    });
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await DatabaseAPI.fetchFullDatabase();
      if (res.success && res.data) {
        setDb(res.data);
        saveDatabase(res.data);
        setIsDbConnected(true);
        setLastSyncTime(new Date().toLocaleTimeString());
        return;
      }

      // Nothing on the backend yet — push current local state up.
      await DatabaseAPI.saveFullDatabase(db);
      setIsDbConnected(true);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Manual sync failed:', e);
      setIsDbConnected(false);
    } finally {
      setIsSyncing(false);
    }
  };

  // Quick Action Triggers
  const handleOpenQuickSale = () => {
    setPreselectedCustomerForSale(null);
    setIsNewSaleModalOpen(true);
    setCurrentView('sales');
  };

  const handleOpenQuickPurchase = () => {
    setPreselectedSupplierForPurchase(null);
    setIsNewPurchaseModalOpen(true);
    setCurrentView('purchases');
  };

  const handleOpenQuickFollowUp = () => {
    setPreselectedCustomerForFollowUp(null);
    setIsFollowUpModalOpen(true);
    setCurrentView('follow-ups');
  };

  // Compute Badge Counters
  const lowStockCount = useMemo(() => {
    return db.products.filter((p) => p.currentStock <= p.minStockLevel).length;
  }, [db.products]);

  const overdueFollowUpsCount = useMemo(() => {
    return db.followUps.filter(
      (f) => f.status === 'pending' && isFollowUpOverdue(f.date, f.time, f.status)
    ).length;
  }, [db.followUps]);

  const activeShoppingItemsCount = useMemo(() => {
    return db.shoppingList.filter((i) => i.purchaseStatus !== 'purchased').length;
  }, [db.shoppingList]);

  // ==========================================
  // INVENTORY PRODUCT HANDLERS
  // ==========================================
  const handleAddProduct = (newProductData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...newProductData,
      id: `prod-${Date.now()}`,
    };
    updateDatabase((prev) => ({
      ...prev,
      products: [newProduct, ...prev.products],
    }));
  };

  const handleEditProduct = (updatedProduct: Product) => {
    updateDatabase((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
    }));
  };

  const handleDeleteProduct = (productId: string) => {
    updateDatabase((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId),
      shoppingList: prev.shoppingList.filter((s) => s.productId !== productId),
    }));
  };

  const handleAdjustStock = (productId: string, newStock: number, reason: string) => {
    updateDatabase((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId
          ? {
              ...p,
              currentStock: Math.max(0, newStock),
              status:
                newStock === 0
                  ? 'out-of-stock'
                  : newStock <= p.minStockLevel
                  ? 'low-stock'
                  : 'in-stock',
            }
          : p
      ),
    }));
  };

  // InventoryView reports a delta (+/-) and a direction, not the new absolute
  // stock figure that handleAdjustStock expects — this adapts between the two.
  const handleStockAdjustment = (
    productId: string,
    quantity: number,
    type: 'ADJUSTMENT_ADD' | 'ADJUSTMENT_SUB',
    reason: string
  ) => {
    const product = db.products.find((p) => p.id === productId);
    if (!product) return;
    const delta = type === 'ADJUSTMENT_ADD' ? quantity : -quantity;
    handleAdjustStock(productId, Math.max(0, product.currentStock + delta), reason);
  };

  const handleQuickAddProductToShoppingList = (
    product: Product,
    quantity: number,
    priorityLabelId: string
  ) => {
    const lbl =
      db.priorityLabels.find((l) => l.id === priorityLabelId) || db.priorityLabels[0];
    const sup = db.suppliers.find((s) => s.id === product.supplierId);

    const newItem: ShoppingListItem = {
      id: `shop-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      quantityRequired: quantity,
      quantityPurchased: 0,
      estimatedUnitPrice: product.buyingPrice,
      estimatedTotalCost: quantity * product.buyingPrice,
      priorityLabelId: lbl.id,
      priorityLabelName: lbl.name,
      priorityColor: lbl.color,
      supplierId: product.supplierId,
      supplierName: sup?.name,
      purchaseStatus: 'pending',
    };

    updateDatabase((prev) => ({
      ...prev,
      shoppingList: [newItem, ...prev.shoppingList],
    }));
  };

  // ==========================================
  // SALES HANDLERS
  // ==========================================
  const handleRecordSale = (saleData: {
    productId: string;
    quantity: number;
    sellingPrice: number;
    date: string;
    paymentMethod: PaymentMethod;
    customerId?: string;
    customerName?: string;
    reference?: string;
    notes?: string;
  }): { success: boolean; error?: string } => {
    const product = db.products.find((p) => p.id === saleData.productId);
    if (!product) {
      return { success: false, error: 'Selected product could not be found.' };
    }
    if (saleData.quantity > product.currentStock) {
      return {
        success: false,
        error: `Insufficient stock! Only ${product.currentStock} ${product.unit} available.`,
      };
    }

    const totalSale = saleData.quantity * saleData.sellingPrice;
    const cogs = saleData.quantity * product.buyingPrice;
    const grossProfit = totalSale - cogs;
    const profitMargin = totalSale > 0 ? (grossProfit / totalSale) * 100 : 0;
    const receiptNumber = `RCT-${Date.now().toString().slice(-6)}`;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      receiptNumber,
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(db.sales.length + 1).padStart(3, '0')}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      category: product.category,
      quantity: saleData.quantity,
      sellingPrice: saleData.sellingPrice,
      totalSale,
      unitBuyingPrice: product.buyingPrice,
      cogs,
      grossProfit,
      profitMargin,
      customerId: saleData.customerId,
      customerName: saleData.customerName,
      totalAmount: totalSale,
      totalCost: cogs,
      paymentMethod: saleData.paymentMethod,
      date: saleData.date,
      reference: saleData.reference,
      notes: saleData.notes,
      createdAt: new Date().toISOString(),
    };

    updateDatabase((prev) => {
      // 1. Decrement inventory product stock
      const updatedProducts = prev.products.map((prod) => {
        if (prod.id !== newSale.productId) return prod;
        const newStock = Math.max(0, prod.currentStock - (newSale.quantity || 0));
        return {
          ...prod,
          currentStock: newStock,
          status:
            newStock === 0
              ? ('out-of-stock' as const)
              : newStock <= prod.minStockLevel
              ? ('low-stock' as const)
              : ('in-stock' as const),
        };
      });

      // 2. Update Customer lifetime spend and profit
      let updatedCustomers = prev.customers;
      if (newSale.customerId) {
        updatedCustomers = prev.customers.map((cust) => {
          if (cust.id !== newSale.customerId) return cust;
          return {
            ...cust,
            totalPurchases: cust.totalPurchases + 1,
            totalSpent: cust.totalSpent + (newSale.totalAmount || 0),
            totalProfitGenerated: cust.totalProfitGenerated + newSale.grossProfit,
            lastContactDate: newSale.date,
            timeline: [
              {
                id: `time-${Date.now()}`,
                date: new Date().toISOString(),
                type: 'SALE' as const,
                title: `Purchased ${newSale.productName}`,
                description: `Receipt: ${newSale.receiptNumber} • Total: KES ${newSale.totalAmount}`,
              },
              ...(cust.timeline || []),
            ],
          };
        });
      }

      return {
        ...prev,
        sales: [newSale, ...prev.sales],
        products: updatedProducts,
        customers: updatedCustomers,
      };
    });

    return { success: true };
  };

  // ==========================================
  // PURCHASES & STOCK-IN HANDLERS
  // ==========================================
  const handleRecordPurchase = (purchaseData: {
    productId: string;
    supplierId: string;
    quantity: number;
    buyingPrice: number;
    date: string;
    invoiceNumber?: string;
    notes?: string;
  }) => {
    const product = db.products.find((p) => p.id === purchaseData.productId);
    const supplier = db.suppliers.find((s) => s.id === purchaseData.supplierId);
    if (!product) return;

    const newPurchase: Purchase = {
      id: `po-${Date.now()}`,
      productId: purchaseData.productId,
      productName: product.name,
      sku: product.sku,
      supplierId: purchaseData.supplierId,
      supplierName: supplier?.name,
      quantity: purchaseData.quantity,
      unitCost: purchaseData.buyingPrice,
      buyingPrice: purchaseData.buyingPrice,
      totalCost: purchaseData.quantity * purchaseData.buyingPrice,
      date: purchaseData.date,
      invoiceNumber: purchaseData.invoiceNumber,
      notes: purchaseData.notes,
      createdAt: new Date().toISOString(),
    };

    updateDatabase((prev) => {
      // Increment product stock and update buying price
      const updatedProducts = prev.products.map((prod) => {
        if (prod.id === newPurchase.productId) {
          const newStock = prod.currentStock + newPurchase.quantity;
          return {
            ...prod,
            currentStock: newStock,
            buyingPrice: newPurchase.unitCost, // Update latest cost
            supplierId: newPurchase.supplierId || prod.supplierId,
            status:
              newStock === 0
                ? ('out-of-stock' as const)
                : newStock <= prod.minStockLevel
                ? ('low-stock' as const)
                : ('in-stock' as const),
          };
        }
        return prod;
      });

      return {
        ...prev,
        purchases: [newPurchase, ...prev.purchases],
        products: updatedProducts,
      };
    });
  };

  // ==========================================
  // SHOPPING LIST & CART CONVERSION HANDLERS
  // ==========================================
  const handleAddShoppingItem = (
    itemData: Omit<ShoppingListItem, 'id' | 'estimatedTotalCost' | 'purchaseStatus'>
  ) => {
    const newItem: ShoppingListItem = {
      ...itemData,
      id: `shop-${Date.now()}`,
      estimatedTotalCost: itemData.quantityRequired * itemData.estimatedUnitPrice,
      purchaseStatus: 'pending',
    };

    updateDatabase((prev) => ({
      ...prev,
      shoppingList: [newItem, ...prev.shoppingList],
    }));
  };

  const handleEditShoppingItem = (item: ShoppingListItem) => {
    updateDatabase((prev) => ({
      ...prev,
      shoppingList: prev.shoppingList.map((i) => (i.id === item.id ? item : i)),
    }));
  };

  const handleDeleteShoppingItem = (itemId: string) => {
    updateDatabase((prev) => ({
      ...prev,
      shoppingList: prev.shoppingList.filter((i) => i.id !== itemId),
    }));
  };

  const handleClearPurchasedShoppingItems = () => {
    updateDatabase((prev) => ({
      ...prev,
      shoppingList: prev.shoppingList.filter((i) => i.purchaseStatus !== 'purchased'),
    }));
  };

  /**
   * CRITICAL BUSINESS LOGIC:
   * "Adding an item to the Shopping List must NEVER increase inventory.
   * Inventory only increases when the user explicitly confirms a purchase
   * through 'ADD TO INVENTORY,' which creates a real Purchases record."
   */
  const handleConfirmPurchaseToInventory = (
    item: ShoppingListItem,
    actualQuantity: number,
    actualPrice: number,
    supplierId: string,
    invoiceNumber: string,
    notes?: string
  ) => {
    const todayStr = getTodayString();
    const sup = db.suppliers.find((s) => s.id === supplierId);

    // 1. Create a real formal Purchase record
    const realPurchase: Purchase = {
      id: `po-${Date.now()}`,
      productId: item.productId || `custom-${Date.now()}`,
      productName: item.productName,
      sku: item.sku,
      supplierId: supplierId || undefined,
      supplierName: sup?.name || item.supplierName || 'Wholesaler',
      quantity: actualQuantity,
      unitCost: actualPrice,
      totalCost: actualQuantity * actualPrice,
      date: todayStr,
      invoiceNumber: invoiceNumber || `PO-${Date.now().toString().slice(-5)}`,
      paymentStatus: 'paid',
      notes: notes || `Restocked via Shopping List`,
    };

    // 2. Create a Shopping History record with variance and savings
    const estimatedCostForThisQty = item.estimatedUnitPrice * actualQuantity;
    const actualTotalCost = actualQuantity * actualPrice;
    const savingsAchieved = Math.max(0, estimatedCostForThisQty - actualTotalCost);

    const historyRecord: ShoppingHistoryItem = {
      id: `shist-${Date.now()}`,
      shoppingListItemId: item.id,
      productName: item.productName,
      sku: item.sku,
      supplierName: sup?.name || item.supplierName || 'Wholesaler',
      datePurchased: todayStr,
      quantityPurchased: actualQuantity,
      estimatedUnitPrice: item.estimatedUnitPrice,
      actualUnitPrice: actualPrice,
      estimatedTotalCost: estimatedCostForThisQty,
      actualTotalCost: actualTotalCost,
      savingsAchieved: savingsAchieved,
      purchaseRecordId: realPurchase.id,
    };

    updateDatabase((prev) => {
      // 3. Increment product inventory stock if product exists in catalog
      const updatedProducts = prev.products.map((prod) => {
        if (prod.id === item.productId) {
          const newStock = prod.currentStock + actualQuantity;
          return {
            ...prod,
            currentStock: newStock,
            buyingPrice: actualPrice, // update latest buying cost
            supplierId: supplierId || prod.supplierId,
            status:
              newStock === 0
                ? ('out-of-stock' as const)
                : newStock <= prod.minStockLevel
                ? ('low-stock' as const)
                : ('in-stock' as const),
          };
        }
        return prod;
      });

      // 4. Update shopping list item status (handle partial vs full purchase)
      const updatedShoppingList = prev.shoppingList.map((i) => {
        if (i.id === item.id) {
          const totalBought = i.quantityPurchased + actualQuantity;
          const isFullyDone = totalBought >= i.quantityRequired;
          return {
            ...i,
            quantityPurchased: totalBought,
            purchaseStatus: isFullyDone
              ? ('purchased' as const)
              : ('partial' as const),
          };
        }
        return i;
      });

      return {
        ...prev,
        purchases: [realPurchase, ...prev.purchases],
        products: updatedProducts,
        shoppingList: updatedShoppingList,
        shoppingHistory: [historyRecord, ...prev.shoppingHistory],
      };
    });
  };

  const handleManagePriorityLabels = (labels: PriorityLabel[]) => {
    updateDatabase((prev) => ({
      ...prev,
      priorityLabels: labels,
    }));
  };

  // ==========================================
  // SUPPLIERS HANDLERS
  // ==========================================
  const handleAddSupplier = (supplierData: Omit<Supplier, 'id'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`,
    };
    updateDatabase((prev) => ({
      ...prev,
      suppliers: [newSupplier, ...prev.suppliers],
    }));
  };

  const handleEditSupplier = (supplier: Supplier) => {
    updateDatabase((prev) => ({
      ...prev,
      suppliers: prev.suppliers.map((s) => (s.id === supplier.id ? supplier : s)),
    }));
  };

  const handleDeleteSupplier = (supplierId: string) => {
    updateDatabase((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((s) => s.id !== supplierId),
    }));
  };

  const handleInitiatePurchaseForSupplier = (supplier: Supplier) => {
    setPreselectedSupplierForPurchase(supplier);
    setCurrentView('purchases');
  };

  // ==========================================
  // CUSTOMERS & CRM HANDLERS
  // ==========================================
  const handleAddCustomer = (
    customerData: Omit<
      Customer,
      'id' | 'totalPurchases' | 'totalSpent' | 'totalProfitGenerated'
    >
  ) => {
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      totalPurchases: 0,
      totalSpent: 0,
      totalProfitGenerated: 0,
    };
    updateDatabase((prev) => ({
      ...prev,
      customers: [newCustomer, ...prev.customers],
    }));
  };

  const handleEditCustomer = (customer: Customer) => {
    updateDatabase((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => (c.id === customer.id ? customer : c)),
    }));
  };

  const handleDeleteCustomer = (customerId: string) => {
    updateDatabase((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== customerId),
    }));
  };

  const handleOpenSaleForCustomer = (customer: Customer) => {
    setPreselectedCustomerForSale(customer);
    setCurrentView('sales');
  };

  const handleOpenFollowUpForCustomer = (customer: Customer) => {
    setPreselectedCustomerForFollowUp(customer);
    setIsFollowUpModalOpen(true);
  };

  const handleAddProductInterest = (
    customerId: string,
    interest: Omit<ProductInterest, 'id'>
  ) => {
    const newInterest = {
      ...interest,
      id: `int-${Date.now()}`,
    };
    updateDatabase((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => {
        if (c.id === customerId) {
          return {
            ...c,
            productInterests: [...(c.productInterests || []), newInterest],
          };
        }
        return c;
      }),
    }));
  };

  const handleAddCustomerNote = (customerId: string, text: string, relatedProduct?: string) => {
    const newNote: CustomerNote = {
      id: `note-${Date.now()}`,
      date: getTodayString(),
      author: 'Manager',
      note: text,
      relatedProduct,
    };
    updateDatabase((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => {
        if (c.id === customerId) {
          return {
            ...c,
            notesHistory: [newNote, ...(c.notesHistory || [])],
          };
        }
        return c;
      }),
    }));
  };

  // ==========================================
  // FOLLOW-UPS & GOOGLE CALENDAR HANDLERS
  // ==========================================
  const handleAddFollowUp = async (followUpData: Omit<FollowUp, 'id'>) => {
    let syncStatus: 'synced' | 'failed' | 'not_synced' = 'not_synced';
    let gcalEventId: string | undefined = undefined;

    // Try Google Calendar sync if enabled
    if (followUpData.addToGoogleCalendar && GoogleCalendarService.isConfigured()) {
      try {
        const dummyFollowUp: FollowUp = {
          ...followUpData,
          id: `fu-${Date.now()}`,
        };
        const createdId = await GoogleCalendarService.createFollowUpEvent(dummyFollowUp);
        if (createdId) {
          syncStatus = 'synced';
          gcalEventId = createdId;
        } else {
          syncStatus = 'failed';
        }
      } catch (err) {
        console.error('Google calendar error', err);
        syncStatus = 'failed';
      }
    }

    const newFollowUp: FollowUp = {
      ...followUpData,
      id: `fu-${Date.now()}`,
      googleCalendarEventId: gcalEventId,
      googleCalendarSyncStatus: syncStatus,
    };

    updateDatabase((prev) => {
      // Add event to customer timeline if linked
      let updatedCustomers = prev.customers;
      if (newFollowUp.customerId) {
        updatedCustomers = prev.customers.map((c) => {
          if (c.id === newFollowUp.customerId) {
            return {
              ...c,
              lastContactDate: newFollowUp.date,
              timeline: [
                {
                  id: `time-${Date.now()}`,
                  date: new Date().toISOString(),
                  type: 'FOLLOW_UP' as const,
                  title: `Scheduled Follow-up: ${newFollowUp.reasonForFollowUp}`,
                  description: `${newFollowUp.type} on ${newFollowUp.date} at ${newFollowUp.time || '10:00'}`,
                },
                ...(c.timeline || []),
              ],
            };
          }
          return c;
        });
      }

      return {
        ...prev,
        followUps: [newFollowUp, ...prev.followUps],
        customers: updatedCustomers,
      };
    });
  };

  const handleEditFollowUp = async (followUp: FollowUp) => {
    if (followUp.googleCalendarEventId && GoogleCalendarService.isConfigured()) {
      await GoogleCalendarService.updateFollowUpEvent(followUp);
    }
    updateDatabase((prev) => ({
      ...prev,
      followUps: prev.followUps.map((f) => (f.id === followUp.id ? followUp : f)),
    }));
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    const fu = db.followUps.find((f) => f.id === followUpId);
    if (fu?.googleCalendarEventId && GoogleCalendarService.isConfigured()) {
      await GoogleCalendarService.deleteFollowUpEvent(fu.googleCalendarEventId);
    }
    updateDatabase((prev) => ({
      ...prev,
      followUps: prev.followUps.filter((f) => f.id !== followUpId),
    }));
  };

  const handleCompleteFollowUp = async (
    followUp: FollowUp,
    outcome: string,
    notes?: string
  ) => {
    const updated: FollowUp = {
      ...followUp,
      status: 'completed',
      outcome,
      completionNotes: notes,
    };

    if (followUp.googleCalendarEventId && GoogleCalendarService.isConfigured()) {
      await GoogleCalendarService.updateFollowUpEvent(updated);
    }

    updateDatabase((prev) => ({
      ...prev,
      followUps: prev.followUps.map((f) => (f.id === followUp.id ? updated : f)),
    }));
  };

  const handleResyncGoogleCalendar = async (followUp: FollowUp) => {
    if (!GoogleCalendarService.isConfigured()) return;
    const createdId = await GoogleCalendarService.createFollowUpEvent(followUp);
    if (createdId) {
      updateDatabase((prev) => ({
        ...prev,
        followUps: prev.followUps.map((f) =>
          f.id === followUp.id
            ? {
                ...f,
                googleCalendarEventId: createdId,
                googleCalendarSyncStatus: 'synced',
              }
            : f
        ),
      }));
    }
  };

  // ==========================================
  // SETTINGS & BACKUP HANDLERS
  // ==========================================
  const handleSaveSettings = (newSettings: BusinessSettings) => {
    updateDatabase((prev) => ({
      ...prev,
      settings: newSettings,
    }));
  };

  const handleSaveCategories = (newCategories: string[]) => {
    updateDatabase((prev) => ({
      ...prev,
      categories: newCategories,
    }));
  };

  const handleResetDatabase = () => {
    const defaultData = resetDatabaseWithDemoData();
    setDb(defaultData);
    alert('System restored to default Kenya inventory demo state!');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 antialiased lg:flex-row">
      {/* Navigation (Sidebar Desktop + Mobile Header & Bottom Navigation Bar) */}
      <Navigation
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view !== 'inventory') {
            setInventoryLowStockFilterOnly(false);
          }
        }}
        lowStockCount={lowStockCount}
        overdueFollowUpsCount={overdueFollowUpsCount}
        shoppingListCount={activeShoppingItemsCount}
        businessSettings={db.settings}
        isDbConnected={isDbConnected}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
        onOpenQuickSale={handleOpenQuickSale}
        onOpenQuickFollowUp={handleOpenQuickFollowUp}
        onOpenExcelExport={() => setIsExcelExportModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 transition-colors pb-24 lg:pb-8">
        <div className="mx-auto max-w-7xl">
          {/* 1. DASHBOARD VIEW */}
          {currentView === 'dashboard' && (
            <DashboardView
              products={db.products}
              sales={db.sales}
              purchases={db.purchases}
              customers={db.customers}
              followUps={db.followUps}
              shoppingList={db.shoppingList}
              onNavigate={(view) => setCurrentView(view)}
              onOpenQuickSale={handleOpenQuickSale}
              onOpenQuickPurchase={handleOpenQuickPurchase}
              onOpenQuickFollowUp={handleOpenQuickFollowUp}
              onOpenShoppingMode={() => {
                setIsShoppingModeOpen(true);
                setCurrentView('shopping-list');
              }}
              onCompleteFollowUp={(fu) => handleCompleteFollowUp(fu, 'Follow-up done from dashboard')}
              onAddProductToShoppingList={(prod) => handleQuickAddProductToShoppingList(prod, 5, db.priorityLabels[0]?.id || '')}
              onQuickLowStockView={() => {
                setInventoryLowStockFilterOnly(true);
                setCurrentView('inventory');
              }}
              onQuickOverdueFollowUpsView={() => {
                setCurrentView('follow-ups');
              }}
            />
          )}

          {/* 2. INVENTORY VIEW */}
          {currentView === 'inventory' && (
            <InventoryView
              products={db.products}
              stockMovements={db.stockMovements}
              suppliers={db.suppliers}
              priorityLabels={db.priorityLabels}
              onAddProduct={handleAddProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              onStockAdjustment={handleStockAdjustment}
              onAddToShoppingList={handleQuickAddProductToShoppingList}
            />
          )}

          {/* 3. SALES VIEW */}
          {currentView === 'sales' && (
            <SalesView
              sales={db.sales}
              products={db.products}
              customers={db.customers}
              isNewSaleModalOpen={isNewSaleModalOpen}
              setIsNewSaleModalOpen={setIsNewSaleModalOpen}
              onRecordSale={handleRecordSale}
            />
          )}

          {/* 4. PURCHASES VIEW */}
          {currentView === 'purchases' && (
            <PurchasesView
              purchases={db.purchases}
              products={db.products}
              suppliers={db.suppliers}
              isNewPurchaseModalOpen={isNewPurchaseModalOpen}
              setIsNewPurchaseModalOpen={setIsNewPurchaseModalOpen}
              onRecordPurchase={handleRecordPurchase}
            />
          )}

          {/* 5. SHOPPING LIST & CART VIEW */}
          {currentView === 'shopping-list' && (
            <ShoppingListView
              shoppingList={db.shoppingList}
              shoppingHistory={db.shoppingHistory}
              products={db.products}
              suppliers={db.suppliers}
              priorityLabels={db.priorityLabels}
              isShoppingModeOpen={isShoppingModeOpen}
              setIsShoppingModeOpen={setIsShoppingModeOpen}
              onAddItem={handleAddShoppingItem}
              onEditItem={handleEditShoppingItem}
              onDeleteItem={handleDeleteShoppingItem}
              onClearPurchased={handleClearPurchasedShoppingItems}
              onConfirmPurchaseToInventory={handleConfirmPurchaseToInventory}
              onManagePriorityLabels={handleManagePriorityLabels}
            />
          )}

          {/* 6. SUPPLIERS VIEW */}
          {currentView === 'suppliers' && (
            <SuppliersView
              suppliers={db.suppliers}
              purchases={db.purchases}
              products={db.products}
              onAddSupplier={handleAddSupplier}
              onEditSupplier={handleEditSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onInitiatePurchaseForSupplier={handleInitiatePurchaseForSupplier}
            />
          )}

          {/* 7. CUSTOMERS & CRM VIEW */}
          {currentView === 'customers' && (
            <CustomersView
              customers={db.customers}
              sales={db.sales}
              followUps={db.followUps}
              onAddCustomer={handleAddCustomer}
              onEditCustomer={handleEditCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onOpenSaleForCustomer={handleOpenSaleForCustomer}
              onOpenFollowUpForCustomer={handleOpenFollowUpForCustomer}
              onAddProductInterest={handleAddProductInterest}
              onAddCustomerNote={handleAddCustomerNote}
            />
          )}

          {/* 8. FOLLOW-UPS & REMINDERS VIEW */}
          {currentView === 'follow-ups' && (
            <FollowUpsView
              followUps={db.followUps}
              customers={db.customers}
              isNewFollowUpModalOpen={isFollowUpModalOpen}
              setIsNewFollowUpModalOpen={setIsFollowUpModalOpen}
              preselectedCustomer={preselectedCustomerForFollowUp}
              onAddFollowUp={handleAddFollowUp}
              onEditFollowUp={handleEditFollowUp}
              onDeleteFollowUp={handleDeleteFollowUp}
              onCompleteFollowUp={handleCompleteFollowUp}
              onResyncGoogleCalendar={handleResyncGoogleCalendar}
            />
          )}

          {/* 9. REPORTS VIEW */}
          {currentView === 'reports' && (
            <ReportsView
              sales={db.sales}
              purchases={db.purchases}
              products={db.products}
              customers={db.customers}
            />
          )}

          {/* 10. SETTINGS VIEW */}
          {currentView === 'settings' && (
            <SettingsView
              settings={db.settings}
              categories={db.categories}
              priorityLabels={db.priorityLabels}
              isDbConnected={isDbConnected}
              isSyncing={isSyncing}
              lastSyncTime={lastSyncTime}
              onManualSync={handleManualSync}
              onSaveSettings={handleSaveSettings}
              onSaveCategories={handleSaveCategories}
              onResetDatabase={handleResetDatabase}
              onOpenExcelExport={() => setIsExcelExportModalOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Central Excel Spreadsheet Hub Modal */}
      <ExcelExportModal
        isOpen={isExcelExportModalOpen}
        onClose={() => setIsExcelExportModalOpen(false)}
        db={db}
      />

      {/* Authentication & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
      />

      {/* Terminal Session & Audit Manager Modal */}
      <SessionManagerModal
        isOpen={isSessionModalOpen}
        onClose={closeSessionModal}
      />

      {/* Fullscreen Terminal Lock Overlay */}
      <LockScreen />
    </div>
  );
}
