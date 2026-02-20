# PRD: B2B Teams SaaS Starter (Next.js + Supabase)

## 1. Product Summary

Build a reusable B2B SaaS starter template with:
- Product app experience for customer tenants.
- Internal platform admin area inside the same app.
- Team-based access control with default roles.
- Optional 2FA setup (enabled, not enforced by default).
- Compliance-oriented defaults for ISO/HIPAA-style requirements.

This PRD defines default UI, role behavior, and acceptance criteria for v1.

## 2. Goals

1. Ship a production-ready baseline app teams can clone repeatedly.
2. Support owner/admin/member/viewer role patterns out of the box.
3. Support internal operations workflows in `/platform/*` routes.
4. Provide auditable behavior for sensitive admin and billing actions.
5. Include all baseline platform capabilities discussed (items 1-12).

## 3. Non-Goals (v1)

1. Custom tenant-defined roles (v2).
2. Forced 2FA for all users (v2 policy option).
3. Separate ops domain/app (explicitly out for v1).
4. Certification guarantee (ISO/HIPAA also needs process/legal controls).

## 4. User Types and Role Model

## 4.1 Tenant Roles (per tenant)
- `Owner`
- `Admin`
- `Member`
- `Viewer`

## 4.2 Platform Role (global)
- `PlatformAdmin` (internal operator role)

## 4.3 Identity Model
- One user identity can have:
  - tenant roles in one or more tenants.
  - global platform role.
- Platform role does not replace tenant role; both contexts can exist for one user.

## 5. Permissions Decisions (Locked)

1. Roles page is view-only in v1 (no custom role editing).
2. Team management: `Owner` + `Admin`.
3. Ownership transfer: `Owner` only.
4. Billing management: `Owner` only.
5. Tenant audit logs: `Owner` + `Admin` only, including export.
6. 2FA setup available to all users; not mandatory by default.
7. Platform admin area is in same app (no separate domain).
8. Platform nav/routes are hidden unless user has platform role.
9. Platform users may also belong to customer tenants.
10. Platform pages allow direct read/write actions.

## 6. Information Architecture

## 6.1 Product App Routes
- `/login`
- `/signup`
- `/forgot-password`
- `/2fa/setup`
- `/2fa/challenge`
- `/dashboard`
- `/app/*` (core app feature area placeholder)
- `/team`
- `/roles-permissions`
- `/security`
- `/billing`
- `/audit-logs`
- `/settings/profile`
- `/settings/tenant`

## 6.2 Platform Routes (internal)
- `/platform/dashboard`
- `/platform/tenants`
- `/platform/tenants/:tenantId`
- `/platform/users`
- `/platform/billing`
- `/platform/support`
- `/platform/security-compliance`
- `/platform/webhooks-jobs`
- `/platform/feature-flags`
- `/platform/system-settings`

## 7. Product App: Screen Checklist and Acceptance Criteria

## 7.1 Authentication (`/login`, `/signup`, `/forgot-password`, `/2fa/*`)
### Components
- Email/password auth forms.
- 2FA setup screen (TOTP QR + backup codes).
- 2FA challenge input screen.
- Session error and lockout messages.

### Acceptance Criteria
1. Users can authenticate with Supabase Auth.
2. If 2FA is enabled for user, login requires valid 2FA challenge.
3. 2FA enrollment can be started/cancelled by user.
4. Backup codes are shown once and can be regenerated.
5. Auth events write audit entries.

## 7.2 Dashboard (`/dashboard`)
### Audience
- `Owner`, `Admin`, `Member`, `Viewer`

### Components
- Tenant summary cards (users, seats, plan, recent activity).
- Product usage snapshot.
- Security notices (2FA status, suspicious sign-ins).
- Operational alerts (failed jobs/webhooks relevant to tenant).

### Acceptance Criteria
1. Dashboard data is tenant-scoped only.
2. Cards and actions respect role permissions.
3. No cross-tenant data can appear.

## 7.3 Core App Area (`/app/*`)
### Audience
- All roles, with feature-level gating.

### Components
- Placeholder feature modules with read/write controls.
- Role-aware action buttons.

### Acceptance Criteria
1. `Viewer` only sees read-only actions.
2. `Member` sees normal app actions but no team/billing/audit admin actions.
3. Permission checks are enforced on server and DB (not UI-only).

