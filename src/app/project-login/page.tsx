"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Brand } from "@/components/public-site/PublicSiteShell";

export default function ProjectLoginPage() {
  const router=useRouter();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);setError("");
    const result=await supabase.auth.signInWithPassword({email:email.trim(),password});
    if (result.error) {setError("Unable to sign in. Check your email and password, or use your invitation link.");setBusy(false);return;}
    router.replace("/my-projects");router.refresh();
  }
  return <main className="min-h-screen bg-[#edf1e8] px-5 py-14 text-[#1c3a2c]">
    <div className="mx-auto max-w-md rounded-2xl border border-[#d2ddd1] bg-white p-7 shadow-xl shadow-[#284f3511] sm:p-10">
      <Brand/>
      <p className="mt-10 text-xs font-bold uppercase tracking-[.19em] text-[#a37938]">Private construction updates</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Project owner login</h1>
      <p className="mt-3 text-sm leading-7 text-[#607365]">Track progress, construction milestones and photos for projects Rexy has connected to your account.</p>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <label className="block text-xs font-bold">Email address
          <input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="you@example.com" className="mt-2 block w-full rounded-lg border border-[#cad6c8] px-4 py-3 text-sm"/>
        </label>
        <label className="block text-xs font-bold">Password
          <input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}
            className="mt-2 block w-full rounded-lg border border-[#cad6c8] px-4 py-3 text-sm" />
        </label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-[#173d2d] px-5 py-3 font-semibold text-white disabled:opacity-50">
          {busy ? "Signing in..." : "View my projects ↗"}
        </button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-xs">
        <Link href="/project-accept-invite" className="font-semibold underline underline-offset-4">Set or reset password</Link>
        <Link href="/" className="font-semibold underline underline-offset-4">Return to website</Link>
      </div>
      <p className="mt-7 border-t pt-5 text-xs leading-6 text-[#728275]">Access is granted only to owners Rexy staff have linked to their project. This is separate from staff ERP accounts.</p>
    </div>
  </main>;
}
