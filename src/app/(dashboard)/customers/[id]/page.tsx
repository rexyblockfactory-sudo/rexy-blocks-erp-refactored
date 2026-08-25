import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Customer {
  id: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  customer_type: string | null;
  balance: number | null;
  created_at: string;
}

interface Sale {
  id: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_method: string;
  created_at: string;
}

interface Payment {
  id: string;
  customer_name: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

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

export default async function CustomerAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  /*
   * Load customer.
   */
  const customerResult = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (customerResult.error) {
    throw new Error(
      customerResult.error.message
    );
  }

  const customer =
    customerResult.data as Customer | null;

  if (!customer) {
    notFound();
  }

  /*
   * Load sales and actual customer payments.
   */
  const [salesResult, paymentsResult] =
    await Promise.all([
      supabase
        .from("sales")
        .select("*")
        .eq(
          "customer_name",
          customer.customer_name
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("customer_payments")
        .select("*")
        .eq(
          "customer_name",
          customer.customer_name
        )
        .order("created_at", {
          ascending: false,
        }),
    ]);

  if (salesResult.error) {
    throw new Error(
      salesResult.error.message
    );
  }

  if (paymentsResult.error) {
    throw new Error(
      paymentsResult.error.message
    );
  }

  const sales =
    (salesResult.data ?? []) as Sale[];

  const payments =
    (paymentsResult.data ?? []) as Payment[];

  /*
   * Total value of all sales.
   */
  const totalSales = sales.reduce(
    (sum, sale) =>
      sum +
      Number(
        sale.total_amount ?? 0
      ),
    0
  );

  /*
   * Current outstanding balance comes
   * directly from the sales ledger.
   */
  const outstandingBalance =
    sales.reduce(
      (sum, sale) =>
        sum +
        Math.max(
          Number(
            sale.balance_due ?? 0
          ),
          0
        ),
      0
    );

  /*
   * Historical sales payments are represented
   * by sales.amount_paid.
   *
   * This is the amount allocated against
   * individual sales.
   */
  const totalAllocatedToSales =
    sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.amount_paid ?? 0
        ),
      0
    );

  /*
   * Separately recorded payments.
   *
   * These are displayed as payment transactions,
   * but are NOT added to sales.amount_paid
   * because doing so would double-count payments
   * that the RPC already allocated to sales.
   */
  const totalRecordedPayments =
    payments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount ?? 0
        ),
      0
    );

  /*
   * Number of outstanding sales.
   */
  const outstandingSales =
    sales.filter(
      (sale) =>
        Number(
          sale.balance_due ?? 0
        ) > 0
    ).length;

  return (
    <main className="space-y-8 p-6">

      {/* Header */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

        <div>

          <Link
            href="/customers"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Customers
          </Link>

          <h1 className="mt-2 text-3xl font-bold">
            {customer.customer_name}
          </h1>

          <p className="mt-1 text-gray-600">
            Customer account and statement
          </p>

        </div>

        <Link
          href={`/customers/${customer.id}/payment`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
        >
          + Record Payment
        </Link>

      </div>


      {/* Customer Information */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">

        <h2 className="text-xl font-semibold">
          Customer Information
        </h2>

        <div className="mt-4 grid gap-5 md:grid-cols-4">

          <div>
            <p className="text-sm text-gray-500">
              Customer
            </p>

            <p className="mt-1 font-medium">
              {customer.customer_name}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Phone
            </p>

            <p className="mt-1 font-medium">
              {customer.phone || "—"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Address
            </p>

            <p className="mt-1 font-medium">
              {customer.address || "—"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Customer Type
            </p>

            <p className="mt-1 font-medium">
              {customer.customer_type || "—"}
            </p>
          </div>

        </div>

      </section>


      {/* Account Summary */}

      <section className="grid gap-4 md:grid-cols-4">

        <div className="rounded-xl border bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Total Sales
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(totalSales)}
          </p>

        </div>


        <div className="rounded-xl border bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Allocated to Sales
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {money(
              totalAllocatedToSales
            )}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Payments applied to individual sales
          </p>

        </div>


        <div className="rounded-xl border bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Outstanding Balance
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {money(
              outstandingBalance
            )}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {outstandingSales} outstanding sale
            {outstandingSales === 1
              ? ""
              : "s"}
          </p>

        </div>


        <div className="rounded-xl border bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Recorded Payments
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {money(
              totalRecordedPayments
            )}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Payment transactions recorded
          </p>

        </div>

      </section>


      {/* Sales History */}

      <section className="space-y-4">

        <div className="flex items-center justify-between">

          <h2 className="text-xl font-semibold">
            Sales History
          </h2>

          <span className="text-sm text-gray-500">
            {sales.length} sale
            {sales.length === 1
              ? ""
              : "s"}
          </span>

        </div>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">

          <table className="w-full text-left text-sm">

            <thead className="border-b bg-gray-50">

              <tr>

                <th className="p-4">
                  Date
                </th>

                <th className="p-4">
                  Product
                </th>

                <th className="p-4 text-right">
                  Qty
                </th>

                <th className="p-4 text-right">
                  Unit Price
                </th>

                <th className="p-4 text-right">
                  Total
                </th>

                <th className="p-4 text-right">
                  Paid
                </th>

                <th className="p-4 text-right">
                  Balance
                </th>

              </tr>

            </thead>

            <tbody>

              {sales.length === 0 ? (

                <tr>

                  <td
                    colSpan={7}
                    className="p-8 text-center text-gray-500"
                  >
                    No sales found.
                  </td>

                </tr>

              ) : (

                sales.map((sale) => {

                  const saleBalance =
                    Number(
                      sale.balance_due ?? 0
                    );

                  return (
                    <tr
                      key={sale.id}
                      className="border-b last:border-0"
                    >

                      <td className="whitespace-nowrap p-4">
                        {formatDate(
                          sale.created_at
                        )}
                      </td>

                      <td className="p-4 font-medium">
                        {sale.product_name}
                      </td>

                      <td className="p-4 text-right">
                        {sale.quantity}
                      </td>

                      <td className="p-4 text-right">
                        {money(
                          Number(
                            sale.unit_price
                          )
                        )}
                      </td>

                      <td className="p-4 text-right font-medium">
                        {money(
                          Number(
                            sale.total_amount
                          )
                        )}
                      </td>

                      <td className="p-4 text-right text-green-600">
                        {money(
                          Number(
                            sale.amount_paid
                          )
                        )}
                      </td>

                      <td
                        className={`p-4 text-right font-semibold ${
                          saleBalance > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {money(
                          saleBalance
                        )}
                      </td>

                    </tr>
                  );
                })
              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* Payment History */}

      <section className="space-y-4">

        <div className="flex items-center justify-between">

          <h2 className="text-xl font-semibold">
            Payment History
          </h2>

          <span className="text-sm text-gray-500">
            {payments.length} recorded payment
            {payments.length === 1
              ? ""
              : "s"}
          </span>

        </div>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">

          <table className="w-full text-left text-sm">

            <thead className="border-b bg-gray-50">

              <tr>

                <th className="p-4">
                  Date
                </th>

                <th className="p-4">
                  Payment Method
                </th>

                <th className="p-4">
                  Notes
                </th>

                <th className="p-4 text-right">
                  Amount
                </th>

              </tr>

            </thead>

            <tbody>

              {payments.length === 0 ? (

                <tr>

                  <td
                    colSpan={4}
                    className="p-8 text-center text-gray-500"
                  >
                    No separately recorded payments.
                  </td>

                </tr>

              ) : (

                payments.map((payment) => (

                  <tr
                    key={payment.id}
                    className="border-b last:border-0"
                  >

                    <td className="whitespace-nowrap p-4">
                      {formatDate(
                        payment.created_at
                      )}
                    </td>

                    <td className="p-4">
                      {payment.payment_method}
                    </td>

                    <td className="p-4 text-gray-600">
                      {payment.notes || "—"}
                    </td>

                    <td className="p-4 text-right font-semibold text-green-600">
                      {money(
                        Number(
                          payment.amount
                        )
                      )}
                    </td>

                  </tr>

                ))
              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* Account Reconciliation */}

      <section className="rounded-xl border bg-gray-50 p-5">

        <h2 className="font-semibold">
          Account Reconciliation
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">

          <div>
            <p className="text-sm text-gray-500">
              Sales
            </p>

            <p className="mt-1 font-semibold">
              {money(totalSales)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Allocated Payments
            </p>

            <p className="mt-1 font-semibold">
              {money(
                totalAllocatedToSales
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Outstanding
            </p>

            <p className="mt-1 font-semibold text-red-600">
              {money(
                outstandingBalance
              )}
            </p>
          </div>

        </div>

        <p className="mt-4 text-sm text-gray-600">
          The outstanding balance is calculated
          directly from the sales ledger. Payment
          transactions are displayed separately and
          are not added again to the sales payment
          total, preventing double-counting.
        </p>

      </section>

    </main>
  );
}