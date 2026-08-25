import { supabase } from "@/lib/supabase/client";
import type { FinancialSummary } from "@/types/financials";

export interface FinancialDateRange {
  startDate?: string;
  endDate?: string;
}

export async function getFinancialSummary(
  range: FinancialDateRange = {}
): Promise<{
  data: FinancialSummary | null;
  error: Error | null;
}> {
  try {
    let salesQuery = supabase
      .from("sales")
      .select(`
        total_amount,
        amount_paid,
        balance_due,
        cogs,
        gross_profit,
        created_at
      `);

    let expensesQuery = supabase
      .from("expenses")
      .select(`
        amount,
        created_at
      `);

    let paymentsQuery = supabase
      .from("sale_payments")
      .select(`
        amount,
        created_at
      `);

    if (range.startDate) {
      salesQuery = salesQuery.gte(
        "created_at",
        `${range.startDate}T00:00:00`
      );

      expensesQuery = expensesQuery.gte(
        "created_at",
        `${range.startDate}T00:00:00`
      );

      paymentsQuery = paymentsQuery.gte(
        "created_at",
        `${range.startDate}T00:00:00`
      );
    }

    if (range.endDate) {
      salesQuery = salesQuery.lt(
        "created_at",
        `${range.endDate}T00:00:00`
      );

      expensesQuery = expensesQuery.lt(
        "created_at",
        `${range.endDate}T00:00:00`
      );

      paymentsQuery = paymentsQuery.lt(
        "created_at",
        `${range.endDate}T00:00:00`
      );
    }

    const [
      salesResult,
      expensesResult,
      paymentsResult,
      receivablesResult,
      finishedGoodsResult,
    ] = await Promise.all([
      salesQuery,

      expensesQuery,

      paymentsQuery,

      // Receivables are a CURRENT position, not
      // a historical period transaction.
      supabase
        .from("sales")
        .select("balance_due"),

      // Finished goods are also a CURRENT stock
      // position, not a period transaction total.
      supabase
        .from("finished_goods_inventory")
        .select(`
          quantity,
          costed_quantity,
          total_cost
        `),
    ]);

    if (salesResult.error) {
      throw new Error(
        `Sales: ${salesResult.error.message}`
      );
    }

    if (expensesResult.error) {
      throw new Error(
        `Expenses: ${expensesResult.error.message}`
      );
    }

    if (paymentsResult.error) {
      throw new Error(
        `Payments: ${paymentsResult.error.message}`
      );
    }

    if (receivablesResult.error) {
      throw new Error(
        `Receivables: ${receivablesResult.error.message}`
      );
    }

    if (finishedGoodsResult.error) {
      throw new Error(
        `Finished goods: ${finishedGoodsResult.error.message}`
      );
    }

    const sales = salesResult.data ?? [];
    const expenses = expensesResult.data ?? [];
    const payments = paymentsResult.data ?? [];
    const receivables =
      receivablesResult.data ?? [];
    const finishedGoods =
      finishedGoodsResult.data ?? [];

    const totalRevenue = sales.reduce(
      (sum, sale) =>
        sum + Number(sale.total_amount ?? 0),
      0
    );

    const totalCogs = sales.reduce(
      (sum, sale) =>
        sum + Number(sale.cogs ?? 0),
      0
    );

    const totalGrossProfit = sales.reduce(
      (sum, sale) =>
        sum + Number(sale.gross_profit ?? 0),
      0
    );

    const totalExpenses = expenses.reduce(
      (sum, expense) =>
        sum + Number(expense.amount ?? 0),
      0
    );

    // Payments are filtered by the date they were
    // actually recorded.
    const totalPaid = payments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount ?? 0),
      0
    );

    // Outstanding receivables are always the
    // current outstanding customer balance.
    const totalReceivable =
      receivables.reduce(
        (sum, sale) =>
          sum + Number(sale.balance_due ?? 0),
        0
      );

    const totalFinishedGoods =
      finishedGoods.reduce(
        (sum, item) =>
          sum + Number(item.quantity ?? 0),
        0
      );

    const costedFinishedGoods =
      finishedGoods.reduce(
        (sum, item) =>
          sum +
          Number(item.costed_quantity ?? 0),
        0
      );

    const finishedGoodsValue =
      finishedGoods.reduce(
        (sum, item) =>
          sum + Number(item.total_cost ?? 0),
        0
      );

    const salesWithKnownCost =
      sales.filter(
        (sale) =>
          Number(sale.cogs ?? 0) > 0
      ).length;

    const salesWithUnknownCost =
      sales.filter(
        (sale) =>
          Number(sale.cogs ?? 0) === 0
      ).length;

    const knownNetProfit =
      totalGrossProfit -
      totalExpenses;

    return {
      data: {
        totalRevenue,
        totalPaid,
        totalReceivable,
        totalCogs,
        totalGrossProfit,
        totalExpenses,
        knownNetProfit,

        totalFinishedGoods,
        costedFinishedGoods,
        finishedGoodsValue,

        salesWithKnownCost,
        salesWithUnknownCost,
      },

      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error(
              "Failed to load financial summary."
            ),
    };
  }
}