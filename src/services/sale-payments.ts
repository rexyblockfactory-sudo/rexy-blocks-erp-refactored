import { supabase } from "@/lib/supabase/client";

export type SalePayment = {
  id: string;
  sale_id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

/**
 * Get all payments for a specific sale.
 */
export async function getSalePayments(
  saleId: string
): Promise<{
  data: SalePayment[] | null;
  error: Error | null;
}> {
  if (!saleId?.trim()) {
    return {
      data: null,
      error: new Error("Sale ID is required."),
    };
  }

  const { data, error } = await supabase
    .from("sale_payments")
    .select("*")
    .eq("sale_id", saleId.trim())
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "getSalePayments error:",
      error
    );

    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data: (data ?? []) as SalePayment[],
    error: null,
  };
}

/**
 * Record a payment against an existing sale.
 */
export async function createSalePayment(
  saleId: string,
  amount: number,
  paymentMethod: string,
  reference?: string | null,
  notes?: string | null
): Promise<{
  data: unknown | null;
  error: Error | null;
}> {
  if (!saleId?.trim()) {
    return {
      data: null,
      error: new Error("Sale ID is required."),
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

  const { data, error } =
    await supabase.rpc(
      "record_sale_payment",
      {
        p_sale_id: saleId.trim(),
        p_amount: amount,
        p_payment_method:
          paymentMethod.trim(),
        p_reference:
          reference?.trim() || null,
        p_notes:
          notes?.trim() || null,
      }
    );

  if (error) {
    console.error(
      "record_sale_payment error:",
      error
    );

    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data,
    error: null,
  };
}