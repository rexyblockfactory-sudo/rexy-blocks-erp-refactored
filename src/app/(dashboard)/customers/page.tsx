"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CustomerTable from "@/components/tables/CustomerTable";
import { getCustomers } from "@/services/customers";
import type { Customer } from "@/types/customer";

function money(value: number) {
  return `GH₵${value.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CustomersPage() {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [type, setType] =
    useState("All");

  async function loadCustomers() {
    setLoading(true);
    setError("");

    const result =
      await getCustomers();

    if (result.error) {
      setError(result.error.message);
      setCustomers([]);
      setLoading(false);
      return;
    }

    setCustomers(
      (result.data ?? []) as Customer[]
    );

    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const types = useMemo(() => {
    const customerTypes =
      customers
        .map(
          (customer) =>
            customer.customer_type
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        );

    return [
      "All",
      ...Array.from(
        new Set(customerTypes)
      ).sort(),
    ];
  }, [customers]);

  const filteredCustomers =
    useMemo(() => {
      const searchText =
        search.trim().toLowerCase();

      return customers.filter(
        (customer) => {
          const matchesSearch =
            !searchText ||
            customer.customer_name
              .toLowerCase()
              .includes(searchText) ||
            (
              customer.phone ?? ""
            )
              .toLowerCase()
              .includes(searchText) ||
            (
              customer.address ?? ""
            )
              .toLowerCase()
              .includes(searchText);

          const matchesType =
            type === "All" ||
            customer.customer_type ===
              type;

          return (
            matchesSearch &&
            matchesType
          );
        }
      );
    }, [
      customers,
      search,
      type,
    ]);

  const totalBalance =
    filteredCustomers.reduce(
      (sum, customer) =>
        sum +
        Number(
          customer.balance ?? 0
        ),
      0
    );

  const customersWithBalance =
    filteredCustomers.filter(
      (customer) =>
        Number(
          customer.balance ?? 0
        ) > 0
    ).length;

  return (
    <main className="space-y-8 p-6">

      {/* Header */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

        <div>
          <h1 className="text-3xl font-bold">
            Customers
          </h1>

          <p className="mt-1 text-gray-600">
            Manage Rexy Blocks Factory
            customers and accounts.
          </p>
        </div>

        <Link
          href="/customers/add"
          className="rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
        >
          + Add Customer
        </Link>

      </div>


      {/* Summary Cards */}

      <section className="grid gap-4 md:grid-cols-3">

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total Customers
          </p>

          <p className="mt-2 text-2xl font-bold">
            {filteredCustomers.length}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Matching current filters
          </p>
        </div>


        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Outstanding Balance
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {money(totalBalance)}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Current customer balances
          </p>
        </div>


        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Customers With Balance
          </p>

          <p className="mt-2 text-2xl font-bold">
            {customersWithBalance}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Customers owing money
          </p>
        </div>

      </section>


      {/* Filters */}

      <section className="rounded-xl border bg-white p-5 shadow-sm">

        <div className="grid gap-4 md:grid-cols-3">

          <div className="md:col-span-2">

            <label className="mb-2 block text-sm font-medium">
              Search Customers
            </label>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search name, phone or address..."
              className="w-full rounded-lg border p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

          </div>


          <div>

            <label className="mb-2 block text-sm font-medium">
              Customer Type
            </label>

            <select
              value={type}
              onChange={(e) =>
                setType(
                  e.target.value
                )
              }
              className="w-full rounded-lg border p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {types.map(
                (customerType) => (
                  <option
                    key={customerType}
                    value={customerType}
                  >
                    {customerType}
                  </option>
                )
              )}
            </select>

          </div>

        </div>


        {/* Clear Filters */}

        {(search ||
          type !== "All") && (
          <div className="mt-4">

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setType("All");
              }}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Clear Filters
            </button>

          </div>
        )}

      </section>


      {/* Error */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">

          <p className="font-medium">
            Unable to load customers
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>

          <button
            type="button"
            onClick={loadCustomers}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>

        </div>
      )}


      {/* Loading */}

      {loading && !error && (
        <div className="rounded-xl border bg-white p-10 text-center shadow-sm">

          <p className="text-gray-500">
            Loading customers...
          </p>

        </div>
      )}


      {/* Customer Table */}

      {!loading && !error && (
        <CustomerTable
          customers={
            filteredCustomers
          }
        />
      )}

    </main>
  );
}