## 7.4 Team Management (`/team`)
### Audience
- `Owner`, `Admin`

### Components
- Members table (role, status, last active, invite state).
- Invite member form.
- Change role action.
- Deactivate/remove member action.

### Acceptance Criteria
1. Owner and Admin can invite and manage members.
2. Owner transfer action appears only to Owner.
3. All membership changes are audit logged.
4. RLS prevents non-authorized membership writes.

## 7.5 Roles & Permissions (`/roles-permissions`)
### Audience
- `Owner`, `Admin`

### Components
- Read-only permission matrix for Owner/Admin/Member/Viewer.
- Explanations for key permission boundaries.

### Acceptance Criteria
1. Matrix is visible to Owner/Admin only.
2. Matrix is not editable in v1.
3. Matrix matches actual enforced permissions.

## 7.6 Security (`/security`)
### Audience
- All users for self-security.
- Tenant-wide policy controls for `Owner`, `Admin`.

### Components
- 2FA status and setup controls.
- Active sessions list + revoke session.
- API key/token management (if enabled for app).
- Security events list (self events for regular users).

### Acceptance Criteria
1. Any user can enable/disable their own 2FA.
2. Any user can view/revoke their own sessions.
3. Tenant-wide security settings visible only to Owner/Admin.
4. Sensitive actions are audit logged.

## 7.7 Billing (`/billing`)
### Audience
- `Owner` only

### Components
- Current plan and seat usage.
- Manage payment method (Stripe customer portal link or embedded flow).
- Invoices list.
- Plan change and seat update controls.

### Acceptance Criteria
1. Route is inaccessible to non-owners.
2. Billing actions are idempotent and audit logged.
3. Stripe subscription status mirrors tenant billing status.
4. Seat overages and limits are displayed clearly.

## 7.8 Audit Logs (`/audit-logs`)
### Audience
- `Owner`, `Admin`

### Components
- Filterable log table (actor, action, target, timestamp, metadata).
- Export controls (CSV/JSON).
- Search and date range filters.

### Acceptance Criteria
1. Only Owner/Admin can view.
2. Export includes only that tenant’s records.
3. Platform actions affecting tenant appear with actor and reason metadata.
4. Non-admin roles cannot query/export audit data.

## 7.9 Settings (`/settings/profile`, `/settings/tenant`)
### Components
- Profile: name, email, password reset, personal prefs.
- Tenant: tenant metadata, branding, defaults, notifications.

### Acceptance Criteria
1. Profile settings available to all users.
2. Tenant settings editable only by Owner/Admin.
3. Tenant setting changes are audit logged.

## 8. Platform Area: Screen Checklist and Acceptance Criteria

Note: Only users with `PlatformAdmin` role can see any `/platform/*` UI.

## 8.1 Platform Dashboard (`/platform/dashboard`)
### Components
- KPIs: active tenants, failed jobs, webhook errors, locked users.
- Alerts panel (security, billing, jobs).

### Acceptance Criteria
1. Non-platform users cannot access route.
2. KPIs update from canonical operational sources.

## 8.2 Tenants List (`/platform/tenants`)
### Components
- Searchable tenant table.
- Filters by plan/status/risk signals.
- Quick actions (view tenant, billing action links).

### Acceptance Criteria
1. List supports filtering and paging.
2. Opening tenant detail is audit logged.

## 8.3 Tenant Detail (`/platform/tenants/:tenantId`)
### Components
- Tenant summary.
- Member roster.
- Billing snapshot.
- Security posture and recent risk events.
- Direct action controls (suspend/reactivate user, role changes, etc.).

### Acceptance Criteria
1. Direct write actions allowed for PlatformAdmin.
2. Every write action requires reason text.
3. All writes create immutable audit entries with actor + tenant context.

## 8.4 Users (`/platform/users`)
### Components
- Global user search.
- User detail panel with tenant memberships and security state.
- Account support actions (lock/unlock/reset links as policy allows).

### Acceptance Criteria
1. Actions are traceable in audit logs.
2. User data access remains privacy-scoped and minimal.

## 8.5 Billing Ops (`/platform/billing`)
### Components
- Subscription exception handling.
- Failed payment queue.
- Manual adjustments/credits tooling.

### Acceptance Criteria
1. Every billing override includes reason.
2. Overrides are linked to operator identity and timestamp.

