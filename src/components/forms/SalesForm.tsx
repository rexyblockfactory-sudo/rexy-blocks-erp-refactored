"use client";

import { useEffect, useMemo, useState } from "react";
import { createSale } from "@/services/sales";

import { supabase } from "@/lib/supabase/client";

interface Customer {
  id: string;
  customer_name: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  size: string;
  price: number;
}

export default function SalesForm() {
  const [customers, setCustomers] = useState<Customer[]>(
    []
  );

  const [products, setProducts] = useState<Product[]>(
    []
  );

  const [customerName, setCustomerName] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState("Cash");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [customersResult, productsResult] =
        await Promise.all([
          supabase
            .from("customers")
            .select("id, customer_name")
            .order("customer_name"),

          supabase
            .from("products")
            .select(
              "id, name, category, size, price"
            )
            .order("name"),
        ]);

      if (customersResult.error) {
        console.error(
          "Customers error:",
          customersResult.error
        );
      } else {
        setCustomers(
          customersResult.data || []
        );
      }

      if (productsResult.error) {
        console.error(
          "Products error:",
          productsResult.error
        );
      } else {
        setProducts(
          productsResult.data || []
        );
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const selectedProduct = useMemo(() => {
    return products.find(
      (product) => product.id === productId
    );
  }, [products, productId]);

  const unitPrice = Number(
    selectedProduct?.price || 0
  );

  const quantityNumber = Number(quantity || 0);

  const totalAmount =
    quantityNumber * unitPrice;

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!customerName) {
      alert("Please select a customer.");
      return;
    }

    if (!selectedProduct) {
      alert("Please select a product.");
      return;
    }

    if (
      !quantity ||
      quantityNumber <= 0
    ) {
      alert("Please enter a valid quantity.");
      return;
    }

    if (unitPrice <= 0) {
      alert(
        "The selected product does not have a valid price."
      );
      return;
    }

    setSaving(true);

   const { error } = await createSale({
  customer_name: customerName,
  product_name: selectedProduct.name,
  product_id: selectedProduct.id,
  quantity: quantityNumber,
  unit_price: unitPrice,
  payment_method: paymentMethod,
});

    if (error) {
      console.error("Sale error:", error);
      alert(error.message);
      setSaving(false);
      return;
    }

    alert(
      "Sale saved successfully and invoice created."
    );

    setCustomerName("");
    setProductId("");
    setQuantity("");
    setPaymentMethod("Cash");

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <p>Loading customers and products...</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg bg-white p-6 shadow"
    >
      <div>
        <label className="mb-2 block font-medium">
          Customer
        </label>

        <select
          value={customerName}
          onChange={(e) =>
            setCustomerName(e.target.value)
          }
          className="w-full rounded border p-3"
          required
        >
          <option value="">
            Select customer
          </option>

          {customers.map((customer) => (
            <option
              key={customer.id}
              value={customer.customer_name}
            >
              {customer.customer_name}
            </option>
          ))}
        </select>

        {customers.length === 0 && (
          <p className="mt-2 text-sm text-red-600">
            No customers found. Add a customer
            before recording a sale.
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Product
        </label>

        <select
          value={productId}
          onChange={(e) =>
            setProductId(e.target.value)
          }
          className="w-full rounded border p-3"
          required
        >
          <option value="">
            Select product
          </option>

          {products.map((product) => (
            <option
              key={product.id}
              value={product.id}
            >
              {product.name} — GH₵
              {Number(
                product.price
              ).toLocaleString()}
            </option>
          ))}
        </select>

        {products.length === 0 && (
          <p className="mt-2 text-sm text-red-600">
            No products found. Add products
            before recording a sale.
          </p>
        )}
      </div>

      {selectedProduct && (
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            Selected Product
          </p>

          <p className="font-semibold">
            {selectedProduct.name}
          </p>

          <p className="text-sm text-gray-600">
            {selectedProduct.category} •{" "}
            {selectedProduct.size}
          </p>
        </div>
      )}

      <div>
        <label className="mb-2 block font-medium">
          Quantity
        </label>

        <input
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) =>
            setQuantity(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Enter quantity"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Unit Price
        </label>

        <div className="rounded border bg-gray-50 p-3">
          GH₵
          {unitPrice.toLocaleString()}
        </div>
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Payment Method
        </label>

        <select
          value={paymentMethod}
          onChange={(e) =>
            setPaymentMethod(e.target.value)
          }
          className="w-full rounded border p-3"
        >
          <option value="Cash">Cash</option>
          <option value="Credit">Credit</option>
          <option value="Mobile Money">
            Mobile Money
          </option>
        </select>
      </div>

      <div className="rounded-lg bg-gray-100 p-4">
        <p className="text-sm text-gray-600">
          Total Amount
        </p>

        <p className="text-3xl font-bold">
          GH₵
          {totalAmount.toLocaleString()}
        </p>
      </div>

      <button
        type="submit"
        disabled={saving || loading}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? "Saving Sale..."
          : "Save Sale"}
      </button>
    </form>
  );
}