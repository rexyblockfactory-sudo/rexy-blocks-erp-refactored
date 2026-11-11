import { redirect } from "next/navigation";
import { getStaffAccess } from "@/lib/staff-access";
import PropertyAdmin from "@/components/erp/PropertyAdmin";

export const metadata = { title: "Property Management | Rexy Blocks Factory", robots: { index: false, follow: false } };

export default async function PropertyManagementPage() {
  const access = await getStaffAccess();
  if (access.status !== "staff") redirect("/login");
  if (access.role !== "admin" && access.role !== "manager") redirect("/dashboard");
  return <PropertyAdmin role={access.role as "admin" | "manager"} />;
}
