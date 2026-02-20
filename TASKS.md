# TASKS: B2B Teams SaaS Starter

This task list is broken into small deployable slices.  
Each slice should ship something real a user can see/use.

## How to Use

- Mark `[x]` when done.
- Keep slices small; avoid combining multiple slices into one PR.
- If a slice grows too large, split it before coding.

---

## Slice 01-10: Account + Tenant Foundations

- [x] **S01 - Public auth pages render** [ui][app]
  - User can open `/login`, `/signup`, `/forgot-password` with basic UI.

- [x] **S02 - User can create account** [auth][app]
  - Signup creates Supabase Auth user and lands user in app.

- [x] **S03 - First tenant is created on signup**
  - New user gets a tenant + `Owner` membership automatically.

- [x] **S04 - User can log in and log out**
  - Session lifecycle works; auth state reflected in nav.

- [x] **S05 - Protected routing baseline**
  - Unauthenticated users are redirected from app routes to `/login`.

- [ ] **S06 - Dashboard shell with real user/tenant context**
  - User sees tenant name and their current role in `/dashboard`.

- [ ] **S07 - Basic profile settings** [app][ui]
  - User can update profile info in `/settings/profile`.

- [ ] **S08 - Role-aware nav visibility (tenant side)**
  - Billing/audit/team links appear only for allowed tenant roles.

- [ ] **S09 - Unauthorized route handling UX**
  - Disallowed users get clear “no access” UX (not broken page).

- [ ] **S10 - Tenant settings page (owner/admin only)**
  - Owner/Admin can edit tenant settings in `/settings/tenant`.

---

## Slice 11-20: Team Management + Permissions UX

- [ ] **S11 - Team page list**
  - Owner/Admin can view member list in `/team`.

- [ ] **S12 - Invite member flow**
  - Owner/Admin can send invite; invite appears as pending in UI.

- [ ] **S13 - Accept invite flow**
  - Invited user can join tenant and appears in member list.

- [ ] **S14 - Change member role** [rbac][auth]
  - Owner/Admin can update role between Admin/Member/Viewer.

- [ ] **S15 - Remove/deactivate member**
  - Owner/Admin can remove member from tenant.

- [ ] **S16 - Ownership transfer**
  - Owner can transfer ownership to another eligible member.

- [ ] **S17 - Roles & permissions matrix page**
  - `/roles-permissions` shows read-only matrix for Owner/Admin.

- [ ] **S18 - Core app read/write gating**
  - `Viewer` is read-only in `/app/*`; other roles follow matrix.

- [ ] **S19 - Team actions are blocked for non-admin roles**
  - Member/Viewer cannot see or use team management controls.

- [ ] **S20 - Membership changes reflected immediately**
  - Role/member updates refresh UI without requiring manual relogin.

---

## Slice 21-28: Security + 2FA + Session Management

- [ ] **S21 - Security page shell**
  - `/security` exists with 2FA/session sections.

- [ ] **S22 - User can enroll in 2FA** [security][auth]
  - User can start setup, scan TOTP QR, and complete enrollment.

- [ ] **S23 - User can complete 2FA challenge on login**
  - If enrolled, login requires 2FA challenge step.

- [ ] **S24 - Backup codes flow**
  - User can view/generate backup codes in security screen.

- [ ] **S25 - Session list + revoke**
  - User can view active sessions and revoke selected sessions.

- [ ] **S26 - Optional 2FA policy UX placeholder**
  - Owner/Admin see tenant-level policy area marked “not enforced in v1”.

- [ ] **S27 - Security events visible to user**
  - User can view personal security events in `/security`.

- [ ] **S28 - Auth abuse UX**
  - Rate-limit/captcha failures show clear user-facing error messages.

---

## Slice 29-37: Billing + Stripe + Reliability

- [ ] **S29 - Billing page visible to Owner only**
  - Owner can access `/billing`; others cannot.

- [ ] **S30 - Stripe checkout/session start**
  - Owner can start plan/seat payment flow from billing UI.

- [ ] **S31 - Add/update card details** [billing]
  - Owner can add or update payment method via Stripe flow.

- [ ] **S32 - Billing status card on dashboard**
  - Tenant sees plan/seat summary reflected in dashboard cards.

- [ ] **S33 - Invoices list shown**
  - Owner can see recent invoices in billing page.

- [ ] **S34 - Webhook ingestion endpoint works**
  - Stripe webhook events are accepted and reflected in app state.

- [ ] **S35 - Idempotent webhook behavior** [webhook][billing]
  - Duplicate Stripe events do not create duplicate state changes.

- [ ] **S36 - Failed webhook retry UX in platform**
  - Platform admin can trigger retry from `/platform/webhooks-jobs`.

- [ ] **S37 - Dead-letter visibility**
  - Permanently failed events are visible with basic diagnostics.

