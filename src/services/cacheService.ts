import * as FileSystem from 'expo-file-system/legacy';
import { MenuItem } from '../types';

const MEMORY_CACHE = new Map<string, any>();

// Helper to write to file system safely
const writeToFile = async (filename: string, data: any) => {
  try {
    const path = `${FileSystem.documentDirectory}${filename}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data));
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

// 1. Initializer: Loads all cached files into memory on app launch
export const initCache = async () => {
  try {
    const keys = ['menu', 'orders', 'customers', 'metrics', 'config'];
    for (const key of keys) {
      const data = await readFromFile(key);
      if (data) {
        MEMORY_CACHE.set(key, data);
      }
    }
  } catch (e) {
    console.warn('[CacheService] initCache error:', e);
  }
};

// ======================== MENU CACHE ========================
export const getCachedMenu = (): MenuItem[] => {
  return MEMORY_CACHE.get('menu') || [];
};

export const setCachedMenu = (items: MenuItem[]) => {
  if (!items || items.length === 0) return;
  MEMORY_CACHE.set('menu', items);
  writeToFile('menu', items);
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
