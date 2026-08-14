interface DashboardStatsProps {
  salesTotal: number;
  productionTotal: number;
  productCount: number;
  lowStockCount: number;
}

export default function DashboardStats({
  salesTotal,
  productionTotal,
  productCount,
  lowStockCount,
}: DashboardStatsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-sm text-gray-500">
          Total Sales
        </h2>

        <p className="mt-2 text-3xl font-bold">
          GH₵{salesTotal.toLocaleString()}
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-sm text-gray-500">
          Total Production
        </h2>

        <p className="mt-2 text-3xl font-bold">
          {productionTotal.toLocaleString()} Blocks
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-sm text-gray-500">
          Products
        </h2>

        <p className="mt-2 text-3xl font-bold">
          {productCount}
        </p>
      </div>

      <div
        className={`rounded-lg p-6 shadow ${
          lowStockCount > 0
            ? "bg-red-100"
            : "bg-green-100"
        }`}
      >
        <h2 className="text-sm text-gray-500">
          Low Stock Alerts
        </h2>

        <p className="mt-2 text-3xl font-bold">
          {lowStockCount}
        </p>
      </div>
    </div>
  );
}