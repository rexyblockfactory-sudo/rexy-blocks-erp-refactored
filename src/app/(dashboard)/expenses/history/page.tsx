"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Expense {
  id: string;
  expense_name: string;
  category: string;
  amount: number;
  notes: string;
  created_at: string;
}

export default function ExpenseHistoryPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
  console.log("Starting query...");

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  console.log("DATA:", data);
  console.log("ERROR:", error);

  if (error) {
    console.error(error);
    return;
  }

  const expenseData = data || [];

  console.log("EXPENSES:", expenseData);

  setExpenses(expenseData);

  const total = expenseData.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  setTotalExpenses(total);
}

  async function deleteExpense(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Unable to delete expense.");
      return;
    }

    loadExpenses();
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h1 className="mb-6 text-3xl font-bold">
        Expense History
      </h1>

      <div className="mb-6 rounded-lg bg-blue-600 p-6 text-white">
        <p className="text-sm">Total Expenses</p>

        <h2 className="text-3xl font-bold">
          GH₵{totalExpenses.toLocaleString()}
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-3 text-left">Expense</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Notes</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-gray-500"
                >
                  No expenses found.
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b"
                >
                  <td className="p-3">
                    {expense.expense_name}
                  </td>

                  <td className="p-3">
                    {expense.category}
                  </td>

                  <td className="p-3">
                    GH₵
                    {Number(
                      expense.amount
                    ).toLocaleString()}
                  </td>

                  <td className="p-3">
                    {expense.notes}
                  </td>

                  <td className="p-3">
                    {new Date(
                      expense.created_at
                    ).toLocaleDateString()}
                  </td>

                  <td className="p-3">
                    <button
                      onClick={() =>
                        deleteExpense(expense.id)
                      }
                      className="rounded bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}