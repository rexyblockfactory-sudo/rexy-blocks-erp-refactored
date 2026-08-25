import { supabase } from "@/lib/supabase/client";
import type {
  CreateSaleInput,
  Sale,
} from "@/types/sale";

/**
 * Get all sales.
 */
export async function getSales(): Promise<{
  data: Sale[] | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "getSales error:",
      error
    );

    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data: (data ?? []) as Sale[],
    error: null,
  };
}

/**
 * Get a single sale by ID.
 */
export async function getSaleById(
  saleId: string
): Promise<{
  data: Sale | null;
  error: Error | null;
}> {
  if (!saleId?.trim()) {
    return {
      data: null,
      error: new Error(
        "Sale ID is required."
      ),
    };
  }

  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("id", saleId.trim())
    .single();

  if (error) {
    console.error(
      "getSaleById error:",
      error
    );

    return {
      data: null,
      error: new Error(error.message),
    };
  }

  if (!data) {
    return {
      data: null,
      error: new Error(
        `Sale "${saleId}" was not found.`
      ),
    };
  }

  return {
    data: data as Sale,
    error: null,
  };
}

/**
 * Create a sale.
 *
 * IMPORTANT:
 * This uses the UUID-based database function:
 *
 * create_sale_with_current_price(
 *   text,
 *   uuid,
 *   integer,
 *   text
 * )
 *
 * The database function is responsible for:
 * - current selling price
 * - finished-goods inventory
 * - production cost
 * - COGS
 * - gross profit
 * - gross margin
 * - payment amount
 * - customer balance
 * - invoice creation
 * - inventory deduction
 */
export async function createSale(
  input: CreateSaleInput
): Promise<{
  data: Sale | null;
  error: Error | null;
}> {
  // ------------------------------------------------------------
  // VALIDATION
  // ------------------------------------------------------------

  if (!input.customer_name?.trim()) {
    return {
      data: null,
      error: new Error(
        "Customer name is required."
      ),
    };
  }

  if (!input.product_id) {
    return {
      data: null,
      error: new Error(
        "Product is required."
      ),
    };
  }

  if (
    !Number.isInteger(input.quantity) ||
    input.quantity <= 0
  ) {
    return {
      data: null,
      error: new Error(
        "Quantity must be a positive whole number."
      ),
    };
  }

  if (!input.payment_method?.trim()) {
    return {
      data: null,
      error: new Error(
        "Payment method is required."
      ),
    };
  }

  // ------------------------------------------------------------
  // DATABASE TRANSACTION
  //
  // DO NOT change these parameter names.
  //
  // The active PostgreSQL function is:
  //
  // create_sale_with_current_price(
  //   text,
  //   uuid,
  //   integer,
  //   text
  // )
  // ------------------------------------------------------------

  const {
    data,
    error,
  } = await supabase.rpc(
    "create_sale_with_current_price",
    {
      p_customer_name:
        input.customer_name.trim(),

      p_product_id:
        input.product_id,

      p_quantity:
        input.quantity,

      p_payment_method:
        input.payment_method.trim(),
    }
  );

  // ------------------------------------------------------------
  // DATABASE ERROR
  // ------------------------------------------------------------

  if (error) {
    console.error(
      "create_sale_with_current_price error:",
      error
    );

    return {
      data: null,
      error: new Error(
        error.message
      ),
    };
  }

  // ------------------------------------------------------------
  // NO SALE RETURNED
  // ------------------------------------------------------------

  if (!data) {
    return {
      data: null,
      error: new Error(
        "Sale was created, but no sale record was returned."
      ),
    };
  }

  // ------------------------------------------------------------
  // SUCCESS
  // ------------------------------------------------------------

  return {
    data: data as Sale,
    error: null,
  };
}

/**
 * Record an additional payment against an existing sale.
 *
 * This uses the PostgreSQL function:
 *
 * record_sale_payment(
 *   uuid,
 *   numeric,
 *   text,
 *   text,
 *   text
 * )
 */
export async function recordSalePayment(
  saleId: string,
  amount: number,
  paymentMethod: string,
  reference?: string | null,
  notes?: string | null
): Promise<{
  data: Sale | null;
  error: Error | null;
}> {
  // ------------------------------------------------------------
  // VALIDATION
  // ------------------------------------------------------------

  if (!saleId?.trim()) {
    return {
      data: null,
      error: new Error(
        "Sale ID is required."
      ),
    };
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return {
      data: null,
      error: new Error(
        "Payment amount must be greater than zero."
      ),
    };
  }

  if (!paymentMethod?.trim()) {
    return {
      data: null,
      error: new Error(
        "Payment method is required."
      ),
    };
  }

  // ------------------------------------------------------------
  // RECORD PAYMENT
  // ------------------------------------------------------------

  const {
    data,
    error,
  } = await supabase.rpc(
    "record_sale_payment",
    {
      p_sale_id:
        saleId.trim(),

      p_amount:
        amount,

      p_payment_method:
        paymentMethod.trim(),

      p_reference:
        reference?.trim() || null,

      p_notes:
        notes?.trim() || null,
    }
  );

  // ------------------------------------------------------------
  // ERROR
  // ------------------------------------------------------------

  if (error) {
    console.error(
      "record_sale_payment error:",
      error
    );

    return {
      data: null,
      error: new Error(
        error.message
      ),
    };
  }

  // ------------------------------------------------------------
  // NO DATA
  // ------------------------------------------------------------

  if (!data) {
    return {
      data: null,
      error: new Error(
        "Payment was recorded, but no updated sale was returned."
      ),
    };
  }

  return {
    data: data as Sale,
    error: null,
  };
}

/**
 * Delete a sale.
 *
 * Use this only if the database permissions allow it.
 */
export async function deleteSale(
  saleId: string
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  if (!saleId?.trim()) {
    return {
      success: false,
      error: new Error(
        "Sale ID is required."
      ),
    };
  }

  const { error } = await supabase
    .from("sales")
    .delete()
    .eq("id", saleId.trim());

  if (error) {
    console.error(
      "deleteSale error:",
      error
    );

    return {
      success: false,
      error: new Error(error.message),
    };
  }

  return {
    success: true,
    error: null,
  };
}