"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/lib/supabase/auth";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } =
      await updatePassword(password);

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    alert("Password updated successfully.");

    router.push("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold">
          Update Password
        </h1>

        <p className="mt-2 text-gray-600">
          Enter your new password below.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >
          <input
            type="password"
            placeholder="New password"
            className="w-full rounded-lg border p-3"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            required
          />

          <input
            type="password"
            placeholder="Confirm new password"
            className="w-full rounded-lg border p-3"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            required
          />

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 font-medium text-white disabled:opacity-50"
          >
            {loading
              ? "Updating..."
              : "Update Password"}
          </button>
        </form>
      </div>
    </main>
  );
}