import InventoryForm from "@/components/forms/InventoryForm";

export default function InventoryPage() {
  return (
    <main className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Inventory
        </h1>

        <p className="mt-1 text-gray-600">
          Add materials and other inventory
          items to Rexy Blocks Factory.
        </p>
      </div>

      <InventoryForm />
    </main>
  );
}