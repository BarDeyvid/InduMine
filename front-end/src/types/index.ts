// API Response Types based on OpenAPI spec

export interface CategorySummary {
  name: string;
  slug: string;
  item_quantity: number;
  description?: string;
}

export interface ProductItemResponse {
  product_code: string;
  image: string | null;
  url: string | null;
  specifications: Record<string, unknown>;
}

export interface Product {
  id: string;
  product_code: string;
  name: string;
  description: string;
  photo: string | null;
  url?: string | null;
  status: 'active' | 'inactive' | 'revision';
  main_specs: Record<string, string | number | null>;
  dimension_specs: Record<string, string | number | null>;
  category_slug: string;
  related_products?: Product[];
  variants?: ProductVariant[];
  history?: ProductHistoryEntry[];
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  specs: Record<string, string | number>;
}

export interface ProductHistoryEntry {
  id: string;
  date: string;
  action: string;
  user: string;
}

export interface RecentProduct {
  id: string;
  product_code: string;
  name: string;
  photo: string | null;
  category_slug: string;
  viewedAt: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  allowed_categories: string[];
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}
