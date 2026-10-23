
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  quantity: number | string;
  unit_cost: number | string;
}

export default function ReceiveStockPage() {
  const router = useRouter();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [inventoryId, setInventoryId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [invoiceReference, setInvoiceReference] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("");
  const [purchaseUnit, setPurchaseUnit] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedItem = items.find((item) => item.id === inventoryId);

  useEffect(() => {
    let active = true;

    async function loadInventory() {
      setLoading(true);
      setError("");

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        setError("Please sign in before receiving stock.");
        setLoading(false);
        return;
      }

      const { data, error: inventoryError } = await supabase
        .from("inventory")
        .select("id, item_name, category, unit, quantity, unit_cost")
        .order("item_name", { ascending: true });

      if (!active) return;

      if (inventoryError) {
        setError(`Could not load inventory: ${inventoryError.message}`);
        setLoading(false);
        return;
      }

      const loadedItems = (data ?? []) as InventoryItem[];
      setItems(loadedItems);

      if (loadedItems.length > 0) {
        setInventoryId(loadedItems[0].id);
        setPurchaseUnit(loadedItems[0].unit);
      }

      setLoading(false);
    }

    void loadInventory();

    return () => {
      active = false;
    };
  }, []);

  function handleItemChange(id: string) {
    setInventoryId(id);

    const item = items.find((entry) => entry.id === id);
    if (item) setPurchaseUnit(item.unit);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const purchaseQty = Number(purchaseQuantity);
    const stockQty = Number(stockQuantity);
    const cost = Number(totalCost);

    if (!selectedItem) {
      setError("Select an inventory item.");
      return;
    }

    if (
      !Number.isFinite(purchaseQty) ||
      purchaseQty <= 0 ||
      !Number.isFinite(stockQty) ||
      stockQty <= 0 ||
      !Number.isFinite(cost) ||
      cost <= 0
    ) {
      setError("Purchase quantity, stock quantity, and total cost must all be greater than zero.");
      return;
    }

    if (!purchaseUnit.trim()) {
      setError("Enter the unit used on the purchase.");
      return;
    }

    if (
      invoiceReference.trim() &&
      !window.confirm(
        `Confirm receipt for ${selectedItem.item_name} with invoice reference "${invoiceReference.trim()}". Make sure this invoice has not already been recorded for this item.`
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setError("Your session is not active. Please sign in again.");
        return;
      }

      const { error: purchaseError } = await supabase.rpc(
        "record_inventory_purchase",
        {
          p_inventory_id: selectedItem.id,
          p_supplier: supplier.trim() || null,
          p_invoice_reference: invoiceReference.trim() || null,
          p_purchase_quantity: purchaseQty,
          p_purchase_unit: purchaseUnit.trim(),
          p_stock_quantity: stockQty,
          p_stock_unit: selectedItem.unit,
          p_total_cost: cost,
          p_reason: reason.trim() || null,
        }
      );

      if (purchaseError) {
        setError(
          `Purchase was not recorded: ${purchaseError.message}. Check the invoice reference and entered quantities before trying again.`
        );
        return;
      }

      setSuccess(
        `Stock receipt recorded for ${selectedItem.item_name}. The database has processed the receipt.`
      );

      setSupplier("");
      setInvoiceReference("");
      setPurchaseQuantity("");
      setStockQuantity("");
      setTotalCost("");
      setReason("");

      // Reload the stock figures from the database.
      const { data: refreshedItems, error: refreshError } = await supabase
        .from("inventory")
        .select("id, item_name, category, unit, quantity, unit_cost")
        .order("item_name", { ascending: true });

      if (!refreshError && refreshedItems) {
        setItems(refreshedItems as InventoryItem[]);
      }
    } catch {
      setError(
        "An unexpected error occurred. Check the purchase history before retrying to avoid recording a receipt twice."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receive Stock</h1>
          <p className="mt-1 text-sm text-gray-600">
            Record a supplier delivery and update inventory balances.
          </p>
        </div>

        <Link
          href="/inventory"
          className="rounded border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Back to Inventory
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded border border-green-300 bg-green-50 p-4 text-sm text-green-800"
        >
          {success}
          <div className="mt-3">
            <Link
              href="/inventory/movements"
              className="font-semibold underline"
            >
              View inventory movements
            </Link>
          </div>
        </div>
      )}

      {loading ? (
        <p className="rounded-lg bg-white p-6 shadow">Loading inventory…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg bg-white p-6 shadow">
          <p>No inventory items were found. Add an inventory item before receiving stock.</p>
          <Link href="/inventory" className="mt-3 inline-block underline">
            Open Inventory
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-lg bg-white p-6 shadow"
        >
          <div>
            <label htmlFor="inventoryId" className="mb-1 block font-medium">
              Inventory item *
            </label>
            <select
              id="inventoryId"
              value={inventoryId}
              onChange={(event) => handleItemChange(event.target.value)}
              required
              className="w-full rounded border p-3"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.item_name} — {item.category}
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div className="rounded border bg-gray-50 p-4 text-sm">
              <p>
                <strong>Current stock:</strong>{" "}
                {Number(selectedItem.quantity).toLocaleString()} {selectedItem.unit}
              </p>
              <p className="mt-1">
                <strong>Current unit cost:</strong> GH₵
                {Number(selectedItem.unit_cost).toLocaleString("en-GH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="supplier" className="mb-1 block font-medium">
              Supplier
            </label>
            <input
              id="supplier"
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              maxLength={200}
              className="w-full rounded border p-3"
              placeholder="Supplier or company name"
            />
          </div>

          <div>
            <label htmlFor="invoiceReference" className="mb-1 block font-medium">
              Invoice / receipt reference
            </label>
            <input
              id="invoiceReference"
              value={invoiceReference}
              onChange={(event) => setInvoiceReference(event.target.value)}
              maxLength={120}
              className="w-full rounded border p-3"
              placeholder="Supplier invoice number"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use the supplier&apos;s real reference. The database may reject a
              duplicate reference for the same item.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="purchaseQuantity" className="mb-1 block font-medium">
                Purchased quantity *
              </label>
              <input
                id="purchaseQuantity"
                type="number"
                min="0.000001"
                step="any"
                value={purchaseQuantity}
                onChange={(event) => setPurchaseQuantity(event.target.value)}
                required
                className="w-full rounded border p-3"
                placeholder="e.g. 10"
              />
            </div>

            <div>
              <label htmlFor="purchaseUnit" className="mb-1 block font-medium">
                Purchase unit *
              </label>
              <input
                id="purchaseUnit"
                value={purchaseUnit}
                onChange={(event) => setPurchaseUnit(event.target.value)}
                required
                maxLength={50}
                className="w-full rounded border p-3"
                placeholder="e.g. bag, tonne"
              />
            </div>

            <div>
              <label htmlFor="stockQuantity" className="mb-1 block font-medium">
                Quantity to add to stock *
              </label>
              <input
                id="stockQuantity"
                type="number"
                min="0.000001"
                step="any"
                value={stockQuantity}
                onChange={(event) => setStockQuantity(event.target.value)}
                required
                className="w-full rounded border p-3"
                placeholder={`Quantity in ${selectedItem?.unit ?? "stock unit"}`}
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the equivalent quantity in {selectedItem?.unit ?? "the item's stock unit"}.
                No automatic unit conversion is performed.
              </p>
            </div>

            <div>
              <label htmlFor="totalCost" className="mb-1 block font-medium">
                Total purchase cost (GH₵) *
              </label>
              <input
                id="totalCost"
                type="number"
                min="0.01"
                step="0.01"
                value={totalCost}
                onChange={(event) => setTotalCost(event.target.value)}
                required
                className="w-full rounded border p-3"
                placeholder="e.g. 900.00"
              />
            </div>
          </div>

          {Number(stockQuantity) > 0 && Number(totalCost) > 0 && (
            <p className="rounded bg-gray-50 p-3 text-sm">
              Cost per stock unit for this receipt:{" "}
              <strong>
                GH₵
                {(Number(totalCost) / Number(stockQuantity)).toLocaleString(
                  "en-GH",
                  { minimumFractionDigits: 2, maximumFractionDigits: 4 }
                )}
              </strong>{" "}
              per {selectedItem?.unit ?? "unit"}
            </p>
          )}

          <div>
            <label htmlFor="reason" className="mb-1 block font-medium">
              Notes / reason
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded border p-3"
              placeholder="Optional delivery notes"
            />
          </div>

          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Submitting this form updates real stock quantities and inventory
            valuation. Confirm the delivered quantity and invoice cost before
            saving. Do not submit the same receipt twice.
          </div>

          <button
            type="submit"
            disabled={saving || loading || !selectedItem}
            className="w-full rounded bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Recording receipt…" : "Record Stock Receipt"}
          </button>
        </form>
      )}
    </main>
  );
}
