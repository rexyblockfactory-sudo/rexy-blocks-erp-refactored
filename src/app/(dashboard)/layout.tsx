import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/erp/DashboardShell";
import { getStaffAccess } from "@/lib/staff-access";

export const metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const access = await getStaffAccess();
  if (access.status === "signed-out") redirect("/login");
  if (access.status !== "staff") {
    return <main className="mx-auto max-w-lg px-6 py-20">
      <h1 className="text-3xl font-bold">Staff access required</h1>
      <p className="mt-4">Ask a Rexy Blocks administrator to verify your account role.</p>
      <Link href="/login" className="mt-6 inline-block underline">Sign in with another account</Link>
    </main>;
  }
  return <DashboardShell userRole={access.role}>{children}</DashboardShell>;
}
