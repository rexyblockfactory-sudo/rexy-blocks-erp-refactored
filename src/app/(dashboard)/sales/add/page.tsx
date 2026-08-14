import SalesForm from "@/components/forms/SalesForm";

export default function AddSalePage() {
  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Add Sale
        </h1>

        <p className="mt-1 text-gray-600">
          Record a customer sale and create an
          invoice automatically.
        </p>
      </div>

      <SalesForm />
    </main>
  );
}