import ProductionForm from "@/components/forms/ProductionForm";

export default function ProductionPage() {
  return (
    <main className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Production
        </h1>

        <p className="mt-1 text-gray-600">
          Record blocks produced by Rexy Blocks
          Factory.
        </p>
      </div>

      <ProductionForm />
    </main>
  );
}