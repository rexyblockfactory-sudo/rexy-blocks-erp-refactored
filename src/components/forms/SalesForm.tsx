"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase/client";
import { getProducts } from "@/services/products";
import { createSale } from "@/services/sales";

import type { Product } from "@/types/product";
import type { CreateSaleInput } from "@/types/sale";

type Customer = {
  id: string;
  customer_name: string;
};

type PaymentMethod =
  | "Cash"
  | "Mobile Money"
  | "Credit";

export default function SalesForm() {
  // ============================================================
  // STATE
  // ============================================================

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [customerName, setCustomerName] =
    useState("");

  const [productId, setProductId] =
    useState("");

  const [quantity, setQuantity] =
    useState("1");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("Cash");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  // ============================================================
  // LOAD CUSTOMERS + PRODUCTS
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setErrorMessage("");

      try {
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

          getProducts(),
        ]);

        if (cancelled) {
          return;
        }

        // --------------------------------------------------------
        // CUSTOMER ERROR
        // --------------------------------------------------------

        if (customersResult.error) {
         console.error(
  "Customers error:",
  customersResult.error
);

console.error(
  "Customer error message:",
  customersResult.error?.message
);

          setErrorMessage(
            customersResult.error.message ||
              "Unable to load customers."
          );

          setLoading(false);
          return;
        }

        // --------------------------------------------------------
        // PRODUCTS ERROR
        // --------------------------------------------------------

        if (productsResult.error) {
          console.error(
            "Products error:",
            {
              message:
                productsResult.error.message,
              details:
                productsResult.error.details,
              hint:
                productsResult.error.hint,
              code:
                productsResult.error.code,
            }
          );

          setErrorMessage(
            productsResult.error.message ||
              "Unable to load products."
          );

          setLoading(false);
          return;
        }

        // --------------------------------------------------------
        // SET DATA
        // --------------------------------------------------------

        setCustomers(
          customersResult.data || []
        );

        setProducts(
          (productsResult.data ||
            []) as Product[]
        );
      } catch (error) {
        console.error(
          "SalesForm loadData error:",
          error
        );

        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load sales data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // SELECTED PRODUCT
  // ============================================================

  const selectedProduct = useMemo(() => {
    return products.find(
      (product) =>
        product.id === productId
    );
  }, [
    products,
    productId,
  ]);

  // ============================================================
  // NUMERIC VALUES
  // ============================================================

  const quantityNumber = Number(
    quantity || 0
  );

  const unitPrice = Number(
    selectedProduct?.price || 0
  );

  const totalAmount =
    Number.isFinite(quantityNumber) &&
    quantityNumber > 0 &&
    Number.isFinite(unitPrice)
      ? quantityNumber * unitPrice
      : 0;

  // ============================================================
  // FORM VALIDATION
  // ============================================================

  const validationError = useMemo(() => {
    if (!customerName.trim()) {
      return "Customer is required.";
    }

    if (!productId) {
      return "Product is required.";
    }

    if (
      !Number.isInteger(quantityNumber) ||
      quantityNumber <= 0
    ) {
      return (
        "Quantity must be a positive whole number."
      );
    }

    if (!selectedProduct) {
      return "Selected product was not found.";
    }

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      return (
        "Selected product does not have a valid selling price."
      );
    }

    if (!paymentMethod) {
      return "Payment method is required.";
    }

    return "";
  }, [
    customerName,
    productId,
    quantityNumber,
    selectedProduct,
    unitPrice,
    paymentMethod,
  ]);

  // ============================================================
  // SUBMIT SALE
  // ============================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (validationError) {
      setErrorMessage(
        validationError
      );
      return;
    }

    if (!selectedProduct) {
      setErrorMessage(
        "Please select a valid product."
      );
      return;
    }

    setSaving(true);

    try {
      const input: CreateSaleInput = {
        customer_name:
          customerName.trim(),

        product_id:
          selectedProduct.id,

        quantity:
          quantityNumber,

        payment_method:
          paymentMethod,
      };

      const result =
        await createSale(input);

      if (result.error) {
        console.error(
          "Sale creation error:",
          result.error
        );

        setErrorMessage(
          result.error.message ||
            "Unable to create sale."
        );

        return;
      }

      if (!result.data) {
        setErrorMessage(
          "Sale was created, but no sale record was returned."
        );

        return;
      }

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      setSuccessMessage(
        `Sale created successfully. Total: GH₵${Number(
          result.data.total_amount
        ).toFixed(2)}`
      );

      // --------------------------------------------------------
      // RESET FORM
      // --------------------------------------------------------

      setCustomerName("");
      setProductId("");
      setQuantity("1");
      setPaymentMethod("Cash");
    } catch (error) {
      console.error(
        "Unexpected sale error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while creating the sale."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-600">
          Loading sales form...
        </p>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold">
          Create Sale
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Record a block sale and update
          inventory automatically.
        </p>
      </div>

      {/* ========================================================
          ERROR
      ======================================================== */}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <strong className="font-semibold">
            Error:
          </strong>{" "}
          {errorMessage}
        </div>
      )}

      {/* ========================================================
          SUCCESS
      ======================================================== */}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {successMessage}
        </div>
      )}

      {/* ========================================================
          CUSTOMER
      ======================================================== */}

      <div className="space-y-2">
        <label
          htmlFor="customer"
          className="block text-sm font-medium text-gray-700"
        >
          Customer
        </label>

        <select
          id="customer"
          value={customerName}
          onChange={(event) =>
            setCustomerName(
              event.target.value
            )
          }
          disabled={saving}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
        >
          <option value="">
            Select customer
          </option>

          {customers.map(
            (customer) => (
              <option
                key={customer.id}
                value={
                  customer.customer_name
                }
              >
                {customer.customer_name}
              </option>
            )
          )}
        </select>
      </div>

      {/* ========================================================
          PRODUCT
      ======================================================== */}

      <div className="space-y-2">
        <label
          htmlFor="product"
          className="block text-sm font-medium text-gray-700"
        >
          Product
        </label>

        <select
          id="product"
          value={productId}
          onChange={(event) =>
            setProductId(
              event.target.value
            )
          }
          disabled={saving}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
        >
          <option value="">
            Select product
          </option>

          {products.map(
            (product) => (
              <option
                key={product.id}
                value={product.id}
              >
                {product.name} — GH₵
                {Number(
                  product.price
                ).toFixed(2)}
              </option>
            )
          )}
        </select>
      </div>

      {/* ========================================================
          SELECTED PRODUCT INFORMATION
      ======================================================== */}

      {selectedProduct && (
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">
                Product
              </p>

              <p className="font-medium">
                {selectedProduct.name}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Category
              </p>

              <p className="font-medium">
                {selectedProduct.category}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Size
              </p>

              <p className="font-medium">
                {selectedProduct.size}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          QUANTITY
      ======================================================== */}

      <div className="space-y-2">
        <label
          htmlFor="quantity"
          className="block text-sm font-medium text-gray-700"
        >
          Quantity
        </label>

        <input
          id="quantity"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(event) =>
            setQuantity(
              event.target.value
            )
          }
          disabled={saving}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
        />
      </div>

      {/* ========================================================
          UNIT PRICE
      ======================================================== */}

      <div className="space-y-2">
        <label
          htmlFor="unit-price"
          className="block text-sm font-medium text-gray-700"
        >
          Unit Price
        </label>

        <input
          id="unit-price"
          type="text"
          value={
            selectedProduct
              ? `GH₵${unitPrice.toFixed(2)}`
              : "GH₵0.00"
          }
          readOnly
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
        />
      </div>

      {/* ========================================================
          PAYMENT METHOD
      ======================================================== */}

      <div className="space-y-2">
        <label
          htmlFor="payment-method"
          className="block text-sm font-medium text-gray-700"
        >
          Payment Method
        </label>

        <select
          id="payment-method"
          value={paymentMethod}
          onChange={(event) =>
            setPaymentMethod(
              event.target
                .value as PaymentMethod
            )
          }
          disabled={saving}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
        >
          <option value="Cash">
            Cash
          </option>

          <option value="Mobile Money">
            Mobile Money
          </option>

          <option value="Credit">
            Credit
          </option>
        </select>
      </div>

      {/* ========================================================
          TOTAL
      ======================================================== */}

      <div className="rounded-lg border bg-gray-50 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            Quantity
          </span>

          <span className="font-medium">
            {Number.isInteger(
              quantityNumber
            ) &&
            quantityNumber > 0
              ? quantityNumber
              : 0}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            Unit Price
          </span>

          <span className="font-medium">
            GH₵
            {unitPrice.toFixed(2)}
          </span>
        </div>

        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">
              Total
            </span>

            <span className="text-2xl font-bold">
              GH₵
              {totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          SUBMIT
      ======================================================== */}

      <button
        type="submit"
        disabled={
          saving ||
          loading ||
          !!validationError
        }
        className="w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? "Creating Sale..."
          : "Create Sale"}
      </button>
    </form>
  );
}