"use client";

import { useEffect, useMemo, useState } from "react";
import ExpenseForm from "@/components/expense-form";
import {
  deleteExpense,
  getExpenses,
  updateExpense,
} from "@/services/expenses";
import type { Expense } from "@/types/expense";

function money(value: number) {
  return `GH₵${value.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [editing, setEditing] = useState<Expense | null>(null);

  async function loadExpenses() {
    setLoading(true);
    setError("");

    const result = await getExpenses();

    if (result.error) {
      setError(result.error.message);
      setExpenses([]);
      setLoading(false);
      return;
    }

    setExpenses(result.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  const categories = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          expenses
            .map((expense) => expense.category)
            .filter(Boolean)
        )
      ).sort(),
    ];
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      const matchesSearch =
        !searchText ||
        expense.expense_name
          .toLowerCase()
          .includes(searchText) ||
        expense.category
          .toLowerCase()
          .includes(searchText) ||
        (expense.notes ?? "")
          .toLowerCase()
          .includes(searchText);

      const matchesCategory =
        category === "All" ||
        expense.category === category;

      const expenseDate =
        new Date(expense.created_at);

      const matchesStart =
        !startDate ||
        expenseDate >=
          new Date(`${startDate}T00:00:00`);

      const endBoundary =
        endDate
          ? new Date(`${endDate}T23:59:59.999`)
          : null;

      const matchesEnd =
        !endBoundary ||
        expenseDate <= endBoundary;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStart &&
        matchesEnd
      );
    });
  }, [
    expenses,
    search,
    category,
    startDate,
    endDate,
  ]);

  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) =>
      sum + Number(expense.amount),
    0
  );

  async function handleDelete(expense: Expense) {
    const confirmed = window.confirm(
      `Delete "${expense.expense_name}" for ${money(
        Number(expense.amount)
      )}?`
    );

    if (!confirmed) {
      return;
    }

    const result = await deleteExpense(
      expense.id
    );

    if (result.error) {
      alert(result.error.message);
      return;
    }

    setExpenses((current) =>
      current.filter(
        (item) => item.id !== expense.id
      )
    );
  }

  async function handleUpdate() {
    if (!editing) {
      return;
    }

    const expenseName =
      window.prompt(
        "Expense name:",
        editing.expense_name
      );

    if (expenseName === null) {
      return;
    }

    const categoryValue =
      window.prompt(
        "Category:",
        editing.category
      );

    if (categoryValue === null) {
      return;
    }

    const amountValue =
      window.prompt(
        "Amount:",
        String(editing.amount)
      );

    if (amountValue === null) {
      return;
    }

    const amount = Number(amountValue);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert(
        "Please enter a valid amount greater than zero."
      );
      return;
    }

    const notesValue =
      window.prompt(
        "Notes:",
        editing.notes ?? ""
      );

    if (notesValue === null) {
      return;
    }

    const result = await updateExpense(
      editing.id,
      {
        expense_name: expenseName,
        category: categoryValue,
        amount,
        notes: notesValue,
      }
    );

    if (result.error) {
      alert(result.error.message);
      return;
    }

    if (result.data) {
      setExpenses((current) =>
        current.map((item) =>
          item.id === editing.id
            ? result.data!
            : item
        )
      );
    }

    setEditing(null);
  }

  function clearFilters() {
    setSearch("");
    setCategory("All");
    setStartDate("");
    setEndDate("");
  }

  return (
    <main className="space-y-8 p-6">

      <div>
        <h1 className="text-3xl font-bold">
          Expenses
        </h1>

        <p className="mt-1 text-gray-600">
          Manage Rexy Blocks Factory expenses.
        </p>
      </div>

      <ExpenseForm />

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">

          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">

            <div>
              <h2 className="text-xl font-semibold">
                Expense History
              </h2>

              <p className="text-sm text-gray-500">
                {filteredExpenses.length} expense
                {filteredExpenses.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={loadExpenses}
              disabled={loading}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>

          </div>

          <div className="grid gap-4 md:grid-cols-4">

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Search
              </label>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search expense, category or notes..."
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Category
              </label>

              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
                className="w-full rounded-lg border p-3"
              >
                {categories.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
                className="w-full rounded-lg border p-3"
              />
            </div>

          </div>

          <div className="grid gap-4 md:grid-cols-4">

            <div>
              <label className="mb-1 block text-sm font-medium">
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full rounded-lg border px-4 py-3 font-medium hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>

          </div>

        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Filtered Expenses
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(totalExpenses)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Expense Count
          </p>

          <p className="mt-2 text-2xl font-bold">
            {filteredExpenses.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Average Expense
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(
              filteredExpenses.length
                ? totalExpenses /
                    filteredExpenses.length
                : 0
            )}
          </p>
        </div>

      </section>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">

        <div className="overflow-x-auto">

          <table className="w-full text-left text-sm">

            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  Date
                </th>

                <th className="px-4 py-3">
                  Expense
                </th>

                <th className="px-4 py-3">
                  Category
                </th>

                <th className="px-4 py-3">
                  Notes
                </th>

                <th className="px-4 py-3 text-right">
                  Amount
                </th>

                <th className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>

              {!loading &&
                filteredExpenses.map(
                  (expense) => (
                    <tr
                      key={expense.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >

                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(
                          expense.created_at
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {expense.expense_name}
                      </td>

                      <td className="px-4 py-3">
                        {expense.category}
                      </td>

                      <td className="max-w-xs px-4 py-3 text-gray-600">
                        {expense.notes || "—"}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold">
                        {money(
                          Number(
                            expense.amount
                          )
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">

                        <div className="flex justify-end gap-2">

                          <button
                            type="button"
                            onClick={() => {
                              setEditing(
                                expense
                              );
                              void handleUpdate();
                            }}
                            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                expense
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>
                  )
                )}

              {!loading &&
                filteredExpenses.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      No expenses match the
                      current filters.
                    </td>
                  </tr>
                )}

              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    Loading expenses...
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </section>

    </main>
  );
}