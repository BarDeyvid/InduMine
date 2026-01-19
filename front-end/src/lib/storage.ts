import { RecentProduct } from '@/types';

const RECENT_PRODUCTS_KEY = 'recentProducts';
const MAX_RECENT_PRODUCTS = 5;

export const getRecentProducts = (): RecentProduct[] => {
  try {
    const stored = localStorage.getItem(RECENT_PRODUCTS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const addRecentProduct = (product: Omit<RecentProduct, 'viewedAt'>): void => {
  try {
    const current = getRecentProducts();
    
    // Remove if already exists
    const filtered = current.filter(p => p.id !== product.id);
    
    // Add to beginning with timestamp
    const updated = [
      { ...product, viewedAt: new Date().toISOString() },
      ...filtered,
    ].slice(0, MAX_RECENT_PRODUCTS);
    
    localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving recent product:', error);
  }
};

export const clearRecentProducts = (): void => {
  localStorage.removeItem(RECENT_PRODUCTS_KEY);
};
