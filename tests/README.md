Run `npm ci` followed by `npm test` (Node 20 or later).

The quote tests execute the real route handler and Supabase query builder with
an in-memory HTTP fixture. A barrier forces two managers to read the same pending
request before either update, verifying that exactly one succeeds. Other cases
verify that a deposit arriving after the read is preserved and database failures
return a server error.

The sales test runs the original sales function and the follow-up migration in
an isolated PGlite PostgreSQL database. It checks missing profiles, null roles,
unauthorized roles, authorized sales, stock deductions, and RPC execute grants.
It does not connect to a hosted project.

The new `deny_sales_without_staff_role` migration must be applied through the
normal database deployment process after review. Editing application code alone
does not fix an already-deployed sales RPC. The original migration is preserved.
