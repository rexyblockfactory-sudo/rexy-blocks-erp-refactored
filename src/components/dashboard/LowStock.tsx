import type { DashboardLowStockItem } from "@/types/dashboard";

interface LowStockProps {
  items: DashboardLowStockItem[];
}

export default function LowStock({ items }: LowStockProps) {
  return (
    <section className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-2xl font-semibold">Low Stock Items</h2>

      {items.length === 0 ? (
        <p className="text-green-600">✓ No low-stock items found.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.name}
              className="rounded border p-3"
            >
              ⚠ <strong>{item.name}</strong> ({item.quantity} remaining)
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
