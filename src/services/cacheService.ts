import * as FileSystem from 'expo-file-system/legacy';
import { MenuItem } from '../types';
import { fetchStoreMenuApi } from '../api/cafeApi';

const MEMORY_CACHE = new Map<string, any>();
const CACHE_KEYS = ['menu', 'orders', 'customers', 'metrics', 'config'];

// Helper to write to file system safely (data may already be a JSON string)
const writeToFile = async (filename: string, data: any) => {
  try {
    const path = `${FileSystem.documentDirectory}${filename}.json`;
    await FileSystem.writeAsStringAsync(path, typeof data === 'string' ? data : JSON.stringify(data));
  } catch (e) {
    // If native FileSystem is unavailable (e.g. web), silent fallback to memory
  }
};

// Helper to read from file system safely
const readFromFile = async (filename: string): Promise<any | null> => {
  try {
    const path = `${FileSystem.documentDirectory}${filename}.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(path);
      return JSON.parse(content);
    }
  } catch (e) {
    // Silent fallback
  }
  return null;
};

// 1. Initializer: Loads all cached files into memory on app launch.
// Runs once; every caller awaits the same promise, so screens never read the
// cache before the disk copy is in memory.
let cacheReady: Promise<void> | null = null;

export const initCache = (): Promise<void> => {
  if (!cacheReady) {
    cacheReady = Promise.all(
      CACHE_KEYS.map(async (key) => {
        const data = await readFromFile(key);
        if (data) MEMORY_CACHE.set(key, data);
      })
    )
      .then(() => {
        const menu = MEMORY_CACHE.get('menu');
        if (menu) menuSignature = JSON.stringify(menu);
      })
      .catch((e) => console.warn('[CacheService] initCache error:', e));
  }
  return cacheReady;
};

/** Wipes memory + disk cache (on logout, so the next shop never sees this one's data). */
export const clearCache = async () => {
  MEMORY_CACHE.clear();
  menuSignature = null;
  await Promise.all(
    CACHE_KEYS.map((key) =>
      FileSystem.deleteAsync(`${FileSystem.documentDirectory}${key}.json`, { idempotent: true }).catch(
        () => {}
      )
    )
  );
};

// ======================== MENU CACHE ========================
type MenuListener = (items: MenuItem[]) => void;
const menuListeners = new Set<MenuListener>();
let menuSignature: string | null = null;
let menuSyncInFlight: Promise<boolean> | null = null;

export const getCachedMenu = (): MenuItem[] => {
  return MEMORY_CACHE.get('menu') || [];
};

/** Live updates whenever the cached menu actually changes. Returns unsubscribe. */
export const subscribeMenu = (listener: MenuListener) => {
  menuListeners.add(listener);
  return () => {
    menuListeners.delete(listener);
  };
};

/**
 * Stores the menu only if it differs from what is cached. Returns true when
 * something changed (memory + disk updated and subscribers notified).
 */
export const setCachedMenu = (items: MenuItem[]): boolean => {
  if (!items || items.length === 0) return false;
  const signature = JSON.stringify(items);
  if (signature === menuSignature) return false;

  menuSignature = signature;
  MEMORY_CACHE.set('menu', items);
  writeToFile('menu', signature);
  menuListeners.forEach((listener) => listener(items));
  return true;
};

/**
 * Background menu sync: fetches the store menu and updates the cache only when
 * it differs. Concurrent calls share one request. A failed request leaves the
 * cache untouched (never replaced with demo defaults).
 */
export const syncMenu = (): Promise<boolean> => {
  if (!menuSyncInFlight) {
    menuSyncInFlight = (async () => {
      await initCache();
      const fresh = await fetchStoreMenuApi();
      return fresh ? setCachedMenu(fresh) : false;
    })()
      .catch(() => false)
      .finally(() => {
        menuSyncInFlight = null;
      });
  }
  return menuSyncInFlight;
};

// ======================== ORDERS CACHE ========================
export const getCachedOrders = (): any[] => {
  return MEMORY_CACHE.get('orders') || [];
};

export const setCachedOrders = (orders: any[]) => {
  if (!orders) return;
  MEMORY_CACHE.set('orders', orders);
  writeToFile('orders', orders);
};

// ======================== CUSTOMERS CACHE ========================
export const getCachedCustomers = (): any[] => {
  return MEMORY_CACHE.get('customers') || [];
};

export const setCachedCustomers = (customers: any[]) => {
  if (!customers) return;
  MEMORY_CACHE.set('customers', customers);
  writeToFile('customers', customers);
};

// ======================== METRICS / SALES CACHE ========================
export interface CafeMetricsCache {
  todaySales: number;
  totalOrders: number;
  totalDue: number;
  lastUpdated: string;
}

export const getCachedMetrics = (): CafeMetricsCache | null => {
  return MEMORY_CACHE.get('metrics') || null;
};

export const setCachedMetrics = (metrics: CafeMetricsCache) => {
  MEMORY_CACHE.set('metrics', metrics);
  writeToFile('metrics', metrics);
};

// ======================== CONFIG & BRANDING CACHE ========================
export interface CafeAppConfig {
  helpPhone?: string;
  whatsappPhone?: string;
  helpEmail?: string;
  logoUrl?: string;
  splashUrl?: string;
}

export const getCachedConfig = (): CafeAppConfig | null => {
  return MEMORY_CACHE.get('config') || null;
};

export const setCachedConfig = (config: CafeAppConfig) => {
  MEMORY_CACHE.set('config', config);
  writeToFile('config', config);
};
