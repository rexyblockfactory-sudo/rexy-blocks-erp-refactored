"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ClientPortalSignOut() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <button type="button" disabled={busy}
    onClick={async () => {
      setBusy(true);
      const { error } = await supabase.auth.signOut();
      if (!error) { router.replace("/project-login"); router.refresh(); }
      else setBusy(false);
    }}
    className="rounded-lg border border-[#b8cbbf] px-4 py-2 text-xs font-semibold text-[#244a35] hover:bg-[#e7efe6] disabled:opacity-50">
    {busy ? "Signing out..." : "Sign out"}
  </button>;
}
