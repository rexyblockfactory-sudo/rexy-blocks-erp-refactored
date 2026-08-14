import type { DashboardRecentSale } from "@/types/dashboard";

interface RecentSalesProps {
  sales: DashboardRecentSale[];
}

export default function RecentSales({ sales }: RecentSalesProps) {
  return (
    <section className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-2xl font-semibold">Recent Sales</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-left">Quantity</th>
              <th className="p-3 text-left">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  No recent sales found.
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="border-b">
                  <td className="p-3">{sale.customer_name}</td>
                  <td className="p-3">{sale.product_name}</td>
                  <td className="p-3">{sale.quantity}</td>
                  <td className="p-3">
                    GH₵{Number(sale.total_amount).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
