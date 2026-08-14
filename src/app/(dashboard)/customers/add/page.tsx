import CustomerForm from "@/components/forms/CustomerForm";

export default function AddCustomerPage() {
  return (
    <main className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Add Customer
        </h1>

        <p className="mt-1 text-gray-600">
          Add a new customer to Rexy Blocks Factory.
        </p>
      </div>

      <CustomerForm />
    </main>
  );
}