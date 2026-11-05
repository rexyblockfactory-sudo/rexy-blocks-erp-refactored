import { Boxes, Factory, Package, TriangleAlert, Wallet } from "lucide-react";

interface DashboardStatsProps {
  salesTotal: number;
  productionTotal: number;
  productCount: number;
  lowStockCount: number;
}

export default function DashboardStats({
  salesTotal, productionTotal, productCount, lowStockCount,
}: DashboardStatsProps) {
  const metrics = [
    { label: "Total sales", value: new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(salesTotal), detail: "Sales recorded", icon: Wallet },
    { label: "Total production", value: productionTotal.toLocaleString("en-GH"), detail: "Blocks produced", icon: Factory },
    { label: "Products", value: productCount.toLocaleString("en-GH"), detail: "In the catalogue", icon: Package },
    { label: "Low stock alerts", value: lowStockCount.toLocaleString("en-GH"), detail: lowStockCount > 0 ? "Items need review" : "No items flagged", icon: lowStockCount > 0 ? TriangleAlert : Boxes },
  ];

  return (
    <section aria-label="Factory metrics" className="grid grid-cols-1 gap-4 min-[460px]:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, detail, icon: Icon }) => (
        <article key={label} className="min-w-0 rounded-xl border border-[#dfe7e2] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eaf2ed] text-[#285a44]"><Icon size={18} aria-hidden="true" /></span>
            <h2 className="text-sm font-semibold text-[#4d6358]">{label}</h2>
          </div>
          <p className="mt-3 break-words text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-[#52685d]">{detail}</p>
        </article>
      ))}
    </section>
  );
}
