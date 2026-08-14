"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/services/products";

export default function ProductForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Blocks");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");

  const [saving, setSaving] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Please enter the product name.");
      return;
    }

    if (!size.trim()) {
      alert("Please enter the product size.");
      return;
    }

    const priceNumber = Number(price);

    if (!price || priceNumber <= 0) {
      alert("Please enter a valid selling price.");
      return;
    }

    setSaving(true);

    const { error } = await createProduct({
      name: name.trim(),
      category: category.trim(),
      size: size.trim(),
      price: priceNumber,
    });

    if (error) {
      console.error("Product error:", error);
      alert(error.message);
      setSaving(false);
      return;
    }

    alert("Product added successfully.");

    router.push("/products");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg bg-white p-6 shadow"
    >
      <div>
        <label className="mb-2 block font-medium">
          Product Name
        </label>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border p-3"
          placeholder="Example: 5-inch Hollow Block"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Category
        </label>

        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value)
          }
          className="w-full rounded border p-3"
        >
          <option value="Blocks">Blocks</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Size
        </label>

        <input
          type="text"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="w-full rounded border p-3"
          placeholder="Example: 5-inch"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Selling Price
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded border p-3"
          placeholder="Enter price"
          required
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? "Saving Product..."
          : "Save Product"}
      </button>
    </form>
  );
}