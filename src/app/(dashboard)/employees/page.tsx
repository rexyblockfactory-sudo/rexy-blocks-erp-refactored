"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Employee = {
  id: string;
  full_name: string;
  job_title: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  payment_type: string | null;
  salary: number | null;
  monthly_salary: number | null;
  daily_allowance: number | null;
  employment_start_date: string | null;
  status: string | null;
  created_at: string;
};

type EmployeeForm = {
  full_name: string;
  job_title: string;
  role: string;
  phone: string;
  email: string;
  address: string;
  payment_type: string;
  monthly_salary: string;
  daily_allowance: string;
  employment_start_date: string;
  status: string;
};

const emptyForm: EmployeeForm = {
  full_name: "",
  job_title: "",
  role: "",
  phone: "",
  email: "",
  address: "",
  payment_type: "Monthly",
  monthly_salary: "",
  daily_allowance: "",
  employment_start_date: "",
  status: "Active",
};

export default function EmployeesPage() {
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [form, setForm] =
    useState<EmployeeForm>(emptyForm);

  const [editingEmployee, setEditingEmployee] =
    useState<Employee | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    void initializePage();
  }, []);

  async function initializePage() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (profileError) {
        console.error(profileError);
        setErrorMessage(
          "Unable to verify administrator permissions."
        );
        return;
      }

      if (
        profile?.role?.toLowerCase() !== "admin"
      ) {
        router.replace("/dashboard");
        return;
      }

      setIsAdmin(true);

      await loadEmployees();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Failed to load employee information."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      setErrorMessage(
        `Failed to load employees: ${error.message}`
      );

      return;
    }

    setEmployees((data || []) as Employee[]);
  }

  function updateForm(
    field: keyof EmployeeForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function clearMessages() {
    setMessage("");
    setErrorMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearMessages();

    if (!form.full_name.trim()) {
      setErrorMessage(
        "Employee full name is required."
      );
      return;
    }

    if (!form.job_title.trim()) {
      setErrorMessage(
        "Job title is required."
      );
      return;
    }

    try {
      setSaving(true);

      const employeeData = {
        full_name: form.full_name.trim(),

        job_title: form.job_title.trim(),

        role:
          form.role.trim() ||
          form.job_title.trim(),

        phone:
          form.phone.trim() || null,

        email:
          form.email.trim() || null,

        address:
          form.address.trim() || null,

        payment_type:
          form.payment_type || "Monthly",

        monthly_salary:
          Number(form.monthly_salary) || 0,

        salary:
          Number(form.monthly_salary) || 0,

        daily_allowance:
          Number(form.daily_allowance) || 0,

        employment_start_date:
          form.employment_start_date || null,

        status:
          form.status || "Active",
      };

      if (editingEmployee) {
        const { error } = await supabase
          .from("employees")
          .update(employeeData)
          .eq("id", editingEmployee.id);

        if (error) {
          throw error;
        }

        setMessage(
          "Employee updated successfully."
        );
      } else {
        const { error } = await supabase
          .from("employees")
          .insert(employeeData);

        if (error) {
          throw error;
        }

        setMessage(
          "Employee added successfully."
        );
      }

      setForm(emptyForm);

      setEditingEmployee(null);

      await loadEmployees();
    } catch (error: any) {
      console.error(error);

      setErrorMessage(
        error?.message ||
          "Failed to save employee."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(employee: Employee) {
    clearMessages();

    setEditingEmployee(employee);

    setForm({
      full_name:
        employee.full_name || "",

      job_title:
        employee.job_title ||
        employee.role ||
        "",

      role:
        employee.role ||
        employee.job_title ||
        "",

      phone:
        employee.phone || "",

      email:
        employee.email || "",

      address:
        employee.address || "",

      payment_type:
        employee.payment_type ||
        "Monthly",

      monthly_salary:
        String(
          employee.monthly_salary ??
            employee.salary ??
            0
        ),

      daily_allowance:
        String(
          employee.daily_allowance ?? 0
        ),

      employment_start_date:
        employee.employment_start_date || "",

      status:
        employee.status || "Active",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    setEditingEmployee(null);

    setForm(emptyForm);

    clearMessages();
  }

  async function toggleStatus(
    employee: Employee
  ) {
    clearMessages();

    const currentStatus =
      employee.status || "Active";

    const newStatus =
      currentStatus === "Active"
        ? "Inactive"
        : "Active";

    try {
      const { error } = await supabase
        .from("employees")
        .update({
          status: newStatus,
        })
        .eq("id", employee.id);

      if (error) {
        throw error;
      }

      setMessage(
        `${employee.full_name} is now ${newStatus}.`
      );

      await loadEmployees();
    } catch (error: any) {
      console.error(error);

      setErrorMessage(
        error?.message ||
          "Failed to update employee status."
      );
    }
  }

  async function handleDelete(
    employee: Employee
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${employee.full_name}?`
    );

    if (!confirmed) {
      return;
    }

    clearMessages();

    try {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", employee.id);

      if (error) {
        throw error;
      }

      setMessage(
        `${employee.full_name} was deleted successfully.`
      );

      await loadEmployees();

      if (
        editingEmployee?.id === employee.id
      ) {
        cancelEdit();
      }
    } catch (error: any) {
      console.error(error);

      setErrorMessage(
        error?.message ||
          "Failed to delete employee."
      );
    }
  }

  const activeEmployees =
    employees.filter(
      (employee) =>
        employee.status === "Active"
    );

  const inactiveEmployees =
    employees.filter(
      (employee) =>
        employee.status === "Inactive"
    );

  const totalMonthlyPayroll =
    activeEmployees.reduce(
      (total, employee) =>
        total +
        Number(
          employee.monthly_salary ??
            employee.salary ??
            0
        ),
      0
    );

  const totalDailyAllowance =
    activeEmployees.reduce(
      (total, employee) =>
        total +
        Number(
          employee.daily_allowance ?? 0
        ),
      0
    );

  function formatMoney(value: number) {
    return `GH₵${Number(value || 0).toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          Loading employees...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">
            Access Restricted
          </h1>

          <p className="mt-2 text-gray-600">
            Only administrators can manage
            employees.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* HEADER */}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Employees
        </h1>

        <p className="mt-2 text-gray-600">
          Manage Rexy Blocks Factory employees,
          salaries, allowances and employment
          information.
        </p>
      </div>

      {/* STATISTICS */}

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Employees
          </p>

          <p className="mt-2 text-3xl font-bold">
            {employees.length}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Active Employees
          </p>

          <p className="mt-2 text-3xl font-bold text-green-600">
            {activeEmployees.length}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Inactive: {inactiveEmployees.length}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Monthly Payroll
          </p>

          <p className="mt-2 text-xl font-bold">
            {formatMoney(totalMonthlyPayroll)}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Daily Allowances
          </p>

          <p className="mt-2 text-xl font-bold">
            {formatMoney(totalDailyAllowance)}
          </p>
        </div>
      </div>

      {/* SUCCESS MESSAGE */}

      {message && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
          {message}
        </div>
      )}

      {/* ERROR MESSAGE */}

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          {errorMessage}
        </div>
      )}

      {/* ADD / EDIT EMPLOYEE */}

      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editingEmployee
                ? "Edit Employee"
                : "Add New Employee"}
            </h2>

            <p className="text-sm text-gray-500">
              {editingEmployee
                ? `Editing ${editingEmployee.full_name}`
                : "Create a new employee record."}
            </p>
          </div>

          {editingEmployee && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 md:grid-cols-2"
        >
          {/* FULL NAME */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Full Name *
            </label>

            <input
              type="text"
              value={form.full_name}
              onChange={(event) =>
                updateForm(
                  "full_name",
                  event.target.value
                )
              }
              placeholder="Employee full name"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              required
            />
          </div>

          {/* JOB TITLE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Job Title *
            </label>

            <input
              type="text"
              value={form.job_title}
              onChange={(event) =>
                updateForm(
                  "job_title",
                  event.target.value
                )
              }
              placeholder="Manager, Operator, Worker"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              required
            />
          </div>

          {/* ROLE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Role
            </label>

            <input
              type="text"
              value={form.role}
              onChange={(event) =>
                updateForm(
                  "role",
                  event.target.value
                )
              }
              placeholder="Manager, Staff, Worker"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
            />
          </div>

          {/* PHONE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Phone Number
            </label>

            <input
              type="tel"
              value={form.phone}
              onChange={(event) =>
                updateForm(
                  "phone",
                  event.target.value
                )
              }
              placeholder="+233..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
            />
          </div>

          {/* EMAIL */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Email
            </label>

            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                updateForm(
                  "email",
                  event.target.value
                )
              }
              placeholder="employee@email.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
            />
          </div>

          {/* PAYMENT TYPE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Payment Type
            </label>

            <select
              value={form.payment_type}
              onChange={(event) =>
                updateForm(
                  "payment_type",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
            >
              <option value="Monthly">
                Monthly
              </option>

              <option value="Daily">
                Daily
              </option>

              <option value="Per Block">
                Per Block
              </option>

              <option value="Contract">
                Contract
              </option>
            </select>
          </div>

          {/* MONTHLY SALARY */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Monthly Salary (GH₵)
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monthly_salary}
              onChange={(event) =>
                updateForm(
                  "monthly_salary",
                  event.target.value
                )
              }
              placeholder="2500"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
            />
          </div>

          {/* DAILY ALLOWANCE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Daily Allowance (GH₵)
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.daily_allowance}
              onChange={(event) =>
                updateForm(
                  "daily_allowance",
                  event.target.value
                )
              }
              placeholder="130"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
            />
          </div>

          {/* START DATE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Employment Start Date
            </label>

            <input
              type="date"
              value={form.employment_start_date}
              onChange={(event) =>
                updateForm(
                  "employment_start_date",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
            />
          </div>

          {/* STATUS */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Status
            </label>

            <select
              value={form.status}
              onChange={(event) =>
                updateForm(
                  "status",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
            >
              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>
          </div>

          {/* ADDRESS */}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">
              Address
            </label>

            <textarea
              value={form.address}
              onChange={(event) =>
                updateForm(
                  "address",
                  event.target.value
                )
              }
              placeholder="Employee residential address"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
            />
          </div>

          {/* SUBMIT */}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingEmployee
                  ? "Update Employee"
                  : "Add Employee"}
            </button>
          </div>
        </form>
      </div>

      {/* EMPLOYEE TABLE */}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900">
            Employee List
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Total Employees: {employees.length}
          </p>
        </div>

        {employees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No employees have been added yet.
          </div>
        ) : (
          <table className="w-full min-w-[1300px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-sm font-semibold">
                  Name
                </th>

                <th className="px-5 py-4 text-left text-sm font-semibold">
                  Job Title
                </th>

                <th className="px-5 py-4 text-left text-sm font-semibold">
                  Phone
                </th>

                <th className="px-5 py-4 text-left text-sm font-semibold">
                  Email
                </th>

                <th className="px-5 py-4 text-left text-sm font-semibold">
                  Payment
                </th>

                <th className="px-5 py-4 text-right text-sm font-semibold">
                  Monthly Salary
                </th>

                <th className="px-5 py-4 text-right text-sm font-semibold">
                  Daily Allowance
                </th>

                <th className="px-5 py-4 text-center text-sm font-semibold">
                  Status
                </th>

                <th className="px-5 py-4 text-right text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {employees.map((employee) => {
                const salary =
                  Number(
                    employee.monthly_salary ??
                      employee.salary ??
                      0
                  );

                const allowance =
                  Number(
                    employee.daily_allowance ?? 0
                  );

                const status =
                  employee.status || "Active";

                return (
                  <tr
                    key={employee.id}
                    className="border-t border-gray-200"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900">
                        {employee.full_name}
                      </div>

                      {employee.employment_start_date && (
                        <div className="mt-1 text-xs text-gray-500">
                          Started:{" "}
                          {new Date(
                            employee.employment_start_date
                          ).toLocaleDateString()}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {employee.job_title ||
                        employee.role ||
                        "-"}
                    </td>

                    <td className="px-5 py-4">
                      {employee.phone || "-"}
                    </td>

                    <td className="px-5 py-4">
                      {employee.email || "-"}
                    </td>

                    <td className="px-5 py-4">
                      {employee.payment_type ||
                        "Monthly"}
                    </td>

                    <td className="px-5 py-4 text-right font-medium">
                      {formatMoney(salary)}
                    </td>

                    <td className="px-5 py-4 text-right font-medium">
                      {formatMoney(allowance)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span
                        className={
                          status === "Active"
                            ? "inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700"
                            : "inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
                        }
                      >
                        {status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(employee)
                          }
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleStatus(employee)
                          }
                          className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
                        >
                          {status === "Active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(employee)
                          }
                          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}