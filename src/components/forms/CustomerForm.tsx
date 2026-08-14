"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomer } from "@/services/customers";

export default function CustomerForm() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [customerType, setCustomerType] =
    useState("Retail");
  const [balance, setBalance] = useState("0");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!customerName.trim()) {
      alert("Please enter the customer name.");
      return;
    }

    setSaving(true);

    const { error } = await createCustomer({
      customer_name: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      customer_type: customerType,
      balance: Number(balance) || 0,
    });

    if (error) {
      console.error("Customer error:", error);
      alert(error.message);
      setSaving(false);
      return;
    }

    alert("Customer added successfully.");

    router.push("/customers");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg bg-white p-6 shadow"
    >
      <div>
        <label className="mb-2 block font-medium">
          Customer Name
        </label>

        <input
          type="text"
          value={customerName}
          onChange={(e) =>
            setCustomerName(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Enter customer name"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Phone
        </label>

        <input
          type="text"
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Enter phone number"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Address
        </label>

        <input
          type="text"
          value={address}
          onChange={(e) =>
            setAddress(e.target.value)
          }
          className="w-full rounded border p-3"
          placeholder="Enter address"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Customer Type
        </label>

        <select
          value={customerType}
          onChange={(e) =>
            setCustomerType(e.target.value)
          }
          className="w-full rounded border p-3"
        >
          <option value="Retail">Retail</option>
          <option value="Wholesale">
            Wholesale
          </option>
          <option value="Contractor">
            Contractor
          </option>
        </select>
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Opening Balance
        </label>

        <input
          type="number"
          step="0.01"
          min="0"
          value={balance}
          onChange={(e) =>
            setBalance(e.target.value)
          }
          className="w-full rounded border p-3"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? "Saving Customer..."
          : "Save Customer"}
      </button>
    </form>
  );
}