---

## Slice 38-47: Tenant Audit Logs + Exports

- [ ] **S38 - Tenant audit event model wired**
  - Key privileged actions produce audit entries.

- [ ] **S39 - Tenant audit logs page UI**
  - Owner/Admin can open `/audit-logs` and view events.

- [ ] **S40 - Audit filters**
  - Owner/Admin can filter by actor/action/date.

- [ ] **S41 - Audit search**
  - Owner/Admin can search audit rows in UI.

- [ ] **S42 - CSV export**
  - Owner/Admin can export tenant audit logs to CSV.

- [ ] **S43 - JSON export**
  - Owner/Admin can export tenant audit logs to JSON.

- [ ] **S44 - Non-admin audit access denied**
  - Member/Viewer cannot access or export audit logs.

- [ ] **S45 - Platform-initiated tenant changes appear in tenant logs**
  - Tenant admins can see operator actions with reason metadata.

- [ ] **S46 - Audit action details panel**
  - User can open an event and see full action metadata.

- [ ] **S47 - Export respects tenant boundary**
  - Export contains only current tenant events.

---

## Slice 48-60: Platform Admin Area (`/platform/*`)

- [ ] **S48 - Platform routes + nav visibility** [platform][security]
  - `/platform/*` routes render only for `PlatformAdmin`.

- [ ] **S49 - Platform dashboard basic KPIs**
  - Admin sees tenant/job/webhook KPI cards.

- [ ] **S50 - Platform tenants list**
  - Search/filter tenants in `/platform/tenants`.

- [ ] **S51 - Platform tenant detail page**
  - View tenant summary, members, billing snapshot.

- [ ] **S52 - Platform can edit tenant member roles** [platform][rbac]
  - Direct write actions work from tenant detail.

- [ ] **S53 - Platform users page**
  - Search global users and inspect memberships.

- [ ] **S54 - Platform billing ops page**
  - Admin can perform manual billing adjustments with reason.

- [ ] **S55 - Platform support page**
  - Admin can open support actions and log ticket reference.

- [ ] **S56 - Platform security/compliance explorer**
  - Admin can view global audit/security event feed.

- [ ] **S57 - Platform webhooks/jobs operations**
  - Admin can inspect and retry failed jobs/events.

- [ ] **S58 - Platform feature flags page**
  - Admin can view/update global and tenant-scoped flags.

- [ ] **S59 - Platform system settings page**
  - Admin can edit policy defaults and retention settings.

- [ ] **S60 - All platform write actions require reason**
  - UI enforces reason field before privileged platform writes.

---

## Slice 61-72: Storage, Analytics, Legal, and Hardening UX

- [ ] **S61 - File upload page in core app**
  - User can upload a file and see it in list.

- [ ] **S62 - Tenant-scoped file visibility**
  - Users only see files in their tenant context.

- [ ] **S63 - Signed download flow**
  - User can download file via signed URL.

- [ ] **S64 - Delete file flow**
  - Authorized user can delete file and it disappears from UI.

- [ ] **S65 - Cookie consent banner**
  - User can accept/reject analytics cookies in visible banner.

- [ ] **S66 - GA gated by consent state** [analytics]
  - Analytics activates only when consent allows.

- [ ] **S67 - Legal pages published**
  - `/privacy`, `/terms`, and placeholder compliance pages accessible.

- [ ] **S68 - Error tracking visible in platform diagnostics**
  - New app errors appear in platform diagnostic surface.

- [ ] **S69 - Security headers/CSP validation page check**
  - Basic in-app status/check route shows header policy is active.

- [ ] **S70 - Auth + critical endpoint rate-limit UX**
  - End users get usable response when hitting rate limits.

- [ ] **S71 - Environment/config validation failure UX**
  - Startup/config issues surface clearly for operators.

- [ ] **S72 - “Starter ready” smoke flow**
  - End-to-end happy path demo works:
    - create account
    - create tenant
    - invite user
    - add card
    - view audit logs
    - access platform pages as platform admin

---

## Parallel QA/Release Tracking Tasks

- [ ] **Q01 - E2E: account creation + login + dashboard access**
- [ ] **Q02 - E2E: invite flow + role change + permissions gating**
- [ ] **Q03 - E2E: owner-only billing + add card**
- [ ] **Q04 - E2E: tenant audit logs + export**
- [ ] **Q05 - E2E: platform admin visibility and write-action reason requirement**
- [ ] **Q06 - E2E: webhook failure + retry path in platform**
- [ ] **Q07 - E2E: viewer cannot perform write actions**
- [ ] **Q08 - E2E: cookie consent behavior**

---

## Current Focus

- [ ] Set current active slice here before coding.
- [ ] Link PR/branch next to each completed slice.
