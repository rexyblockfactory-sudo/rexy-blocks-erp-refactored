"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Brand } from "@/components/public-site/PublicSiteShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setErrorMessage("Could not sign in. Check your staff email and password.");
        setLoading(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("Sign-in is temporarily unavailable. Please try again.");
      setLoading(false);
    }
  }

  return <main className="rf-site rf-login"><section className="rf-login-panel"><Brand/><h1>Staff ERP sign in</h1><p>Use your approved Rexy Blocks staff account to access factory operations and website orders.</p><form onSubmit={handleLogin}>
    <label>Staff email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/></label>
    <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"/></label>
    {errorMessage && <p className="rf-login-error" role="alert">{errorMessage}</p>}
    <button className="rf-button rf-button-dark" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
  </form><div className="rf-login-links"><Link href="/forget-password">Forgot password?</Link><Link href="/">Back to the public website</Link></div></section></main>;
}
