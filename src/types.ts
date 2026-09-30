/**
 * KANGI Stock Manager - Core TypeScript Interfaces
 */

export type ProductCategory =
  | 'Electrical'
  | 'Plumbing'
  | 'Tools & Accessories'
  | 'Hardware'
  | 'Lighting'
  | 'Cables'
  | 'Paint & Building'
  | 'Experimental/New Products'
  | 'General'
  | string;

export type PaymentMethod =
  | 'Cash'
  | 'M-Pesa'
  | 'Bank Transfer'
  | 'Credit/Invoice'
  | string;

export type CustomerType =
  | 'Walk-in customer'
  | 'Electrician'
  | 'Plumber'
  | 'Contractor'
  | 'Landlord'
  | 'Tenant/Homeowner'
  | 'Business'
  | 'Institution'
  | 'Property manager'
  | 'Supplier'
  | 'Potential customer'
  | 'General Customer'
  | 'Reseller'
  | 'Technician'
  | 'Other'
  | string;

export type CustomerStatus =
  | 'New'
  | 'Active'
  | 'Follow-up needed'
  | 'Quotation sent'
  | 'Waiting for response'
  | 'Purchased'
  | 'Repeat customer'
  | 'Inactive'
  | 'Lost'
  | string;

export type PreferredContactMethod =
  | 'Phone'
  | 'Phone call'
  | 'WhatsApp'
  | 'SMS'
  | 'Email'
  | 'In-person'
  | 'In-person visit'
  | string;

export type FollowUpType =
  | 'Phone Call'
  | 'Phone call'
  | 'WhatsApp'
  | 'SMS'
  | 'Email'
  | 'In-person Visit'
  | 'In-person visit'
  | 'Quotation follow-up'
  | 'Payment follow-up'
  | 'Product availability'
  | 'Repeat purchase'
  | 'Customer check-in'
  | 'Other'
  | string;

export type FollowUpStatus = 'pending' | 'completed' | 'cancelled';

export type FollowUpOutcome =
  | 'Interested'
  | 'Purchased'
  | 'Purchased / Ordered'
  | 'Quotation Accepted'
  | 'Needs more time'
  | 'Needs More Time / Callback Requested'
  | 'Asked for quotation'
  | 'Quotation Sent'
  | 'No response'
  | 'Not interested'
  | 'Not Interested / Postponed'
  | 'Call back later'
  | 'Referred to someone else'
  | 'Other'
  | string;

export type StockMovementType =
  | 'OPENING_STOCK'
  | 'PURCHASE'
  | 'SALE'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_SUB'
  | 'RETURN'
  | string;

export type NavView =
  | 'dashboard'
  | 'inventory'
  | 'sales'
  | 'purchases'
  | 'shopping-list'
  | 'suppliers'
  | 'customers'
  | 'follow-ups'
  | 'reports'
  | 'settings';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  unit: string;
  buyingPrice: number;
  sellingPrice: number;
  openingStock: number;
  currentStock: number;
  minStockLevel?: number;
  reorderLevel?: number;
  supplierId?: string;
  supplierName?: string;
  status?: 'in-stock' | 'low-stock' | 'out-of-stock' | string;
  dateAdded: string;
  notes?: string;
}

export interface StockMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  movementType: StockMovementType;
  unitCost: number;
  referenceNumber: string;
  supplierOrCustomerName?: string;
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku?: string;
  category?: string;
  quantity: number;
  unit?: string;
  buyingPrice: number;
  sellingPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  receiptNumber?: string;
  invoiceNumber?: string;
  productId?: string;
  productName?: string;
  sku?: string;
  category?: ProductCategory;
  quantity?: number;
  sellingPrice?: number;
  totalSale?: number;
  unitBuyingPrice?: number;
  cogs?: number;
  grossProfit: number;
  profitMargin?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items?: SaleItem[];
  totalAmount?: number;
  totalCost?: number;
  paymentMethod: PaymentMethod;
  date: string;
  reference?: string;
  notes?: string;
  createdAt?: string;
}

export interface Purchase {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  supplierId?: string;
  supplierName?: string;
  quantity: number;
  unitCost?: number;
  buyingPrice?: number;
  totalCost: number;
  date: string;
  invoiceNumber?: string;
  referenceNumber?: string;
  paymentStatus?: 'paid' | 'pending' | 'credit' | string;
  notes?: string;
  shoppingListItemId?: string;
  createdAt?: string;
}

export interface PriorityLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
  level?: number;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface ShoppingListItem {
  id: string;
  productId?: string;
  productName: string;
  sku?: string;
  category?: ProductCategory;
  unit?: string;
  quantityRequired: number;
  quantityPurchased: number;
  estimatedUnitPrice?: number;
  estimatedBuyingPrice?: number;
  estimatedTotalCost: number;
  supplierId?: string;
  supplierName?: string;
  priorityLabelId: string;
  priorityLabelName: string;
  priorityColor?: string;
  purchaseStatus: 'pending' | 'planned' | 'partial' | 'purchased' | string;
  targetDate?: string;
  targetPurchaseDate?: string;
  dateAdded?: string;
  notes?: string;
}

