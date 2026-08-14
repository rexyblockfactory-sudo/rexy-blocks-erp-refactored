# Rexy Blocks ERP Refactor

This package contains the first safe refactor pass based on the uploaded source tree.

## Changes made

- Updated `tsconfig.json` so `@/*` resolves to `src/*`.
- Fixed the dashboard page syntax and removed the duplicated statistics cards.
- Extracted dashboard sections into reusable components:
  - `src/components/dashboard/DashboardStats.tsx`
  - `src/components/dashboard/LowStock.tsx`
  - `src/components/dashboard/RecentSales.tsx`
  - `src/components/dashboard/ProductionHistory.tsx`
- Added `src/types/dashboard.ts` for shared dashboard types.
- Removed broken/unused dashboard scaffold files that contained duplicate `DashboardPage` implementations.
- Corrected the Customers page to match the known Supabase schema: `phone`, `address`, `customer_type`, `balance`.
- Corrected the Products page to match the known Supabase schema: `name`, `category`, `size`, `price`.
- Removed invalid placeholder service implementations (`const sales = await getSales();`) and left safe placeholders for later service migration.

## Not changed

- Supabase database schema/data.
- Authentication behavior.
- Existing route paths.
- Existing package dependencies.
- Sales, invoices, inventory, production, expenses, and report business logic beyond the files listed above.

## Before replacing your local project

1. Make a Git commit or backup of the current working project.
2. Replace the corresponding files from this package.
3. Run `npm install` if `node_modules` is not present.
4. Run `npm run dev`.
5. Verify Dashboard, Customers, and Products before continuing the refactor.

The service files are intentionally not wired into pages yet; the next pass should migrate one module at a time so existing behavior is preserved.
