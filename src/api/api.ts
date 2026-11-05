declare const process: any;
declare const __DEV__: boolean;
import axios from 'axios';
import { Platform, NativeModules } from 'react-native';
import { authStorage, triggerSessionExpired } from '../auth/authStorage';

const getHostFromConstants = (): string | null => {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {}

  try {
    const Constants = require('expo-constants');
    const config = Constants.default || Constants;
    const hostUri =
      config.expoConfig?.hostUri ||
      config.manifest2?.extra?.expoClient?.hostUri ||
      config.manifest2?.extra?.expoGo?.debuggerHost ||
      config.manifest?.debuggerHost;
    if (hostUri) {
      return hostUri.split(':')[0];
    }
  } catch {}
  return null;
};

export const getBaseUrl = (): string => {
  const envUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  let base =
    envUrl && !envUrl.startsWith('${') && envUrl !== 'undefined'
      ? envUrl.replace(/\/+$/, '')
      : '';

  // 1. If not running in development, or if a valid non-localhost URL was provided -> use it
  if (base && !base.includes('localhost') && !base.includes('127.0.0.1')) {
    return base;
  }
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    return 'https://api.retelflow.in/api';
  }

  // 2. Web browser: if not on localhost, use production API
  if (Platform.OS === 'web') {
    if (
      typeof window !== 'undefined' &&
      window.location.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      return 'https://api.retelflow.in/api';
    }
    return base || 'http://localhost:5004/api';
  }

  // 3. Mobile in local development: check Metro bundler IP
  const host = getHostFromConstants();
  if (host) {
    return `http://${host}:5004/api`;
  }

  // 4. Default fallback on real devices / standalone APKs: production API
  return 'https://api.retelflow.in/api';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  if (!config.baseURL || config.baseURL.includes('localhost')) {
    config.baseURL = getBaseUrl();
  }
  const token = await authStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err?.response?.status === 401) {
      await authStorage.removeToken();
      await authStorage.removeUser();
      triggerSessionExpired();
    }
    return Promise.reject(err);
  }
);
