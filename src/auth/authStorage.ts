import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'retelflow_cafe_auth_token';
const USER_KEY = 'retelflow_cafe_auth_user';

let memoryToken: string | null = null;
let memoryUser: string | null = null;

const sessionExpiredListeners: Array<() => void> = [];

export const onSessionExpired = (cb: () => void) => {
  sessionExpiredListeners.push(cb);
  return () => {
    const idx = sessionExpiredListeners.indexOf(cb);
    if (idx !== -1) sessionExpiredListeners.splice(idx, 1);
  };
};

export const triggerSessionExpired = () => {
  sessionExpiredListeners.forEach((cb) => cb());
};

export const authStorage = {
  async saveToken(token: string): Promise<void> {
    memoryToken = token;
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch {}
  },

  async getToken(): Promise<string | null> {
    if (memoryToken) return memoryToken;
    try {
      if (Platform.OS === 'web') {
        memoryToken = localStorage.getItem(TOKEN_KEY);
      } else {
        memoryToken = await SecureStore.getItemAsync(TOKEN_KEY);
      }
      return memoryToken;
    } catch {
      return null;
    }
  },

  async removeToken(): Promise<void> {
    memoryToken = null;
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch {}
  },

  async saveUser(user: any): Promise<void> {
    const serialized = JSON.stringify(user);
    memoryUser = serialized;
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(USER_KEY, serialized);
      } else {
        await SecureStore.setItemAsync(USER_KEY, serialized);
      }
    } catch {}
  },

  async getUser(): Promise<any | null> {
    try {
      let raw = memoryUser;
      if (!raw) {
        if (Platform.OS === 'web') {
          raw = localStorage.getItem(USER_KEY);
        } else {
          raw = await SecureStore.getItemAsync(USER_KEY);
        }
      }
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async removeUser(): Promise<void> {
    memoryUser = null;
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(USER_KEY);
      } else {
        await SecureStore.deleteItemAsync(USER_KEY);
      }
    } catch {}
  },
};
