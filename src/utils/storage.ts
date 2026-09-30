import {
  Product,
  StockMovement,
  Sale,
  Purchase,
  PriorityLabel,
  ShoppingListItem,
  ShoppingHistoryItem,
  Supplier,
  Customer,
  FollowUp,
  AppSettings,
  StockMovementType,
} from '../types';
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
} from '../data/seedData';
import { getTodayString } from './formatters';

const STORAGE_KEYS = {
  PRODUCTS: 'kangi_products_v1',
  SUPPLIERS: 'kangi_suppliers_v1',
  LABELS: 'kangi_priority_labels_v1',
  CUSTOMERS: 'kangi_customers_v1',
  FOLLOW_UPS: 'kangi_follow_ups_v1',
  SHOPPING_LIST: 'kangi_shopping_list_v1',
  SHOPPING_HISTORY: 'kangi_shopping_history_v1',
  SALES: 'kangi_sales_v1',
  PURCHASES: 'kangi_purchases_v1',
  STOCK_MOVEMENTS: 'kangi_stock_movements_v1',
  SETTINGS: 'kangi_settings_v1',
  CATEGORIES: 'kangi_categories_v1',
};

const DEFAULT_CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Tools & Accessories',
  'Hardware',
  'Lighting',
  'Cables',
  'Paint & Building',
];

// Generic localStorage helper
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
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

export function loadInitialDatabase(): AppDatabase {
  return {
    products: loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS),
    categories: loadFromStorage<string[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES),
    suppliers: loadFromStorage<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS),
    priorityLabels: loadFromStorage<PriorityLabel[]>(STORAGE_KEYS.LABELS, INITIAL_PRIORITY_LABELS),
    customers: loadFromStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS),
    followUps: loadFromStorage<FollowUp[]>(STORAGE_KEYS.FOLLOW_UPS, INITIAL_FOLLOW_UPS),
    shoppingList: loadFromStorage<ShoppingListItem[]>(STORAGE_KEYS.SHOPPING_LIST, INITIAL_SHOPPING_LIST),
    shoppingHistory: loadFromStorage<ShoppingHistoryItem[]>(STORAGE_KEYS.SHOPPING_HISTORY, INITIAL_SHOPPING_HISTORY),
    sales: loadFromStorage<Sale[]>(STORAGE_KEYS.SALES, INITIAL_SALES),
    purchases: loadFromStorage<Purchase[]>(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASES),
    stockMovements: loadFromStorage<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, INITIAL_STOCK_MOVEMENTS),
    settings: loadFromStorage<AppSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
  };
}

export const loadDatabase = loadInitialDatabase;

export function persistDatabase(db: AppDatabase): void {
  saveToStorage(STORAGE_KEYS.PRODUCTS, db.products);
  saveToStorage(STORAGE_KEYS.CATEGORIES, db.categories || DEFAULT_CATEGORIES);
  saveToStorage(STORAGE_KEYS.SUPPLIERS, db.suppliers);
  saveToStorage(STORAGE_KEYS.LABELS, db.priorityLabels);
  saveToStorage(STORAGE_KEYS.CUSTOMERS, db.customers);
  saveToStorage(STORAGE_KEYS.FOLLOW_UPS, db.followUps);
  saveToStorage(STORAGE_KEYS.SHOPPING_LIST, db.shoppingList);
  saveToStorage(STORAGE_KEYS.SHOPPING_HISTORY, db.shoppingHistory);
  saveToStorage(STORAGE_KEYS.SALES, db.sales);
  saveToStorage(STORAGE_KEYS.PURCHASES, db.purchases);
  saveToStorage(STORAGE_KEYS.STOCK_MOVEMENTS, db.stockMovements);
  saveToStorage(STORAGE_KEYS.SETTINGS, db.settings);
}

export const saveDatabase = persistDatabase;

export function resetDatabaseToDefaults(): AppDatabase {
  const defaultDb: AppDatabase = {
    products: INITIAL_PRODUCTS,
    categories: DEFAULT_CATEGORIES,
    suppliers: INITIAL_SUPPLIERS,
    priorityLabels: INITIAL_PRIORITY_LABELS,
    customers: INITIAL_CUSTOMERS,
    followUps: INITIAL_FOLLOW_UPS,
    shoppingList: INITIAL_SHOPPING_LIST,
    shoppingHistory: INITIAL_SHOPPING_HISTORY,
    sales: INITIAL_SALES,
    purchases: INITIAL_PURCHASES,
    stockMovements: INITIAL_STOCK_MOVEMENTS,
    settings: INITIAL_SETTINGS,
  };
  persistDatabase(defaultDb);
  return defaultDb;
}

export const resetDatabaseWithDemoData = resetDatabaseToDefaults;

export function exportDatabaseJSON(): string {
  const currentDb = loadInitialDatabase();
  return JSON.stringify(currentDb, null, 2);
}

export function importDatabaseJSON(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.sales)) {
      persistDatabase(parsed);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to import database:', err);
    return false;
  }
}
