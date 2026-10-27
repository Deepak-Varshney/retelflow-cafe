export const DEFAULT_FOOD_PLACEHOLDER =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';

export const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
  'cold drinks': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80',
  drinks: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80',
  waffles: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=400&q=80',
  sweets: 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?auto=format&fit=crop&w=400&q=80',
  'sweets & mithai': 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?auto=format&fit=crop&w=400&q=80',
  burgers: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
  'burgers & fries': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
  snacks: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
  'snacks & chaat': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
  'chai & coffee': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=400&q=80',
  coffee: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=400&q=80',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
  'ice cream': 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=400&q=80',
  chinese: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=400&q=80',
  momos: 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?auto=format&fit=crop&w=400&q=80',
  'south indian': 'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=400&q=80',
};

/**
 * Returns a valid image URL for any food item.
 * If the provided imageUrl is empty or unavailable, returns a matching category or default food placeholder image.
 */
export const getFoodImageUrl = (imageUrl?: string, category?: string): string => {
  if (imageUrl && imageUrl.trim()) {
    return imageUrl.trim();
  }
  const cleanCategory = (category || '').toLowerCase().trim();
  for (const [key, url] of Object.entries(CATEGORY_PLACEHOLDERS)) {
    if (cleanCategory.includes(key) || key.includes(cleanCategory)) {
      return url;
    }
  }
  return DEFAULT_FOOD_PLACEHOLDER;
};