export interface ShoppingHistoryItem {
  id: string;
  shoppingListItemId?: string;
  productName?: string;
  sku?: string;
  supplierId?: string;
  supplierName: string;
  datePurchased?: string;
  date?: string;
  itemsCount?: number;
  totalQuantity?: number;
  quantityPurchased?: number;
  estimatedUnitPrice?: number;
  actualUnitPrice?: number;
  estimatedTotalCost?: number;
  estimatedCost?: number;
  actualTotalCost?: number;
  actualCost?: number;
  savingsAchieved?: number;
  savings?: number;
  items?: Array<{
    productName: string;
    quantity: number;
    estimatedPrice: number;
    actualPrice: number;
    referenceNumber?: string;
  }>;
  purchaseRecordId?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  location: string;
  productsSupplied: string[];
  paymentTerms?: string;
  notes?: string;
  dateAdded?: string;
}

export interface ProductInterest {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  expectedPurchaseDate?: string;
  followUpDate?: string;
  notes?: string;
}

export interface CustomerNote {
  id: string;
  date: string;
  author?: string;
  user?: string;
  note: string;
  relatedProduct?: string;
  relatedFollowUpId?: string;
}

export interface CustomerTimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type:
    | 'created'
    | 'inquiry'
    | 'quotation'
    | 'purchase'
    | 'payment'
    | 'phone_call'
    | 'whatsapp'
    | 'email'
    | 'visit'
    | 'note'
    | 'other'
    | 'SALE'
    | 'FOLLOW_UP'
    | 'INQUIRY'
    | string;
  relatedId?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  location: string;
  customerType: CustomerType;
  businessName?: string;
  status?: CustomerStatus;
  customerStatus?: CustomerStatus;
  preferredContactMethod?: PreferredContactMethod | string;
  dateAdded?: string;
  dateFirstContacted?: string;
  lastContactDate: string;
  nextFollowUpDate?: string;
  productInterests?: ProductInterest[];
  productsInterestedIn?: ProductInterest[];
  totalPurchases: number;
  totalSpent: number;
  totalProfitGenerated: number;
  notesHistory?: CustomerNote[];
  notes?: string | CustomerNote[];
  timeline?: CustomerTimelineEvent[];
}

export interface FollowUp {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  type?: FollowUpType | string;
  followUpType?: FollowUpType | string;
  productOrService: string;
  reasonForFollowUp: string;
  notes?: string;
  outcome?: FollowUpOutcome;
  completionNotes?: string;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  status: FollowUpStatus;
  addToGoogleCalendar: boolean;
  googleCalendarEventId?: string;
  googleCalendarSyncStatus?: 'synced' | 'failed' | 'not_synced' | 'pending';
  googleCalendarReminderMinutes?: number;
  reminderTiming?: '10_min' | '30_min' | '1_hour' | '1_day';
  completedAt?: string;
  createdAt?: string;
}

export interface AppSettings {
  businessName: string;
  ownerName: string;
  phone: string;
  email?: string;
  location: string;
  currency: string;
  lowStockThresholdDefault?: number;
  receiptFooter?: string;
  autoAddLowStockToShoppingList?: boolean;
  defaultPriorityLabelId?: string;
  googleCalendarConnected?: boolean;
  googleAccountEmail?: string;
  googleClientId?: string;
}

export type BusinessSettings = AppSettings;

export type UserRole = 'admin' | 'manager' | 'cashier' | 'clerk';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  phone?: string;
  pin?: string;
  storeLocation?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: UserRole;
  loginTimestamp: string;
  lastActiveTimestamp: string;
  deviceInfo: string;
  ipAddress?: string;
  isLocked: boolean;
  idleTimeoutMinutes: number; // 0 = disabled, 5, 15, 30, 60
  autoLockEnabled: boolean;
}

export interface SessionLog {
  id: string;
  timestamp: string;
  action: 'LOGIN' | 'LOGOUT' | 'LOCK' | 'UNLOCK' | 'ROLE_SWITCH' | 'ACCOUNT_CREATED';
  userName: string;
  userEmail: string;
  role: UserRole;
  details: string;
}

export interface UserRolePermissions {
  canAddProduct: boolean;
  canEditProduct: boolean;
  canDeleteProduct: boolean;
  canManageCart: boolean;
  canEditSettings: boolean;
  canResetDatabase: boolean;
  canManageProducts: boolean;
  canProcessSales: boolean;
  canRecordPurchases: boolean;
  canManageCustomers: boolean;
  canManageSuppliers: boolean;
  canExportExcel: boolean;
}

export interface AppDatabase {
  products: Product[];
  categories: string[];
  suppliers: Supplier[];
  priorityLabels: PriorityLabel[];
  customers: Customer[];
  followUps: FollowUp[];
  shoppingList: ShoppingListItem[];
  shoppingHistory: ShoppingHistoryItem[];
  sales: Sale[];
  purchases: Purchase[];
  stockMovements: StockMovement[];
  settings: AppSettings;
}

