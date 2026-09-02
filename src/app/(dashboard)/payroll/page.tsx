"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type PayrollRecord = {
  id: string;
  pay_date: string;
  worker_type: "production_workers" | "operator_allowance" | "operator_salary" | "manager_salary";
  description: string;
  cement_bags: number | null;
  working_days: number | null;
  rate: number;
  amount: number;
  notes: string | null;
  created_at: string;
};

const WORKER_RATE_PER_BAG = 45;
const OPERATOR_DAILY_ALLOWANCE = 130;
const OPERATOR_MONTHLY_SALARY = 1500;
const MANAGER_MONTHLY_SALARY = 2500;

function money(value: number) {
  return `GH₵${Number(value || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function label(type: PayrollRecord["worker_type"]) {
  return {
    production_workers: "Production Workers",
    operator_allowance: "Operator Daily Allowance",
    operator_salary: "Operator Monthly Salary",
    manager_salary: "Manager Monthly Salary",
  }[type];
}

export default function PayrollPage() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [workerType, setWorkerType] =
    useState<PayrollRecord["worker_type"]>("production_workers");
  const [payDate, setPayDate] = useState(today());
  const [cementBags, setCementBags] = useState("");
  const [workingDays, setWorkingDays] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadPayroll();
  }, []);

  async function loadPayroll() {
    setLoading(true);
    const { data, error } = await supabase
      .from("payroll_records")
      .select("*")
      .order("pay_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setRecords((data || []) as PayrollRecord[]);
    }
    setLoading(false);
  }

  const calculatedAmount = useMemo(() => {
    if (workerType === "production_workers") {
      return Number(cementBags || 0) * WORKER_RATE_PER_BAG;
    }
    if (workerType === "operator_allowance") {
      return Number(workingDays || 0) * OPERATOR_DAILY_ALLOWANCE;
    }
    if (workerType === "operator_salary") {
      return OPERATOR_MONTHLY_SALARY;
    }
    return MANAGER_MONTHLY_SALARY;
  }, [workerType, cementBags, workingDays]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (calculatedAmount <= 0) {
      setError("Please enter a valid quantity of cement bags or working days.");
      return;
    }

    const rate =
      workerType === "production_workers"
        ? WORKER_RATE_PER_BAG
        : workerType === "operator_allowance"
          ? OPERATOR_DAILY_ALLOWANCE
          : workerType === "operator_salary"
            ? OPERATOR_MONTHLY_SALARY
            : MANAGER_MONTHLY_SALARY;

    const description = label(workerType);

    setSaving(true);

    const { error: payrollError } = await supabase
      .from("payroll_records")
      .insert({
        pay_date: payDate,
        worker_type: workerType,
        description,
        cement_bags:
          workerType === "production_workers"
            ? Number(cementBags)
            : null,
        working_days:
          workerType === "operator_allowance"
            ? Number(workingDays)
            : null,
        rate,
        amount: calculatedAmount,
        notes: notes.trim() || null,
      });

    if (payrollError) {
      setError(payrollError.message);
      setSaving(false);
      return;
    }

    setSuccess(`${description} recorded successfully: ${money(calculatedAmount)}`);
    setCementBags("");
    setWorkingDays("");
    setNotes("");
    await loadPayroll();
    setSaving(false);
  }

  const totalPayroll = records.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const workerPayroll = records
    .filter((r) => r.worker_type === "production_workers")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Payroll & Labour</h1>
        <p className="mt-1 text-gray-600">
          Record workers pay, operator allowance, and monthly salaries.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Workers Rate</p>
          <p className="mt-2 text-2xl font-bold">{money(WORKER_RATE_PER_BAG)}</p>
          <p className="text-xs text-gray-500">per cement bag</p>
        </div>
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Operator Allowance</p>
          <p className="mt-2 text-2xl font-bold">{money(OPERATOR_DAILY_ALLOWANCE)}</p>
          <p className="text-xs text-gray-500">per working day</p>
        </div>
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Operator Monthly Salary</p>
          <p className="mt-2 text-2xl font-bold">{money(OPERATOR_MONTHLY_SALARY)}</p>
        </div>
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Manager Monthly Salary</p>
          <p className="mt-2 text-2xl font-bold">{money(MANAGER_MONTHLY_SALARY)}</p>
        </div>
      </div>

      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Record Payroll Payment</h2>

        {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-lg bg-green-50 p-3 text-green-700">{success}</div>}

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Payment Type</label>
            <select
              value={workerType}
              onChange={(e) => setWorkerType(e.target.value as PayrollRecord["worker_type"])}
              className="mt-1 w-full rounded-lg border p-3"
            >
              <option value="production_workers">Production Workers — GH₵45 per cement bag</option>
              <option value="operator_allowance">Operator Daily Allowance — GH₵130/day</option>
              <option value="operator_salary">Operator Monthly Salary — GH₵1,500</option>
              <option value="manager_salary">Manager Monthly Salary — GH₵2,500</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Payment Date</label>
            <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
              className="mt-1 w-full rounded-lg border p-3" required />
          </div>

          {workerType === "production_workers" && (
            <div>
              <label className="text-sm font-medium">Cement Bags Used</label>
              <input type="number" min="0" step="0.01" value={cementBags}
                onChange={(e) => setCementBags(e.target.value)}
                className="mt-1 w-full rounded-lg border p-3" placeholder="Enter cement bags" required />
            </div>
          )}

          {workerType === "operator_allowance" && (
            <div>
              <label className="text-sm font-medium">Working Days</label>
              <input type="number" min="0" step="1" value={workingDays}
                onChange={(e) => setWorkingDays(e.target.value)}
                className="mt-1 w-full rounded-lg border p-3" placeholder="Enter working days" required />
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Calculated Amount</label>
            <div className="mt-1 rounded-lg border bg-gray-50 p-3 text-lg font-bold">
              {money(calculatedAmount)}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Reason / Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              className="mt-1 min-h-24 w-full rounded-lg border p-3"
              placeholder="Optional payment notes" />
          </div>

          <button disabled={saving} className="w-fit rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50">
            {saving ? "Saving..." : "Record Payroll Payment"}
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Payroll Recorded</p>
          <p className="mt-2 text-2xl font-bold">{money(totalPayroll)}</p>
        </div>
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Production Workers Pay</p>
          <p className="mt-2 text-2xl font-bold">{money(workerPayroll)}</p>
        </div>
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Monthly Fixed Salaries</p>
          <p className="mt-2 text-2xl font-bold">{money(4000)}</p>
          <p className="text-xs text-gray-500">Operator + Manager</p>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Payroll History</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center">Loading payroll...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">No payroll records yet.</td></tr>
              ) : records.map((record) => (
                <tr key={record.id} className="border-b">
                  <td className="p-3">{new Date(record.pay_date).toLocaleDateString("en-GH")}</td>
                  <td className="p-3 font-medium">{label(record.worker_type)}</td>
                  <td className="p-3 text-right">{money(record.rate)}</td>
                  <td className="p-3 text-right font-semibold">{money(record.amount)}</td>
                  <td className="p-3">{record.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
