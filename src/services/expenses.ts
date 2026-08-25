import { supabase } from "@/lib/supabase/client";
import type {
  CreateExpenseInput,
  Expense,
  UpdateExpenseInput,
} from "@/types/expense";

export async function getExpenses(): Promise<{
  data: Expense[] | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data: (data || []) as Expense[],
    error: null,
  };
}

export async function createExpense(
  input: CreateExpenseInput
): Promise<{
  data: Expense | null;
  error: Error | null;
}> {
  if (!input.expense_name?.trim()) {
    return {
      data: null,
      error: new Error(
        "Expense name is required."
      ),
    };
  }

  if (!input.category?.trim()) {
    return {
      data: null,
      error: new Error(
        "Expense category is required."
      ),
    };
  }

  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0
  ) {
    return {
      data: null,
      error: new Error(
        "Expense amount must be greater than zero."
      ),
    };
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      expense_name:
        input.expense_name.trim(),

      category:
        input.category.trim(),

      amount: input.amount,

      notes:
        input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error(
      "createExpense error:",
      error
    );

    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return {
    data: data as Expense,
    error: null,
  };
}

export async function updateExpense(
  expenseId: string,
  input: UpdateExpenseInput
): Promise<{
  data: Expense | null;
  error: Error | null;
}> {
  if (!expenseId) {
    return {
      data: null,
      error: new Error(
        "Expense ID is required."
      ),
    };
  }

  if (!input.expense_name?.trim()) {
    return {
      data: null,
      error: new Error(
        "Expense name is required."
      ),
    };
  }

  if (!input.category?.trim()) {
    return {
      data: null,
      error: new Error(
        "Expense category is required."
      ),
    };
  }

  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0
  ) {
    return {
      data: null,
      error: new Error(
        "Expense amount must be greater than zero."
      ),
    };
  }

  const { data, error } = await supabase
    .from("expenses")
    .update({
      expense_name:
        input.expense_name.trim(),

      category:
        input.category.trim(),

      amount: input.amount,

      notes:
        input.notes?.trim() || null,
    })
    .eq("id", expenseId)
    .select()
    .maybeSingle();

  if (error) {
    console.error(
      "updateExpense error:",
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
        "Expense was not found."
      ),
    };
  }

  return {
    data: data as Expense,
    error: null,
  };
}

export async function deleteExpense(
  expenseId: string
): Promise<{
  data: Expense | null;
  error: Error | null;
}> {
  if (!expenseId) {
    return {
      data: null,
      error: new Error(
        "Expense ID is required."
      ),
    };
  }

  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .select()
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  if (!data) {
    return {
      data: null,
      error: new Error(
        "Expense was not found."
      ),
    };
  }

  return {
    data: data as Expense,
    error: null,
  };
}