import { PrintSettings, ShopFeatures, StoreInfo } from '../types';

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperWidth: 58,
  storeNameSize: 'large',
  itemTextSize: 'normal',
  tokenSize: 'large',
  footerText: '',
  feedLines: 4,
};

export const DEFAULT_FOOTER = 'Thank you for dining with us!';

export function getPrintSettings(user: any): PrintSettings {
  const p = user?.printSettings || {};
  return {
    paperWidth: p.paperWidth === 80 ? 80 : 58,
    storeNameSize: ['normal', 'large', 'xlarge'].includes(p.storeNameSize) ? p.storeNameSize : 'large',
    itemTextSize: p.itemTextSize === 'large' ? 'large' : 'normal',
    tokenSize: p.tokenSize === 'normal' ? 'normal' : 'large',
    footerText: typeof p.footerText === 'string' ? p.footerText : '',
    feedLines: Math.min(10, Math.max(1, Number(p.feedLines) || 4)),
  };
}

export function getShopFeatures(user: any): ShopFeatures {
  return {
    reprintBills: user?.features?.reprintBills === true,
    khataStatement: user?.features?.khataStatement === true,
  };
}

export function getStoreInfo(user: any): StoreInfo {
  return {
    shopName: user?.shopName || user?.businessName || user?.name || 'RetelFlow Cafe',
    address: user?.address || '',
    phone: user?.phone || '',
    gstNumber: user?.gstNumber || '',
  };
}
