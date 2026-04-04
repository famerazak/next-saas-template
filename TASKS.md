# TASKS: B2B Teams SaaS Starter

This task list is broken into small deployable slices.  
Each slice should ship something real a user can see/use.

## How to Use

- Mark `[x]` when done.
- Keep slices reviewable; combine adjacent low-risk items when they ship one usable capability.
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

- [x] **S06 - Dashboard shell with real user/tenant context**
  - User sees tenant name and their current role in `/dashboard`.

- [x] **S07 - Basic profile settings** [app][ui]
  - User can update profile info in `/settings/profile`.

- [x] **S08 - Role-aware nav visibility (tenant side)**
  - Billing/audit/team links appear only for allowed tenant roles.

- [x] **S09 - Unauthorized route handling UX**
  - Disallowed users get clear “no access” UX (not broken page).

- [x] **S10 - Tenant settings page (owner/admin only)**
  - Owner/Admin can edit tenant settings in `/settings/tenant`.

---

## Slice 11-20: Team Management + Permissions UX

- [x] **S11 - Team page list**
  - Owner/Admin can view member list in `/team`.

- [x] **S12 - Invite member flow**
  - Owner/Admin can send invite; invite appears as pending in UI.

- [x] **S13 - Accept invite flow + membership refresh** [auth][app]
  - Invited user can join tenant and member list updates without manual relogin.

- [x] **S14 - Change member role + team action blocking** [rbac][auth]
  - Owner/Admin can update role between Admin/Member/Viewer, and Member/Viewer cannot see or use team management controls.

- [x] **S15 - Remove/deactivate member**
  - Owner/Admin can remove member from tenant and the team list reflects the change immediately.

- [x] **S16 - Ownership transfer** [rbac][auth]
  - Owner can transfer ownership to another eligible member.

- [x] **S17 - Roles & permissions matrix page** [rbac][ui]
  - `/roles-permissions` shows read-only matrix for Owner/Admin.

- [x] **S18 - Core app read/write gating** [rbac][app]
  - `Viewer` is read-only in `/app/*`; other roles follow matrix.

---

## Slice 21-28: Security + 2FA + Session Management

- [ ] **S21 - Security page shell + tenant policy placeholder + personal events** [security][ui]
  - `/security` exists with 2FA/session sections, tenant policy placeholder, and personal security event history.

- [ ] **S22 - User can enroll in 2FA** [security][auth]
  - User can start setup, scan TOTP QR, and complete enrollment.

- [ ] **S23 - User can complete 2FA challenge on login** [security][auth]
  - If enrolled, login requires 2FA challenge step.

- [ ] **S24 - Backup codes flow** [security]
  - User can view/generate backup codes in security screen.

- [ ] **S25 - Session list + revoke** [security]
  - User can view active sessions and revoke selected sessions.

- [ ] **S28 - Auth abuse UX** [security][auth]
  - Rate-limit/captcha failures show clear user-facing error messages.

---

## Slice 29-37: Billing + Stripe + Reliability

- [ ] **S29 - Owner billing access + checkout start** [billing]
  - Owner can access `/billing`, others cannot, and owner can start plan/seat checkout from the billing UI.

- [ ] **S31 - Add/update card details** [billing]
  - Owner can add or update payment method via Stripe flow.

- [ ] **S32 - Billing summary + invoices list** [billing][app]
  - Tenant sees plan/seat summary on the dashboard and the owner can view recent invoices in billing.

- [ ] **S35 - Webhook ingestion + idempotent behavior** [webhook][billing]
  - Stripe webhook events are accepted, reflected in app state, and duplicate events do not create duplicate state changes.

- [ ] **S36 - Failed webhook retry + dead-letter visibility** [platform][webhook][billing]
  - Platform admin can retry failed events from `/platform/webhooks-jobs` and inspect dead-letter diagnostics.

---

## Slice 38-47: Tenant Audit Logs + Exports

- [ ] **S38 - Tenant audit event model wired** [app]
  - Key privileged actions produce audit entries.

- [ ] **S39 - Tenant audit logs page + filters/search + non-admin denial** [ui][app]
  - Owner/Admin can open `/audit-logs`, filter/search events, and Member/Viewer are denied access and export actions.

- [ ] **S42 - Audit exports (CSV + JSON) with tenant boundary safety** [app]
  - Owner/Admin can export tenant audit logs to CSV and JSON, and exports contain only current-tenant events.

- [ ] **S45 - Platform-initiated tenant changes appear in tenant logs** [platform][security]
  - Tenant admins can see operator actions with reason metadata.

- [ ] **S46 - Audit action details panel** [ui][app]
  - User can open an event and see full action metadata.

---

## Slice 48-60: Platform Admin Area (`/platform/*`)

- [ ] **S48 - Platform routes + nav visibility** [platform][security]
  - `/platform/*` routes render only for `PlatformAdmin`.

- [ ] **S49 - Platform dashboard + tenants list/detail** [platform][ui]
  - Admin sees KPI cards, can search/filter tenants, and can open tenant detail with members and billing snapshot.

- [ ] **S52 - Platform can edit tenant member roles** [platform][rbac]
  - Direct role-edit actions work from tenant detail and require a reason before privileged writes complete.

- [ ] **S53 - Platform users page** [platform]
  - Search global users and inspect memberships.

- [ ] **S54 - Platform billing/support ops with required reason** [platform][billing]
  - Admin can perform manual billing adjustments and support actions with required reason/ticket context.

- [ ] **S56 - Platform compliance explorer + webhook/job operations** [platform][security][webhook]
  - Admin can view global audit/security events and inspect/retry failed jobs or webhooks.

- [ ] **S58 - Platform feature flags + system settings** [platform]
  - Admin can view/update global and tenant-scoped flags and edit policy/retention defaults.

---

## Slice 61-72: Storage, Analytics, Legal, and Hardening UX

- [ ] **S61 - File upload + tenant-scoped visibility** [storage][app]
  - User can upload a file, see it in a list, and only view files in the current tenant context.

- [ ] **S63 - Signed download flow** [storage]
  - User can download file via signed URL.

- [ ] **S64 - Delete file flow** [storage]
  - Authorized user can delete file and it disappears from UI.

- [ ] **S65 - Cookie consent banner** [analytics][ui]
  - User can accept/reject analytics cookies in visible banner.

- [ ] **S66 - GA gated by consent state** [analytics]
  - Analytics activates only when consent allows.

- [ ] **S67 - Legal pages published** [app]
  - `/privacy`, `/terms`, and placeholder compliance pages accessible.

- [ ] **S68 - Error tracking + security header diagnostics surface** [platform][security]
  - New app errors appear in platform diagnostics and operators can verify header/CSP status from an in-app diagnostic surface.

- [ ] **S70 - Auth + critical endpoint rate-limit UX** [security][auth]
  - End users get usable response when hitting rate limits.

- [ ] **S71 - Environment/config validation failure UX** [security][infra]
  - Startup/config issues surface clearly for operators.

- [ ] **S72 - “Starter ready” smoke flow** [app][ui]
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

- [x] Current active slice: `S18 - Core app read/write gating`
- [ ] Link PR/branch next to each completed slice.
