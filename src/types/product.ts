export interface Product {
  id: string;
  name: string;
  category: string;
  size: string;
  price: number;
  created_at: string;
}

export interface CreateProductInput {
  name: string;
  category: string;
  size: string;
  price: number;
}