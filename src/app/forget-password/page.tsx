"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/supabase/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    const { error } = await resetPassword(email);

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      "If an account exists for this email, a password reset link has been sent."
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold">
          Forgot Password
        </h1>

        <p className="mt-2 text-gray-600">
          Enter your email address and we'll send you a
          password reset link.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >
          <input
            type="email"
            placeholder="Email address"
            className="w-full rounded-lg border p-3"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
          />

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 font-medium text-white disabled:opacity-50"
          >
            {loading
              ? "Sending..."
              : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}