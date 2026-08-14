import ProductForm from "@/components/forms/ProductForm";

export default function AddProductPage() {
  return (
    <main className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Add Product
        </h1>

        <p className="mt-1 text-gray-600">
          Add a product to the Rexy Blocks product catalog.
        </p>
      </div>

      <ProductForm />
    </main>
  );
}