"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readProjectInviteFragment } from "@/lib/project-invite-session";
import { createBrowserClient } from "@supabase/ssr";
import { Brand } from "@/components/public-site/PublicSiteShell";

// Handle exactly one verified callback ourselves. Keep this separate from
// the ordinary browser client's automatic PKCE callback detection.
const supabase=createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { isSingleton:false, auth:{detectSessionInUrl:false} },
);

export default function ProjectAcceptInvitePage() {
  const router=useRouter();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [verifiedUserId,setVerifiedUserId]=useState<string | null>(null);
  const sessionTask=useRef<Promise<string | null> | null>(null);

  useEffect(()=>{
    let mounted=true;
    sessionTask.current ??= (async()=>{
      const url=new URL(window.location.href);
      const invitation=readProjectInviteFragment(url.hash);
      let callbackUserId:string | undefined;
      if(invitation){
        window.history.replaceState(window.history.state,"",url.pathname+url.search);
        const {data,error}=await supabase.auth.setSession(invitation);
        if(error || !data.session) throw new Error("This invitation link has expired or is invalid. Request a fresh password link below.");
        callbackUserId=data.user?.id;
      } else {
        const code=url.searchParams.get("code");
        if(!code) return null;
        const flowId=url.searchParams.get("sb_flow_id") ?? undefined;
        url.searchParams.delete("code");
        url.searchParams.delete("sb_flow_id");
        window.history.replaceState(window.history.state,"",url.pathname+url.search);
        const {data,error}=await supabase.auth.exchangeCodeForSession(code,{flowId});
        if(error || !data.session){
          throw new Error("Open your password link in the browser where you requested it, or request a new one.");
        }
        callbackUserId=data.user?.id;
      }
      const {data:{user},error}=await supabase.auth.getUser();
      if(error || !user || user.id!==callbackUserId) return null;
      const {data:profile,error:profileError}=await supabase.from("profiles")
        .select("role").eq("id",user.id).maybeSingle();
      return !profileError && profile?.role==="project_owner" ? user.id : null;
    })();
    void sessionTask.current.then(userId=>{
      if(mounted){setReady(true);setVerifiedUserId(userId);}
    }).catch((error:unknown)=>{
      if(mounted){
        setReady(true);
        setError(error instanceof Error ? error.message : "This invitation could not be verified.");
      }
    });
    return ()=>{mounted=false};
  },[]);

  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!verifiedUserId || busy)return;
    if(password.length<10 || password!==confirm){setError("Use at least 10 characters and make sure both passwords match.");return;}
    setBusy(true);setError("");
    const {data:{user},error:identityError}=await supabase.auth.getUser();
    if(identityError || user?.id!==verifiedUserId){
      setVerifiedUserId(null);
      setError("The active account changed. Open your own password link or request a new one.");
      setBusy(false);return;
    }
    const {error:authError}=await supabase.auth.updateUser({password});
    if(authError){setError(authError.message);setBusy(false);return;}
    router.replace("/my-projects");router.refresh();
  }
  async function sendReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage("");setError("");
    const {error:resetError}=await supabase.auth.resetPasswordForEmail(email.trim(),{
      redirectTo:window.location.origin+"/project-accept-invite",
    });
    setBusy(false);
    // Keep response neutral about account existence.
    if(resetError) setError("Unable to send a reset link. Try again later.");
    else setMessage("If this account exists, check your email for a password link.");
  }
  return <main className="min-h-screen bg-[#edf1e8] px-5 py-16 text-[#1c3a2c]">
    <div className="mx-auto max-w-md rounded-xl bg-white p-7 shadow-lg sm:p-10">
      <Brand/>
      <h1 className="mt-8 text-3xl font-semibold">Client account access</h1>
      <p className="mt-3 text-sm leading-7 text-[#637667]">Follow the secure email invitation from Rexy to set your account password. Existing clients may request a password reset.</p>
      {!ready ? <p role="status" className="mt-7 text-sm">Checking account access…</p> : verifiedUserId ? <form onSubmit={save} className="mt-7 space-y-4">
        <label className="block text-xs font-bold">New password (10+ characters)
          <input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded border p-3"/>
        </label>
        <label className="block text-xs font-bold">Confirm new password
          <input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 w-full rounded border p-3"/>
        </label>
        <button disabled={busy} type="submit" className="w-full rounded-lg bg-[#173d2d] p-3 font-semibold text-white disabled:opacity-50">{busy?"Saving...":"Set password and open portal"}</button>
      </form> : <form onSubmit={sendReset} className="mt-7 space-y-4">
        <label className="block text-xs font-bold">Email for password reset
          <input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded border p-3"/>
        </label>
        <button disabled={busy} className="w-full rounded-lg bg-[#173d2d] p-3 font-semibold text-white disabled:opacity-50">{busy?"Sending...":"Email a password link"}</button>
      </form>}
      {message && <p role="status" className="mt-4 rounded bg-green-50 p-3 text-xs text-green-800">{message}</p>}
      {error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      <Link href="/project-login" className="mt-7 inline-block text-sm font-semibold underline underline-offset-4">Back to project login</Link>
    </div>
  </main>;
}
