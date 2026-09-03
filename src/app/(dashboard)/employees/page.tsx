"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Employee = {
  id: string;
  full_name: string;
  role: string;
  email: string | null;
  created_at: string;
};

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    void checkAccessAndLoad();
  }, []);

  async function checkAccessAndLoad() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();

      if (profile?.role?.toLowerCase() !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setIsAdmin(true);
      await loadEmployees();
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees").select("*")
      .order("created_at", { ascending: false });
    if (error) { setMessage(error.message); return; }
    setEmployees((data || []) as Employee[]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("employees").insert({
      full_name: fullName.trim(),
      role: role.trim(),
      email: email.trim() || null,
    });
    setSaving(false);

    if (error) { setMessage(error.message); return; }

    setFullName(""); setRole(""); setEmail("");
    await loadEmployees();
    setMessage("Employee added successfully.");
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete ${name}?`)) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) { setMessage(error.message); return; }
    await loadEmployees();
    setMessage("Employee deleted successfully.");
  }

  if (loading) return <div className="p-6 lg:p-8">Loading employees...</div>;

  if (!isAdmin) return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Access Restricted</h1>
      <p className="mt-2 text-gray-600">Only administrators can manage employees.</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
        <p className="mt-2 text-gray-600">Manage Rexy Blocks Factory employees.</p>
      </div>

      {message && <div className="mb-6 rounded-lg border bg-white p-4">{message}</div>}

      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold">Add New Employee</h2>
        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name" className="rounded-lg border px-4 py-3" required />
          <input value={role} onChange={(e) => setRole(e.target.value)}
            placeholder="Role" className="rounded-lg border px-4 py-3" required />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" className="rounded-lg border px-4 py-3 md:col-span-2" />
          <button type="submit" disabled={saving}
            className="rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white md:col-span-2">
            {saving ? "Adding Employee..." : "Add Employee"}
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-xl font-bold">Employee List</h2>
          <p className="text-sm text-gray-500">Total Employees: {employees.length}</p>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Date Added</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-t">
                <td className="px-6 py-4">{employee.full_name}</td>
                <td className="px-6 py-4">{employee.role}</td>
                <td className="px-6 py-4">{employee.email || "-"}</td>
                <td className="px-6 py-4">{new Date(employee.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <button type="button"
                    onClick={() => void handleDelete(employee.id, employee.full_name)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-white">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
