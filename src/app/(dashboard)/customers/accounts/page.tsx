"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Customer {
  id: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  customer_type: string | null;
  balance: number;
  created_at: string;
}

interface Sale {
  id: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  amount_paid: number;
  balance_due: number;
  created_at: string;
}

interface Payment {
  id: string;
  sale_id: string;
  amount: number;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

interface CustomerAccount {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  customerType: string | null;
  totalSales: number;
  totalPayments: number;
  outstanding: number;
  outstandingSales: number;
}

function money(value: number) {
  return `GH₵${Number(value || 0).toLocaleString(
    "en-GH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

export default function CustomerAccountsPage() {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [
        customersResult,
        salesResult,
        paymentsResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("*")
          .order("customer_name", {
            ascending: true,
          }),

        supabase
          .from("sales")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("sale_payments")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (customersResult.error) {
        throw new Error(
          `Customers: ${customersResult.error.message}`
        );
      }

      if (salesResult.error) {
        throw new Error(
          `Sales: ${salesResult.error.message}`
        );
      }

      if (paymentsResult.error) {
        throw new Error(
          `Payments: ${paymentsResult.error.message}`
        );
      }

      setCustomers(
        (customersResult.data ||
          []) as Customer[]
      );

      setSales(
        (salesResult.data ||
          []) as Sale[]
      );

      setPayments(
        (paymentsResult.data ||
          []) as Payment[]
      );
    } catch (error) {
      console.error(
        "Customer accounts error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load customer accounts."
      );
    } finally {
      setLoading(false);
    }
  }

  const paymentBySale = useMemo(() => {
    const map = new Map<
      string,
      number
    >();

    payments.forEach((payment) => {
      const existing =
        map.get(payment.sale_id) ||
        0;

      map.set(
        payment.sale_id,
        existing +
          Number(payment.amount || 0)
      );
    });

    return map;
  }, [payments]);

  const accounts = useMemo(() => {
    const map = new Map<
      string,
      CustomerAccount
    >();

    /*
     * Start with registered customers.
     */
    customers.forEach((customer) => {
      const name =
        customer.customer_name.trim();

      if (!name) {
        return;
      }

      map.set(name.toLowerCase(), {
        id: customer.id,
        name,
        phone: customer.phone,
        address: customer.address,
        customerType:
          customer.customer_type,
        totalSales: 0,
        totalPayments: 0,
        outstanding: 0,
        outstandingSales: 0,
      });
    });

    /*
     * Add customers that exist in sales
     * but are not currently in customers.
     *
     * This prevents historical sales from
     * disappearing from Accounts.
     */
    sales.forEach((sale) => {
      const name =
        sale.customer_name?.trim() ||
        "N/A";

      const key = name.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          id: `sale-${sale.id}`,
          name,
          phone: null,
          address: null,
          customerType: null,
          totalSales: 0,
          totalPayments: 0,
          outstanding: 0,
          outstandingSales: 0,
        });
      }
    });

    /*
     * Aggregate sales.
     */
    sales.forEach((sale) => {
      const name =
        sale.customer_name?.trim() ||
        "N/A";

      const key = name.toLowerCase();

      const account =
        map.get(key);

      if (!account) {
        return;
      }

      const total =
        Number(
          sale.total_amount || 0
        );

      const ledgerPayment =
        paymentBySale.has(sale.id)
          ? paymentBySale.get(
              sale.id
            ) || 0
          : Number(
              sale.amount_paid || 0
            );

      account.totalSales +=
        total;

      /*
       * Only count payment records
       * here once. Payments are
       * accumulated below from the
       * payment ledger.
       */
      if (
        paymentBySale.has(
          sale.id
        )
      ) {
        account.totalPayments +=
          ledgerPayment;
      } else {
        account.totalPayments +=
          Number(
            sale.amount_paid || 0
          );
      }

      const balance = Math.max(
        0,
        total - ledgerPayment
      );

      account.outstanding +=
        balance;

      if (balance > 0) {
        account.outstandingSales +=
          1;
      }
    });

    return Array.from(
      map.values()
    ).sort((a, b) => {
      if (
        b.outstanding !==
        a.outstanding
      ) {
        return (
          b.outstanding -
          a.outstanding
        );
      }

      return a.name.localeCompare(
        b.name
      );
    });
  }, [
    customers,
    sales,
    paymentBySale,
  ]);

  const filteredAccounts =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return accounts;
      }

      return accounts.filter(
        (account) =>
          account.name
            .toLowerCase()
            .includes(query) ||
          account.phone
            ?.toLowerCase()
            .includes(query)
      );
    }, [accounts, search]);

  const totalSales =
    accounts.reduce(
      (sum, account) =>
        sum + account.totalSales,
      0
    );

  const totalPayments =
    accounts.reduce(
      (sum, account) =>
        sum + account.totalPayments,
      0
    );

  const totalOutstanding =
    accounts.reduce(
      (sum, account) =>
        sum + account.outstanding,
      0
    );

  const customersOwing =
    accounts.filter(
      (account) =>
        account.outstanding > 0
    ).length;

  const outstandingSales =
    accounts.reduce(
      (sum, account) =>
        sum +
        account.outstandingSales,
      0
    );

  return (
    <main className="space-y-6 p-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            Customer Accounts
          </h1>

          <p className="mt-1 text-gray-600">
            Customer sales, payments,
            and outstanding balances.
          </p>
        </div>

        <div className="flex gap-2">

          <Link
            href="/customers/statements"
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Customer Statements
          </Link>

          <Link
            href="/receivables"
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Receivables
          </Link>

        </div>

      </div>

      {/* ERROR */}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">

          <p className="font-semibold">
            Unable to load customer accounts
          </p>

          <p className="mt-1 text-sm">
            {errorMessage}
          </p>

        </div>
      )}

      {/* SUMMARY */}

      <div className="grid gap-4 md:grid-cols-4">

        <div className="rounded-lg border bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Total Sales
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(totalSales)}
          </p>

        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Total Payments
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {money(totalPayments)}
          </p>

        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Outstanding
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {money(totalOutstanding)}
          </p>

        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Customers Owing
          </p>

          <p className="mt-2 text-2xl font-bold">
            {customersOwing}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {outstandingSales} outstanding
            sales
          </p>

        </div>

      </div>

      {/* SEARCH */}

      <div className="rounded-lg border bg-white p-5 shadow-sm">

        <label
          htmlFor="customer-search"
          className="mb-2 block text-sm font-semibold"
        >
          Search Customer
        </label>

        <input
          id="customer-search"
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search by customer name or phone..."
          className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
        />

      </div>

      {/* TABLE */}

      {loading ? (

        <div className="rounded-lg border bg-white p-10 text-center">
          Loading customer accounts...
        </div>

      ) : (

        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">

          <table className="min-w-full">

            <thead className="bg-gray-50">

              <tr>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Customer
                </th>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Phone
                </th>

                <th className="border-b p-3 text-left text-sm font-semibold">
                  Type
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Total Sales
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Payments
                </th>

                <th className="border-b p-3 text-right text-sm font-semibold">
                  Balance
                </th>

                <th className="border-b p-3 text-center text-sm font-semibold">
                  Owing Sales
                </th>

                <th className="border-b p-3 text-center text-sm font-semibold">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredAccounts.length ===
              0 ? (

                <tr>

                  <td
                    colSpan={8}
                    className="p-10 text-center text-gray-500"
                  >
                    No customer accounts
                    found.
                  </td>

                </tr>

              ) : (

                filteredAccounts.map(
                  (account) => (
                    <tr
                      key={account.id}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >

                      <td className="p-3 font-semibold">
                        {account.name}
                      </td>

                      <td className="p-3">
                        {account.phone ||
                          "—"}
                      </td>

                      <td className="p-3">
                        {account.customerType ||
                          "—"}
                      </td>

                      <td className="whitespace-nowrap p-3 text-right">
                        {money(
                          account.totalSales
                        )}
                      </td>

                      <td className="whitespace-nowrap p-3 text-right text-green-600">
                        {money(
                          account.totalPayments
                        )}
                      </td>

                      <td
                        className={`whitespace-nowrap p-3 text-right font-semibold ${
                          account.outstanding >
                          0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {money(
                          account.outstanding
                        )}
                      </td>

                      <td className="p-3 text-center">
                        {account.outstandingSales}
                      </td>

                      <td className="p-3 text-center">

                        {account.outstanding >
                        0 ? (

                          <Link
                            href={`/receivables?customer=${encodeURIComponent(
                              account.name
                            )}`}
                            className="text-sm font-semibold text-blue-600 hover:underline"
                          >
                            View Account
                          </Link>

                        ) : (

                          <Link
                            href={`/customers/statements?customer=${encodeURIComponent(
                              account.name
                            )}`}
                            className="text-sm font-semibold text-blue-600 hover:underline"
                          >
                            Statement
                          </Link>

                        )}

                      </td>

                    </tr>
                  )
                )

              )}

            </tbody>

            {filteredAccounts.length >
              0 && (
              <tfoot className="bg-gray-50">

                <tr>

                  <td
                    colSpan={3}
                    className="p-3 text-right font-bold"
                  >
                    Totals
                  </td>

                  <td className="whitespace-nowrap p-3 text-right font-bold">
                    {money(
                      filteredAccounts.reduce(
                        (
                          sum,
                          account
                        ) =>
                          sum +
                          account.totalSales,
                        0
                      )
                    )}
                  </td>

                  <td className="whitespace-nowrap p-3 text-right font-bold text-green-600">
                    {money(
                      filteredAccounts.reduce(
                        (
                          sum,
                          account
                        ) =>
                          sum +
                          account.totalPayments,
                        0
                      )
                    )}
                  </td>

                  <td className="whitespace-nowrap p-3 text-right font-bold text-red-600">
                    {money(
                      filteredAccounts.reduce(
                        (
                          sum,
                          account
                        ) =>
                          sum +
                          account.outstanding,
                        0
                      )
                    )}
                  </td>

                  <td className="p-3 text-center font-bold">
                    {filteredAccounts.reduce(
                      (
                        sum,
                        account
                      ) =>
                        sum +
                        account.outstandingSales,
                      0
                    )}
                  </td>

                  <td />

                </tr>

              </tfoot>
            )}

          </table>

        </div>

      )}

    </main>
  );
}