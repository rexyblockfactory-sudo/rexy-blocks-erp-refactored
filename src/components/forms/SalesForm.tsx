"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

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
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [customerName, setCustomerName] =
    useState("");

  const [productId, setProductId] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("Cash");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMessage("");

      const [
        customersResult,
        productsResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select(
            "id, customer_name"
          )
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

        setErrorMessage(
          customersResult.error.message
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

        setErrorMessage(
          productsResult.error.message
        );
      } else {
        setProducts(
          (productsResult.data ||
            []) as Product[]
        );
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const selectedProduct = useMemo(() => {
    return products.find(
      (product) =>
        product.id === productId
    );
  }, [products, productId]);

  const unitPrice = Number(
    selectedProduct?.price || 0
  );

  const quantityNumber = Number(
    quantity || 0
  );

  const estimatedTotal =
    quantityNumber * unitPrice;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!customerName) {
      setErrorMessage(
        "Please select a customer."
      );
      return;
    }

    if (!selectedProduct) {
      setErrorMessage(
        "Please select a product."
      );
      return;
    }

    if (
      !quantity ||
      !Number.isInteger(quantityNumber) ||
      quantityNumber <= 0
    ) {
      setErrorMessage(
        "Please enter a valid whole-number quantity."
      );
      return;
    }

    if (unitPrice <= 0) {
      setErrorMessage(
        "The selected product does not have a valid price."
      );
      return;
    }

    if (!paymentMethod) {
      setErrorMessage(
        "Please select a payment method."
      );
      return;
    }

    setSaving(true);

    const {
      data,
      error,
    } = await createSale({
      customer_name:
        customerName,

      product_id:
        selectedProduct.id,

      quantity:
        quantityNumber,

      payment_method:
        paymentMethod,
    });

    if (error) {
      console.error(
        "Sale error:",
        error
      );

      setErrorMessage(
        error.message
      );

      setSaving(false);
      return;
    }

    if (!data) {
      setErrorMessage(
        "Sale was created, but no sale information was returned."
      );

      setSaving(false);
      return;
    }

    const totalAmount = Number(
      data.total_amount || 0
    );

    const amountPaid = Number(
      data.amount_paid || 0
    );

    const balanceDue = Number(
      data.balance_due || 0
    );

    let status = "Unpaid";

    if (
      amountPaid >= totalAmount &&
      totalAmount > 0
    ) {
      status = "Paid";
    } else if (
      amountPaid > 0 &&
      balanceDue > 0
    ) {
      status = "Partially Paid";
    }

    setSuccessMessage(
      `Sale saved successfully.\n\n` +
        `Total: GH₵${totalAmount.toFixed(2)}\n` +
        `Paid: GH₵${amountPaid.toFixed(2)}\n` +
        `Balance: GH₵${balanceDue.toFixed(2)}\n` +
        `Status: ${status}`
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
        <p>
          Loading customers and products...
        </p>
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
          onChange={(event) =>
            setCustomerName(
              event.target.value
            )
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
              value={
                customer.customer_name
              }
            >
              {customer.customer_name}
            </option>
          ))}
        </select>

        {customers.length === 0 && (
          <p className="mt-2 text-sm text-red-600">
            No customers found. Add a
            customer before recording a
            sale.
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Product
        </label>

        <select
          value={productId}
          onChange={(event) =>
            setProductId(
              event.target.value
            )
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
            {selectedProduct.category}{" "}
            • {selectedProduct.size}
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
          onChange={(event) =>
            setQuantity(
              event.target.value
            )
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

        <p className="mt-1 text-xs text-gray-500">
          Price comes from the current
          product price.
        </p>
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Estimated Total
        </label>

        <div className="rounded border bg-gray-50 p-3">
          GH₵
          {estimatedTotal.toLocaleString()}
        </div>
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Payment Method
        </label>

        <select
          value={paymentMethod}
          onChange={(event) =>
            setPaymentMethod(
              event.target.value
            )
          }
          className="w-full rounded border p-3"
        >
          <option value="Cash">
            Cash
          </option>

          <option value="Mobile Money">
            Mobile Money
          </option>

          <option value="Bank Transfer">
            Bank Transfer
          </option>

          <option value="Cheque">
            Cheque
          </option>

          <option value="Credit">
            Credit
          </option>
        </select>
      </div>

      {errorMessage && (
        <div className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="whitespace-pre-line rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          {successMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={
          saving ||
          loading ||
          customers.length === 0 ||
          products.length === 0
        }
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? "Saving Sale..."
          : "Save Sale"}
      </button>
    </form>
  );
}