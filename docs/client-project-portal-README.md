# Rexy Project Owner Portal (development)

This is **not** a public project directory. All client project information is private.

## Scope
- Staff-only project creation, progress updates, milestone management and private photo uploads.
- Owners can sign in using Supabase Auth and view only assigned project records.
- Administrator-only linking of owner accounts by verified email; new accounts receive a Supabase invitation email.
- Photo files use private Supabase Storage; only short-lived signed links are created after owner membership checks.
- No payments, quotations, invoice sharing, inventory adjustments, subcontractor management, payroll, or automatic progress claims.
- No real client projects or demo project owners are seeded.

## Setup
1. Verify Rexy Supabase project qgyenqihqlcvikcyglxb and back up as appropriate.
2. Supabase migrations HAVE BEEN APPLIED to project qgyenqihqlcvikcyglxb on 2026-11-13:
   - create_rexy_client_project_portal
   - rexy_client_project_progress_atomic
   Do not rerun the SQL without first reviewing current migration history. The migrations touch only client_ tables/function and the client-project-media bucket.
3. Check the private bucket, service-role-only table grants and zero public policies.
4. Preview branch feature/client-project-progress-portal on Vercel; verify staff admin access, and that customers cannot see ERP or another owner's projects.
5. Configure the Supabase Auth redirect allowlist with the exact production callback `https://rexyblockfactory.com/project-accept-invite` and the exact callback of the protected Vercel preview for invite tests. Keep the existing staff redirect entries and Site URL. The portal invite uses a server-selected host, and the callback handles Supabase's invitation fragment separately from browser-bound password recovery.
6. Test with two consenting test accounts and separate test projects; confirm cross-project URLs return 404, revoked users lose access, and no photos leak to the public.
7. Promote only after staff review. Do not send real invitations before clients approve onboarding.

## Owner/ERP separation
- Apply the `isolate_project_owners_from_erp` migration before deploying this branch. All newly created accounts start as `unassigned`; only a successful administrator enrollment grants `project_owner` and project membership together. Existing staff roles are not changed.
- Owner access requires both the owner profile role and a project membership. The ERP staff gate checks the current database profile, not editable Auth metadata. Owner profiles cannot be converted into staff identities; use a separate staff account.
- The migration hardens currently exposed ERP objects. Future ERP tables, views and functions must be granted explicitly or preserve the same staff-only policy/guard. Public product browsing, verified property listings, and public order submission are intentional exceptions.
- Run `npm test` for the two-owner and database regression suite. The tests use isolated fixtures and do not send mail or write to the hosted ERP. Before onboarding real clients, verify actual invitation delivery and callback, successful sign-in in two separate browser sessions, cross-project denial, staff access, and private photo handling.

## Working with real projects
- Signed-in administrator creates the project in /client-projects.
- Upload dated construction photos, add milestones and publish clear progress updates.
- The admin chooses Invite / link owner with the correct email. The linked client then signs in at /project-login.
- Client can view /my-projects and individual progress pages. They cannot edit records or self-join projects.
- Avoid putting deeds, passports, financial data or private addresses in photos or updates.

## Release state
- Preview branch only; no production Vercel release requested yet.
- Supabase client_project* tables contain zero records after migration; no owner invitations were sent.
- ERP inventory, movements, sales and block orders remain unchanged.
- Administrator can revoke memberships, hide an incorrect update, or delete a private photo.
