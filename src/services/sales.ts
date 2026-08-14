import { supabase } from "@/lib/supabase/client";
import type { CreateSaleInput, Sale } from "@/types/sale";

export async function getSales() {
  return supabase
    .from("sales")
    .select("*")
    .order("created_at", {
      ascending: false,
    });
}

export async function getRecentSales(limit = 5) {
  return supabase
    .from("sales")
    .select("*")
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);
}

export async function createSale(
  input: CreateSaleInput
): Promise<{
  data: Sale | null;
  error: Error | null;
}> {
  const totalAmount =
    input.quantity * input.unit_price;

  // 1. Create the sale.
  const { data: sale, error: saleError } =
    await supabase
      .from("sales")
      .insert([
        {
          customer_name: input.customer_name,
          product_name: input.product_name,
          quantity: input.quantity,
          unit_price: input.unit_price,
          total_amount: totalAmount,
          payment_method: input.payment_method,
        },
      ])
      .select()
      .single();

  if (saleError) {
    return {
      data: null,
      error: new Error(saleError.message),
    };
  }

  // 2. Deduct the finished product from inventory.
  const { error: inventoryError } =
    await supabase.rpc("deduct_product_inventory", {
      product: input.product_name,
      qty: input.quantity,
    });

  if (inventoryError) {
    console.error(
      "Inventory deduction failed:",
      inventoryError
    );

    // Remove the sale because inventory could not
    // be successfully deducted.
    await supabase
      .from("sales")
      .delete()
      .eq("id", sale.id);

    return {
      data: null,
      error: new Error(
        `Sale was not completed because inventory could not be deducted: ${inventoryError.message}`
      ),
    };
  }

  // 3. Create the invoice.
  const invoiceNumber = `INV-${Date.now()}`;

  const { error: invoiceError } = await supabase
    .from("invoices")
    .insert([
      {
        invoice_number: invoiceNumber,
        customer_name: input.customer_name,
        product_name: input.product_name,
        quantity: input.quantity,
        unit_price: input.unit_price,
        total_amount: totalAmount,
        payment_method: input.payment_method,
      },
    ]);

  if (invoiceError) {
    console.error(
      "Invoice creation failed:",
      invoiceError
    );

    // Remove the sale because the invoice could
    // not be created.
    await supabase
      .from("sales")
      .delete()
      .eq("id", sale.id);

    return {
      data: null,
      error: new Error(
        `Sale was not completed because the invoice could not be created: ${invoiceError.message}`
      ),
    };
  }

  return {
    data: sale as Sale,
    error: null,
  };
}