export type UserRole =
  | "admin"
  | "manager"
  | "operator"
  | "production_staff"
  | "accountant";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  manager: "Manager",
  operator: "Operator",
  production_staff: "Production Staff",
  accountant: "Accountant",
};

export const ROLE_PERMISSIONS: Record<
  UserRole,
  string[]
> = {
  admin: [
    "dashboard",
    "customers",
    "products",
    "production",
    "inventory",
    "sales",
    "invoices",
    "expenses",
    "reports",
    "settings",
  ],

  manager: [
    "dashboard",
    "customers",
    "products",
    "production",
    "inventory",
    "sales",
    "invoices",
    "expenses",
    "reports",
  ],

  operator: [
    "dashboard",
    "customers",
    "sales",
    "invoices",
  ],

  production_staff: [
    "dashboard",
    "production",
    "inventory",
  ],

  accountant: [
    "dashboard",
    "sales",
    "invoices",
    "expenses",
    "reports",
  ],
};

export function hasPermission(
  role: UserRole,
  permission: string
): boolean {
  return (
    ROLE_PERMISSIONS[role]?.includes(permission) ??
    false
  );
}