## 8.6 Support (`/platform/support`)
### Components
- Tenant support lookup.
- Optional impersonation/session assist entry point.
- Case notes/ticket reference field.

### Acceptance Criteria
1. Sensitive support actions require reason.
2. Support operations are fully audit logged.

## 8.7 Security & Compliance (`/platform/security-compliance`)
### Components
- Global audit explorer.
- Security incident queue.
- Access review utilities.

### Acceptance Criteria
1. Supports filtering by tenant, actor, and action type.
2. Exports are controlled and logged.

## 8.8 Webhooks & Jobs (`/platform/webhooks-jobs`)
### Components
- Stripe webhook event table.
- Retry queue/dead-letter queue views.
- Background job status and retries.

### Acceptance Criteria
1. Failed webhook/job items are retryable.
2. Idempotency status is visible for webhook events.
3. Retry actions are audit logged.

## 8.9 Feature Flags (`/platform/feature-flags`)
### Components
- Global flag list.
- Tenant-scoped overrides.

### Acceptance Criteria
1. Flag changes are audit logged.
2. Rollout scopes are explicit and reversible.

## 8.10 System Settings (`/platform/system-settings`)
### Components
- Policy defaults (session timeout, password policy, etc.).
- Email template management.
- Retention and logging defaults.

### Acceptance Criteria
1. Settings changes are versioned and auditable.
2. Critical settings require confirmation step.

## 9. Role-Permission Matrix (v1)

| Capability | Owner | Admin | Member | Viewer | PlatformAdmin |
|---|---:|---:|---:|---:|---:|
| Access core app (tenant) | Yes | Yes | Yes | Yes | If tenant member |
| Write in core app (default) | Yes | Yes | Yes | No | If tenant member |
| View team members | Yes | Yes | No | No | Yes |
| Invite/remove members | Yes | Yes | No | No | Yes |
| Change member roles | Yes | Yes | No | No | Yes |
| Transfer ownership | Yes | No | No | No | No |
| View roles-permissions matrix | Yes | Yes | No | No | Yes |
| Manage billing | Yes | No | No | No | Yes |
| View tenant audit logs | Yes | Yes | No | No | Yes |
| Export tenant audit logs | Yes | Yes | No | No | Yes |
| Setup own 2FA | Yes | Yes | Yes | Yes | Yes |
| Force tenant 2FA policy | No (v1) | No (v1) | No | No | No (v1) |
| Access `/platform/*` routes | No | No | No | No | Yes |
| Direct platform writes to tenant data | No | No | No | No | Yes |

Notes:
- `PlatformAdmin` access is global and separate from tenant roles.
- If a platform user is also tenant member, both role contexts can apply.

## 10. Compliance-Oriented Cross-Cutting Requirements

## 10.1 Auditability
1. All privileged operations create immutable audit entries.
2. Audit entries must include actor, tenant, action, target, timestamp.
3. Platform writes must include reason metadata.

## 10.2 Security Baseline
1. Rate limiting on auth and critical endpoints.
2. Secure headers and CSP defaults.
3. Secrets/env validation at startup.
4. Input validation on all server entry points.

## 10.3 Data Isolation
1. Tenant data is always tenant-scoped.
2. RLS policies enforced for tenant tables.
3. Cross-tenant queries restricted to platform role paths.

## 10.4 Reliability
1. Stripe webhook signature verification and idempotency.
2. Retry-safe handlers with dead-letter records.
3. Background jobs for async and retry workflows.

## 10.5 Observability
1. Error tracking integration (Sentry).
2. Structured operational logs.
3. Alert surfaces in platform dashboard.

## 10.6 Legal/Consent
1. Cookie consent UI for optional analytics.
2. Legal pages baseline (privacy, terms, DPA/BAA placeholders).

## 11. V1 Definition of Done

1. All routes in sections 6-8 exist with baseline UI.
2. Permissions matrix in section 9 is enforced in UI + API + DB.
3. Audit logging is functional for all privileged actions.
4. Billing is owner-only; audit logs are owner/admin-only.
5. Platform routes hidden and unauthorized without platform role.
6. 2FA setup flows exist and are functional but optional.
7. Webhook/job monitoring pages reflect real processing state.
8. Acceptance criteria per screen are testable and covered by QA checklist.

