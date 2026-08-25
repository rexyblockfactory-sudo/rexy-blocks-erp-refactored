import { supabase } from "@/lib/supabase/client";
import type { Sale } from "@/types/sale";

export interface ReceivableSummary {
  totalSales: number;
  totalPaid: number;
  totalOutstanding: number;
  unpaidCount: number;
  partiallyPaidCount: number;
}

function calculateSaleAmounts(sale: Sale) {
  const total = Number(sale.total_amount || 0);
  const paid = Number(sale.amount_paid || 0);

  /*
   * Some older sales have:
   *
   * amount_paid = 0
   * balance_due = 0
   *
   * even though they were never paid.
   *
   * For receivables we therefore calculate the
   * effective balance from total - paid.
   */
  let balance = total - paid;

  if (balance < 0) {
    balance = 0;
  }

  if (Math.abs(balance) < 0.005) {
    balance = 0;
  }

  return {
    total,
    paid,
    balance,
  };
}

export async function getOutstandingReceivables(): Promise<{
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
      "Receivables loading error:",
      error
    );

    return {
      data: null,
      error: new Error(error.message),
    };
  }

  /*
   * Calculate the effective balance in JavaScript
   * rather than trusting historical balance_due values.
   */
  const outstandingSales = (data || [])
    .map((sale) => {
      const amounts = calculateSaleAmounts(
        sale as Sale
      );

      return {
        ...(sale as Sale),
        amount_paid: amounts.paid,
        balance_due: amounts.balance,
      };
    })
    .filter(
      (sale) => Number(sale.balance_due) > 0
    );

  return {
    data: outstandingSales,
    error: null,
  };
}

export async function getReceivableSummary(): Promise<{
  data: ReceivableSummary | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("sales")
    .select(
      "total_amount, amount_paid, balance_due"
    );

  if (error) {
    console.error(
      "Receivable summary error:",
      error
    );

    return {
      data: null,
      error: new Error(error.message),
    };
  }

  const rows = data || [];

  let totalSales = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;

  let unpaidCount = 0;
  let partiallyPaidCount = 0;

  rows.forEach((sale) => {
    const total = Number(
      sale.total_amount || 0
    );

    const paid = Number(
      sale.amount_paid || 0
    );

    /*
     * IMPORTANT:
     *
     * Do not trust balance_due for old historical
     * records because some old rows have:
     *
     * amount_paid = 0
     * balance_due = 0
     *
     * Calculate it instead.
     */
    let balance = total - paid;

    if (balance < 0) {
      balance = 0;
    }

    if (Math.abs(balance) < 0.005) {
      balance = 0;
    }

    totalSales += total;
    totalPaid += paid;
    totalOutstanding += balance;

    if (balance > 0 && paid <= 0) {
      unpaidCount++;
    }

    if (balance > 0 && paid > 0) {
      partiallyPaidCount++;
    }
  });

  return {
    data: {
      totalSales,
      totalPaid,
      totalOutstanding,
      unpaidCount,
      partiallyPaidCount,
    },
    error: null,
  };
}