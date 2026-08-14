import type { DashboardProductionRecord } from "@/types/dashboard";

interface ProductionHistoryProps {
  records: DashboardProductionRecord[];
}

export default function ProductionHistory({ records }: ProductionHistoryProps) {
  return (
    <section className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-2xl font-semibold">Production History</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-left">Quantity</th>
              <th className="p-3 text-left">Cement</th>
              <th className="p-3 text-left">Sand</th>
              <th className="p-3 text-left">Quarry Dust</th>
              <th className="p-3 text-left">Water</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No production records found.
                </td>
              </tr>
            ) : (
              records.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">{item.product_name}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">{item.cement_used ?? 0}</td>
                  <td className="p-3">{item.sand_used ?? 0}</td>
                  <td className="p-3">{item.quarry_dust_used ?? 0}</td>
                  <td className="p-3">{item.water_used ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
