import { api } from '../api/api';
import { authStorage } from './authStorage';

export const loginWithPhonePassword = async (phone: string, pin: string) => {
  const res = await api.post('/auth/login', {
    phone,
    password: pin,
    pin,
    // Cafe and retail accounts are separate; the server looks up the cafe one
    app: 'cafe',
  });
  if (res.data?.token) {
    await authStorage.saveToken(res.data.token);
    await authStorage.saveUser(res.data.user);
  }
  return res.data;
};

export const getCurrentUser = async () => {
  const res = await api.get('/auth/me');
  if (res.data?.user) {
    await authStorage.saveUser(res.data.user);
    return res.data.user;
  }
  return null;
};

export const logout = async () => {
  await authStorage.removeToken();
  await authStorage.removeUser();
};
