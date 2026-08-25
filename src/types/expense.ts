export interface Expense {
  id: string;
  expense_name: string;
  category: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface CreateExpenseInput {
  expense_name: string;
  category: string;
  amount: number;
  notes?: string;
}

export interface UpdateExpenseInput {
  expense_name: string;
  category: string;
  amount: number;
  notes?: string;
}