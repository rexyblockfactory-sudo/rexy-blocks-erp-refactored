import { redirect } from "next/navigation";
import { getStaffAccess } from "@/lib/staff-access";
import ClientProjectsDashboard from "@/components/erp/ClientProjectsDashboard";

export const metadata = { title: "Client Projects | Rexy Blocks Factory", robots: { index:false, follow:false } };

export default async function ClientProjectsManagementPage() {
  const access=await getStaffAccess();
  if(access.status==="signed-out")redirect("/login");
  if(access.status!=="staff"||(access.role!=="admin"&&access.role!=="manager"))redirect("/dashboard");
  return <ClientProjectsDashboard role={access.role as "admin"|"manager"}/>;
}
