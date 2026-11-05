import Link from "next/link";
import { redirect } from "next/navigation";
import PublicSiteShell from "@/components/public-site/PublicSiteShell";
import { getStaffAccess } from "@/lib/staff-access";

export const metadata = { title: "Staff ERP", description: "Staff access to Rexy Blocks Factory operations.", robots: { index: false, follow: false } };

export default async function ErpPage() {
  const access = await getStaffAccess();
  if (access.status === "staff") redirect("/dashboard");
  return <PublicSiteShell><main className="rf-container rf-catalogue"><header className="rf-page-head"><p className="rf-eyebrow">REXY BLOCKS FACTORY · STAFF WORKSPACE</p><h1 className="rf-page-title">Staff ERP</h1><p>Manage factory operations and customer requests in one place. Sign in with your approved staff account to access the dashboard.</p><div className="rf-hero-actions"><Link href="/login" className="rf-button rf-button-dark">Sign in to staff ERP ↗</Link><Link href="/order" className="rf-button rf-button-outline">Customer quotation form</Link></div></header>
    {access.status === "denied" && <p className="rf-empty" role="alert">Your current account does not have ERP access. Ask a factory administrator to check your staff role.</p>}
    <section className="rf-section"><p className="rf-eyebrow">INSIDE THE WORKSPACE</p><h2>From the website to the factory.</h2><div className="rf-steps"><article className="rf-step"><span className="rf-step-number">01</span><h3>Website orders</h3><p>Review requests from the public quotation form, issue quotes, verify deposits and accept orders for conversion.</p></article><article className="rf-step"><span className="rf-step-number">02</span><h3>Production & inventory</h3><p>Track production and available stock so staff can confirm what can be supplied.</p></article><article className="rf-step"><span className="rf-step-number">03</span><h3>Sales & invoices</h3><p>Convert eligible website orders to sales and invoices. Manage payments and remaining balances in the ERP.</p></article></div></section>
  </main></PublicSiteShell>;
}
