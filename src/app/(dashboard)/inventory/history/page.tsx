import InventoryTable from "@/components/tables/InventoryTable";
import { getInventory } from "@/services/inventory";
import type { InventoryItem } from "@/types/inventory";

export default async function InventoryHistoryPage() {
  const {
    data,
    error,
  } = await getInventory();

  const items =
    (data as InventoryItem[]) || [];

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Inventory History
        </h1>

        <p className="mt-1 text-gray-600">
          View inventory records and total
          inventory value.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Unable to load inventory:{" "}
          {error.message}
        </div>
      ) : (
        <InventoryTable items={items} />
      )}
    </main>
  );
}