"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
export default function ProductionForm() {
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [cementUsed, setCementUsed] = useState("");
  const [sandUsed, setSandUsed] = useState("");
  const [quarryDustUsed, setQuarryDustUsed] = useState("");
  const [waterUsed, setWaterUsed] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    console.log("Button clicked");

    const { error } = await supabase.from("production").insert([
      {
        product_name: productName,
        quantity: Number(quantity),
        cement_used: Number(cementUsed),
        sand_used: Number(sandUsed),
        quarry_dust_used: Number(quarryDustUsed),
        water_used: Number(waterUsed),
      },
    ]);
await supabase.rpc("deduct_inventory", {
  cement_qty: Number(cementUsed),
  sand_qty: Number(sandUsed),
  quarry_qty: Number(quarryDustUsed),
  water_qty: Number(waterUsed),
});
await supabase.rpc("add_finished_product", {
  product: productName,
  qty: Number(quantity),
});
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("Production saved successfully.");

    setProductName("");
    setQuantity("");
    setCementUsed("");
    setSandUsed("");
    setQuarryDustUsed("");
    setWaterUsed("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded border p-4"
    >
      <input
        className="w-full rounded border p-2"
        placeholder="Product name"
        value={productName}
        onChange={(e) => setProductName(e.target.value)}
      />

      <input
        className="w-full rounded border p-2"
        placeholder="Quantity produced"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />

      <input
        className="w-full rounded border p-2"
        placeholder="Cement used"
        value={cementUsed}
        onChange={(e) => setCementUsed(e.target.value)}
      />

      <input
        className="w-full rounded border p-2"
        placeholder="Sand used"
        value={sandUsed}
        onChange={(e) => setSandUsed(e.target.value)}
      />

      <input
        className="w-full rounded border p-2"
        placeholder="Quarry dust used"
        value={quarryDustUsed}
        onChange={(e) => setQuarryDustUsed(e.target.value)}
      />

      <input
        className="w-full rounded border p-2"
        placeholder="Water used"
        value={waterUsed}
        onChange={(e) => setWaterUsed(e.target.value)}
      />

      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-white"
      >
        Save Production
      </button>
    </form>
  );
}