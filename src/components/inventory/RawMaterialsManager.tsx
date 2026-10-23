"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Package, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type InventoryItem = {
  id: string;
  item_name: string;
  category: string | null;
  unit: string | null;
  quantity: number | string | null;
  unit_cost: number | string | null;
  created_at?: string | null;
};

type RawMaterialForm = {
  item_name: string;
  unit: string;
  unit_cost: string;
};

const UNIT_OPTIONS = [
  "Bag",
  "Cubic metre",
  "Litre",
  "Kilogram",
  "Piece",
  "Ton",
  "Other",
];

// These exact material names are used by the current production workflow.
// Renaming or deleting them can stop automatic material consumption.
const PRODUCTION_CRITICAL_NAMES = new Set([
  "cement",
  "chippings",
  "quarry dust",
  "water",
]);

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function numeric(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRawMaterial(item: InventoryItem): boolean {
  const category = normalize(item.category);
  return ["raw material", "raw materials", "utility", "utilities"].includes(category);
}

function money(value: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const EMPTY_FORM: RawMaterialForm = {
  item_name: "",
  unit: "Bag",
  unit_cost: "0",
};

export default function RawMaterialsManager() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<RawMaterialForm>(EMPTY_FORM);

  const loadItems = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("inventory")
        .select("id, item_name, category, unit, quantity, unit_cost, created_at")
        .order("item_name", { ascending: true });

      if (queryError) throw queryError;

      setItems(((data ?? []) as InventoryItem[]).filter(isRawMaterial));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load raw materials. Check your connection and Supabase permissions."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const term = normalize(search);
    if (!term) return items;
    return items.filter((item) =>
      [item.item_name, item.category, item.unit]
        .map(normalize)
        .some((value) => value.includes(term))
    );
  }, [items, search]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      item_name: item.item_name,
      unit: item.unit || "Other",
      unit_cost: String(numeric(item.unit_cost)),
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function hasMovementHistory(inventoryId: string): Promise<boolean> {
    const { count, error: movementError } = await supabase
      .from("inventory_movements")
      .select("id", { count: "exact", head: true })
      .eq("inventory_id", inventoryId);

    if (movementError) {
      throw new Error(
        `Could not verify stock-movement history, so the change was stopped. ${movementError.message}`
      );
    }

    return (count ?? 0) > 0;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const itemName = form.item_name.trim();
    const unit = form.unit.trim();
    const unitCost = Number(form.unit_cost);

    if (!itemName) {
      setError("Enter a raw-material name.");
      return;
    }
    if (!unit) {
      setError("Select a unit.");
      return;
    }
    if (!form.unit_cost.trim() || !Number.isFinite(unitCost) || unitCost < 0) {
      setError("Unit cost must be a valid amount of GHS 0 or more.");
      return;
    }

    try {
      setSaving(true);

      const duplicate = items.some(
        (item) =>
          normalize(item.item_name) === normalize(itemName) &&
          item.id !== editing?.id
      );
      if (duplicate) {
        throw new Error("A raw material with that name already exists.");
      }

      if (!editing) {
        // Start at zero. Record any opening stock through Stock Movements
        // so the quantity and audit history are updated atomically.
        const { data: insertedRow, error: insertError } = await supabase
          .from("inventory")
          .insert({
            item_name: itemName,
            category: "Raw Materials",
            unit,
            quantity: 0,
            unit_cost: unitCost,
          })
          .select("id")
          .maybeSingle();

        if (insertError) throw insertError;
        if (!insertedRow) {
          throw new Error("No material was added. Check your Supabase access policies and try again.");
        }
        setSuccess(`Added ${itemName}. Initial stock is 0; use Stock Movements to enter opening stock.`);
      } else {
        const coreMaterial = PRODUCTION_CRITICAL_NAMES.has(normalize(editing.item_name));
        const stockQuantity = numeric(editing.quantity);
        const changingNameOrUnit =
          normalize(itemName) !== normalize(editing.item_name) ||
          normalize(unit) !== normalize(editing.unit);

        if (coreMaterial && changingNameOrUnit) {
          throw new Error(
            "The name and unit of Cement, Chippings, Quarry Dust and Water are locked because the production workflow depends on them. You can still update unit cost."
          );
        }
        if (stockQuantity > 0 && changingNameOrUnit) {
          throw new Error(
            "Name or unit cannot be changed while stock is on hand. Use Stock Movements to bring stock to zero first."
          );
        }
        if (changingNameOrUnit && await hasMovementHistory(editing.id)) {
          throw new Error(
            "Name or unit cannot be changed because this item has stock-movement history. The historical audit trail must be preserved."
          );
        }

        const { data: updatedRow, error: updateError } = await supabase
          .from("inventory")
          .update({
            item_name: itemName,
            unit,
            unit_cost: unitCost,
          })
          .eq("id", editing.id)
          .select("id")
          .maybeSingle();

        if (updateError) throw updateError;
        if (!updatedRow) {
          throw new Error("No material was updated. Check your Supabase access policies and try again.");
        }
        setSuccess(`Updated ${itemName}. Stock quantity was not changed.`);
      }

      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await loadItems(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save raw material.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: InventoryItem) {
    setError("");
    setSuccess("");

    const itemName = item.item_name.trim();
    const quantity = numeric(item.quantity);

    if (PRODUCTION_CRITICAL_NAMES.has(normalize(itemName))) {
      setError(`${itemName} is a production-critical material and cannot be deleted from this screen.`);
      return;
    }
    if (quantity !== 0) {
      setError(`Cannot delete ${itemName}: current stock is ${quantity} ${item.unit || "units"}. Use Stock Movements first; do not erase stock records.`);
      return;
    }

    const confirmed = window.confirm(
      `Delete ${itemName}? This is allowed only because stock is zero. Any stock-movement history will block deletion.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(item.id);
      const hasHistory = await hasMovementHistory(item.id);
      if (hasHistory) {
        throw new Error(
          `Cannot delete ${itemName}: stock-movement history exists. Keep this record so the audit trail remains intact.`
        );
      }

      const { data: deletedRow, error: deleteError } = await supabase
        .from("inventory")
        .delete()
        .eq("id", item.id)
        .eq("quantity", 0)
        .select("id")
        .maybeSingle();

      if (deleteError) throw deleteError;
      if (!deletedRow) {
        throw new Error("The material was not deleted. It may have stock, or your Supabase access policy may block deletion.");
      }
      setSuccess(`Deleted ${itemName}.`);
      await loadItems(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete raw material.");
    } finally {
      setDeletingId(null);
    }
  }

  const coreMaterial = editing
    ? PRODUCTION_CRITICAL_NAMES.has(normalize(editing.item_name))
    : false;
  const nameAndUnitLocked = Boolean(
    editing &&
      (coreMaterial || numeric(editing.quantity) > 0)
  );

  return (
    <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">Raw Materials Management</h2>
            <p className="mt-1 text-sm text-gray-500">
              Add materials, edit their details and unit costs, and remove only unused zero-stock records.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadItems(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            Add Raw Material
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {success}
        </div>
      )}

      <div className="max-w-md">
        <label htmlFor="raw-material-search" className="mb-1 block text-sm font-medium">Search raw materials</label>
        <input
          id="raw-material-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cement, chippings, quarry dust..."
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading raw materials...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Material</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Unit</th>
                <th className="px-4 py-3 text-right font-semibold">Current Stock</th>
                <th className="px-4 py-3 text-right font-semibold">Unit Cost</th>
                <th className="px-4 py-3 text-right font-semibold">Stock Value</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    No raw materials found.
                  </td>
                </tr>
              ) : filteredItems.map((item) => {
                const quantity = numeric(item.quantity);
                const isCore = PRODUCTION_CRITICAL_NAMES.has(normalize(item.item_name));
                const deleting = deletingId === item.id;

                return (
                  <tr key={item.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.item_name}</td>
                    <td className="px-4 py-3">{item.category || "Raw Materials"}</td>
                    <td className="px-4 py-3">{item.unit || "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${quantity <= 0 ? "text-amber-700" : ""}`}>
                      {quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-4 py-3 text-right">{money(numeric(item.unit_cost))}</td>
                    <td className="px-4 py-3 text-right">{money(quantity * numeric(item.unit_cost))}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-gray-100"
                          aria-label={`Edit ${item.item_name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          disabled={deleting || quantity !== 0 || isCore}
                          title={isCore ? "Production-critical materials are protected" : quantity !== 0 ? "Stock must be zero before deletion" : "Delete unused material"}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Delete ${item.item_name}`}
                        >
                          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Safety: stock quantities are not edited here. Use Stock Movements for opening stock, purchases, stock-outs and adjustments so each change is audited. Cement, Chippings, Quarry Dust and Water are protected from rename/unit changes and deletion because the current production workflow depends on their names.
      </p>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="raw-material-dialog-title">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 id="raw-material-dialog-title" className="text-lg font-semibold">
                  {editing ? "Edit Raw Material" : "Add Raw Material"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {editing ? "Update details. Stock quantity is managed separately." : "New items start at zero stock."}
                </p>
              </div>
              <button type="button" onClick={closeModal} disabled={saving} className="rounded-md p-2 hover:bg-gray-100" aria-label="Close dialog">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 p-5">
              {error && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
              )}

              <div>
                <label htmlFor="raw-material-name" className="mb-1 block text-sm font-medium">Material name</label>
                <input
                  id="raw-material-name"
                  required
                  maxLength={120}
                  value={form.item_name}
                  onChange={(event) => setForm((old) => ({ ...old, item_name: event.target.value }))}
                  disabled={nameAndUnitLocked}
                  className="w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label htmlFor="raw-material-unit" className="mb-1 block text-sm font-medium">Unit</label>
                <select
                  id="raw-material-unit"
                  required
                  value={form.unit}
                  onChange={(event) => setForm((old) => ({ ...old, unit: event.target.value }))}
                  disabled={nameAndUnitLocked}
                  className="w-full rounded-lg border bg-white px-3 py-2 disabled:bg-gray-100"
                >
                  {[...new Set([...UNIT_OPTIONS, ...(form.unit && !UNIT_OPTIONS.includes(form.unit) ? [form.unit] : [])])].map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
                {nameAndUnitLocked && (
                  <p className="mt-1 text-xs text-amber-700">
                    Name and unit are locked to protect production recipes or stock history. Unit cost can still be edited.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="raw-material-cost" className="mb-1 block text-sm font-medium">Unit cost (GHS)</label>
                <input
                  id="raw-material-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.unit_cost}
                  onChange={(event) => setForm((old) => ({ ...old, unit_cost: event.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              {editing && (
                <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-600">
                  Current stock: <strong>{numeric(editing.quantity).toLocaleString(undefined, { maximumFractionDigits: 3 })} {editing.unit || ""}</strong>. To change this quantity, use the Stock Movements page.
                </div>
              )}

              <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={closeModal} disabled={saving} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Saving..." : editing ? "Save Changes" : "Add Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
