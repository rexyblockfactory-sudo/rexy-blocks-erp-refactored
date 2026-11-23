export function canManageSupplierCredit(role: string) {
  return ["admin", "manager", "accountant"].includes(role);
}
