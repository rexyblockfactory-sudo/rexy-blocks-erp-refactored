"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/supabase/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  async function handleRegister(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const { error } = await signUp(
      email,
      password
    );

    if (error) {
      alert(error.message);
      return;
    }

    alert("Registration successful.");

    router.push("/login");
  }

  return (
    <div className="mx-auto mt-20 max-w-md rounded-lg border p-8 shadow">
      <h1 className="mb-6 text-3xl font-bold">
        Register
      </h1>

      <form
        onSubmit={handleRegister}
        className="space-y-4"
      >
        <input
          type="email"
          placeholder="Email address"
          className="w-full rounded border p-3"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full rounded border p-3"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button
          type="submit"
          className="w-full rounded bg-black p-3 text-white"
        >
          Register
        </button>
      </form>
    </div>
  );
}