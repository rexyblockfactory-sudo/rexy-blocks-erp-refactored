"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/supabase/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-slate-900 p-6 text-white">
        <h1 className="mb-8 text-2xl font-bold">
          Rexy Blocks ERP
        </h1>

        <nav className="space-y-2">
          <Link
            href="/dashboard"
            className="block rounded p-2 hover:bg-slate-700"
          >
            🏠 Dashboard
          </Link>

          <Link
            href="/products"
            className="block rounded p-2 hover:bg-slate-700"
          >
            📦 Products
          </Link>

          <Link
            href="/production"
            className="block rounded p-2 hover:bg-slate-700"
          >
            🏭 Production
          </Link>

          <Link
            href="/inventory"
            className="block rounded p-2 hover:bg-slate-700"
          >
            📋 Inventory
          </Link>

          <Link
            href="/sales"
            className="block rounded p-2 hover:bg-slate-700"
          >
            💰 Sales
          </Link>

          <Link
            href="/customers"
            className="block rounded p-2 hover:bg-slate-700"
          >
            👥 Customers
          </Link>

          <Link
            href="/reports"
            className="block rounded p-2 hover:bg-slate-700"
          >
            📊 Reports
          </Link>

          <Link
            href="/invoices"
            className="block rounded p-2 hover:bg-slate-700"
          >
            🧾 Invoices
          </Link>

          <Link
            href="/invoices/history"
            className="block rounded p-2 hover:bg-slate-700"
          >
            📜 Invoice History
          </Link>

          <Link
            href="/expenses"
            className="block rounded p-2 hover:bg-slate-700"
          >
            💵 Expenses
          </Link>

          <Link
            href="/settings"
            className="block rounded p-2 hover:bg-slate-700"
          >
            ⚙️ Settings
          </Link>

          <button
            onClick={handleLogout}
            className="mt-8 w-full rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 bg-gray-100 p-8">
        {children}
      </main>
    </div>
  );
}