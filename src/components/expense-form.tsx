"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ExpenseForm() {
  const [expenseName, setExpenseName] =
    useState("");

  const [category, setCategory] =
    useState("Cement");

  const [amount, setAmount] = useState(0);

  const [notes, setNotes] = useState("");

  async function saveExpense() {
    const { error } = await supabase
      .from("expenses")
      .insert([
        {
          expense_name: expenseName,
          category,
          amount,
          notes,
        },
      ]);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("Expense saved successfully.");

    setExpenseName("");
    setCategory("Cement");
    setAmount(0);
    setNotes("");
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h1 className="mb-6 text-3xl font-bold">
        Expenses
      </h1>

      <input
        className="mb-4 w-full rounded border p-3"
        placeholder="Expense name"
        value={expenseName}
        onChange={(e) =>
          setExpenseName(e.target.value)
        }
      />

      <select
        className="mb-4 w-full rounded border p-3"
        value={category}
        onChange={(e) =>
          setCategory(e.target.value)
        }
      >
        <option>Cement</option>
        <option>Sand</option>
        <option>Quarry Dust</option>
        <option>Water</option>
        <option>Fuel</option>
        <option>Salaries</option>
        <option>Maintenance</option>
        <option>Transportation</option>
        <option>Miscellaneous</option>
      </select>

      <input
        type="number"
        className="mb-4 w-full rounded border p-3"
        placeholder="Amount"
        value={amount}
        onChange={(e) =>
          setAmount(Number(e.target.value))
        }
      />

      <textarea
        className="mb-4 w-full rounded border p-3"
        placeholder="Notes"
        value={notes}
        onChange={(e) =>
          setNotes(e.target.value)
        }
      />

      <button
        onClick={saveExpense}
        className="rounded bg-blue-600 px-4 py-2 text-white"
      >
        Save Expense
      </button>
    </div>
  );
}