"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Boxes, Building2, ClipboardList, Factory, LayoutDashboard, LogOut, Menu, Package, ReceiptText, Users, Wallet, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const groups = [
  { label: "Workspace", links: [{ label: "Overview", href: "/dashboard", icon: LayoutDashboard }] },
  { label: "Sales", links: [
    { label: "New sale", href: "/sales/new", icon: ReceiptText },
    { label: "Sales overview", href: "/sales", icon: Wallet },
    { label: "Sales history", href: "/sales/history", icon: ClipboardList },
    { label: "Website orders", href: "/website-orders", icon: Package },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Invoices", href: "/invoices", icon: ReceiptText },
  ] },
  { label: "Factory", links: [
    { label: "New production", href: "/production", icon: Factory },
    { label: "Production history", href: "/production/history", icon: ClipboardList },
    { label: "Inventory", href: "/inventory", icon: Boxes },
    { label: "Products", href: "/products", icon: Package },
  ] },
  { label: "People", links: [{ label: "Payroll & labour", href: "/payroll", icon: Wallet }] },
];

const projectsGroup = { label: "Client Projects", links: [{ label: "Project progress", href: "/client-projects", icon: ClipboardList }] };
const propertyGroup = { label: "Real Estate", links: [{ label: "Property management", href: "/property-management", icon: Building2 }] };
const adminGroup = { label: "Administration", links: [{ label: "Employees", href: "/employees", icon: Users }] };
const pageTitles: Record<string, string> = { financials: "Financials", receivables: "Receivables", expenses: "Expenses", reports: "Reports", payments: "Payments", settings: "Settings" };

export default function DashboardShell({ children, userRole }: {
  children: React.ReactNode;
  userRole: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const menuOpen = mobileMenuPath === pathname;
  const isAdmin = userRole === "admin";
  const isPropertyStaff = isAdmin || userRole === "manager";
  const sections = [...groups, ...(isPropertyStaff ? [propertyGroup, projectsGroup] : []), ...(isAdmin ? [adminGroup] : [])];
  const activeLink = sections.flatMap(group => group.links)
    .filter(link => pathname === link.href || pathname.startsWith(link.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const title = activeLink?.label ?? pageTitles[pathname.split("/")[1]] ?? "Workspace";

  useEffect(() => {
    if (!isAdmin && pathname.startsWith("/employees")) router.replace("/dashboard");
  }, [isAdmin, pathname, router]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(false);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/login");
      router.refresh();
    } catch {
      setLogoutError(true);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f5] bg-[radial-gradient(ellipse_at_top_right,#e1ede5_0%,transparent_55%),linear-gradient(135deg,#f8faf8_0%,#eef3ef_100%)] text-[#192d26] lg:pl-64">
      <a href="#erp-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-white focus:p-3">Skip to content</a>
      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-[#dfe7e2] bg-white px-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="erp-navigation" onClick={() => setMobileMenuPath(menuOpen ? null : pathname)} className="rounded-lg border border-[#dfe7e2] p-2 lg:hidden">
            {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-widest text-[#63776c] uppercase">Staff workspace</p>
            <p className="truncate text-base font-semibold">{title}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-[#e9f1ec] px-3 py-1.5 text-xs font-semibold text-[#244f3d] capitalize">{userRole === "admin" ? "Administrator" : userRole}</span>
      </header>

      <aside id="erp-navigation" className={`fixed inset-x-0 top-16 bottom-0 z-30 flex-col bg-[#16382c] text-white lg:inset-y-0 lg:right-auto lg:flex lg:w-64 ${menuOpen ? "flex" : "hidden"}`}>
        <Link href="/dashboard" onClick={() => setMobileMenuPath(null)} className="flex items-center gap-3 border-b border-white/15 px-5 py-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e5b961] text-[#16382c]"><Boxes size={21} aria-hidden="true" /></span>
          <span className="text-sm font-bold tracking-wide">Rexy Blocks<span className="mt-0.5 block text-xs font-normal text-[#c1d1c7]">Factory ERP</span></span>
        </Link>
        <nav aria-label="ERP navigation" className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {sections.map(group => (
            <div key={group.label}>
              <p className="px-3 pb-1 text-[10px] font-bold tracking-widest text-[#b4c9bc] uppercase">{group.label}</p>
              {group.links.map(({ label, href, icon: Icon }) => {
                const active = activeLink?.href === href;
                return (
                  <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => setMobileMenuPath(null)} className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-[#f1f5ed] text-[#16382c]" : "text-[#e2ebe5] hover:bg-white/10"}`}>
                    <Icon size={16} aria-hidden="true" />{label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/15 p-3">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#e2ebe5] hover:bg-white/10"><ArrowUpRight size={16} aria-hidden="true" />Public website</Link>
          <button type="button" onClick={handleLogout} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#e2ebe5] hover:bg-white/10 disabled:opacity-60"><LogOut size={16} aria-hidden="true" />{loggingOut ? "Signing out…" : "Sign out"}</button>
          {logoutError && <p role="alert" className="px-3 text-xs text-[#ffddbc]">Could not sign out. Try again.</p>}
        </div>
      </aside>

      <div id="erp-content" tabIndex={-1} className="min-w-0">{children}</div>
    </div>
  );
}
