import {
  AppDatabase,
  Product,
  Sale,
  Purchase,
  Customer,
  Supplier,
  FollowUp,
  ShoppingListItem,
  ShoppingHistoryItem,
  AppSettings,
} from '../types';

export interface HealthCheckResponse {
  status: string;
  connected: boolean;
  serverTime: string;
  lastUpdated: string;
  metrics: {
    productsCount: number;
    salesCount: number;
    purchasesCount: number;
    customersCount: number;
    followUpsCount: number;
    shoppingListCount: number;
  };
}

const TOKEN_KEY = 'kangi_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Fired whenever a request comes back 401 (expired/invalid session), so the app can force a re-login. */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  // Only treat a 401 as an expired session if we actually sent a token.
  if (response.status === 401 && token) {
    setAuthToken(null);
    onUnauthorized?.();
  }
  return response;
}

/**
 * Frontend REST API client for KANGI Stock Manager backend database (Express + SQLite)
 */
export const DatabaseAPI = {
  /**
   * Checks connection health with backend database (no auth required)
   */
  async checkHealth(): Promise<{ ok: boolean; data?: HealthCheckResponse; latencyMs?: number }> {
    const start = performance.now();
    try {
      const response = await fetch('/api/health', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-cache',
      });
      const latencyMs = Math.round(performance.now() - start);
      if (!response.ok) return { ok: false, latencyMs };
      const data = await response.json();
      return { ok: true, data, latencyMs };
    } catch (err) {
      return { ok: false, latencyMs: Math.round(performance.now() - start) };
    }
  },

  /**
   * Fetches complete database from backend persistent storage
   */
  async fetchFullDatabase(): Promise<{ success: boolean; data?: AppDatabase; error?: string }> {
    try {
      const response = await authedFetch('/api/database', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-cache',
      });
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      const res = await response.json();
      return { success: true, data: res.data };
    } catch (err: any) {
      console.warn('Backend database fetch failed, falling back to local state:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Persists entire database state to backend storage
   */
  async saveFullDatabase(db: AppDatabase): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await authedFetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(db),
      });
      if (!response.ok) {
        throw new Error(`Server error saving database: ${response.statusText}`);
      }
      return { success: true };
    } catch (err: any) {
      console.warn('Backend database save error:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Adds a product to inventory
   */
  async addProduct(product: Omit<Product, 'id'>): Promise<Product | null> {
    try {
      const response = await authedFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (response.ok) {
        const res = await response.json();
        return res.data;
      }
    } catch (e) {
      console.error('Failed to add product to backend:', e);
    }
    return null;
  },

  /**
   * Adjusts stock for a product
   */
  async adjustStock(productId: string, newStock: number, reason: string): Promise<Product | null> {
    try {
      const response = await authedFetch(`/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStock, reason }),
      });
      if (response.ok) {
        const res = await response.json();
        return res.data;
      }
    } catch (e) {
      console.error('Failed to adjust stock on backend:', e);
    }
    return null;
  },

  /**
   * Records a sale transaction
   */
  async recordSale(sale: Omit<Sale, 'id'>): Promise<Sale | null> {
    try {
      const response = await authedFetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale),
      });
      if (response.ok) {
        const res = await response.json();
        return res.data;
      }
    } catch (e) {
      console.error('Failed to record sale on backend:', e);
    }
    return null;
  },

  /**
   * Records a purchase restocking transaction
   */
  async recordPurchase(purchase: Omit<Purchase, 'id'>): Promise<Purchase | null> {
    try {
      const response = await authedFetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchase),
      });
      if (response.ok) {
        const res = await response.json();
        return res.data;
      }
    } catch (e) {
      console.error('Failed to record purchase on backend:', e);
    }
    return null;
  },

  /**
   * Atomically converts shopping item to inventory purchase
   */
  async confirmShoppingPurchase(payload: {
    item: ShoppingListItem;
    actualQuantity: number;
    actualPrice: number;
    supplierId: string;
    invoiceNumber: string;
    notes?: string;
  }) {
    try {
      const response = await authedFetch('/api/shopping-list/confirm-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error('Failed to confirm shopping purchase on backend:', e);
    }
    return null;
  },

  /**
   * Completes a customer follow-up
   */
  async completeFollowUp(followUpId: string, outcome: string, notes?: string): Promise<FollowUp | null> {
    try {
      const response = await authedFetch(`/api/follow-ups/${followUpId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, completionNotes: notes }),
      });
      if (response.ok) {
        const res = await response.json();
        return res.data;
      }
    } catch (e) {
      console.error('Failed to complete follow-up on backend:', e);
    }
    return null;
  },

  /**
   * Resets database to default Kenya hardware dataset
   */
  async resetDemoDatabase(): Promise<AppDatabase | null> {
    try {
      const response = await authedFetch('/api/reset-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const res = await response.json();
        return res.data;
      }
    } catch (e) {
      console.error('Failed to reset demo database:', e);
    }
    return null;
  },
};
