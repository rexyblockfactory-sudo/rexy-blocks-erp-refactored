import { supabase } from "@/lib/supabase/client";
import type {
  CreateProductInput,
  Product,
} from "@/types/product";

export async function getProducts() {
  return supabase
    .from("products")
    .select("*")
    .order("name");
}

export async function getProductById(
  id: string
) {
  return supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
}

export async function createProduct(
  input: CreateProductInput
): Promise<{
  data: Product | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        name: input.name,
        category: input.category,
        size: input.size,
        price: input.price,
      },
    ])
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data: data as Product,
    error: null,
  };
}
