---
date: 2026-02-19
topic: b2b-compliance-nextjs-starter
---

# B2B Compliance Starter (Next.js + Supabase)

## What We're Building

A reusable Next.js starter for B2B SaaS products with:
- Team-based multi-tenancy (owner + sub-users)
- Role and permission controls (read/write/admin scopes)
- Strong auth controls including 2FA enforcement
- Billing, analytics, storage, background jobs, observability, and testing
- Security and auditability patterns to support ISO-style controls and HIPAA-oriented design constraints

The goal is not "instant certification". The goal is an engineering baseline that is easy to audit, hard to misconfigure, and repeatable across products.

## Why This Approach

We use a compliance-first architecture with:
- Strict tenant isolation in data model + RLS
- Central policy enforcement (no ad hoc permission checks)
- Security defaults (rate limits, headers, input validation, audit logging)
- Provider abstraction for areas likely to vary between products

This is more maintainable than stitching together one-off integrations in each new app.

## Key Decisions

- Framework: Next.js App Router + TypeScript strict mode.
  Rationale: stable ecosystem and strong DX for reusable templates.

- Data/Auth: Supabase Postgres + Supabase Auth + Supabase Storage.
  Rationale: one platform for identity, DB, storage, and row-level security.

- Tenancy model: organization-scoped data with explicit membership table.
  Rationale: clean owner/sub-user model and permission inheritance.

- Authorization: RBAC with permission matrix and optional per-user overrides.
  Rationale: easiest model for read/write/admin access and auditability.

- MFA: required 2FA policy per organization for privileged roles.
  Rationale: aligns with stricter security expectations.

- Billing: Stripe with organization-level subscription + seat limits.
  Rationale: direct mapping to B2B licensing.

- Analytics split:
  - Product analytics/events: PostHog (or equivalent)
  - Marketing analytics: optional GA in non-HIPAA mode
  Rationale: GA can create HIPAA risk if misused with sensitive data.

- Email: transactional provider abstraction with templates and event log.
  Rationale: account lifecycle and billing notices need reliable delivery + traceability.

- Background jobs: Inngest (or Trigger.dev) for webhook retries, cleanup, reminders.
  Rationale: compliance workflows should not depend on request lifecycle.

- Observability: Sentry + structured logs + audit tables.
  Rationale: incident response and change traceability.

- Security defaults in starter:
  - CSP + secure headers
  - Rate limiting
  - Idempotent webhooks
  - Secret validation at startup
  - Input schema validation for all server entry points

- Testing baseline:
  - Unit: domain rules and permission checks
  - Integration: RLS and API contracts
  - E2E: auth, invite flow, billing lifecycle, role enforcement
  - CI gates for lint, test, migrations, and security checks

## Scope Mapping (Your 1-12 Items)

1. Transactional email
   Add provider adapter, template layer, delivery logs, retry path.

2. Error monitoring
   Add Sentry with PII scrubbing defaults and release tagging.

3. Stripe webhook infrastructure
   Verify signatures, dedupe by event ID, retry-safe handlers, dead-letter table.

4. Background jobs/cron
   Add job runner for retries, seat sync, stale invite cleanup, report jobs.

5. Authz model beyond auth
   Add org/member/role/permission schema + RLS policy set.

6. Team/org support
   Owner account, invitations, member lifecycle, seat enforcement.

7. Product analytics/events
   Add event pipeline and safe event schema (no sensitive fields).

8. Feature flags + config validation
   Add environment schema and feature toggle framework.

9. Testing + CI
   Add unit/integration/e2e setup + CI pipelines and required checks.

10. Security baseline
    Add rate limiting, bot protection hooks, audit logs, CSP/headers.

11. Storage patterns
    Add signed upload/download flows, tenant-scoped paths, retention jobs.

12. Cookie consent + legal
    Add consent banner, policy pages, analytics gating by consent.

## Compliance Guardrails (Important)

- ISO/HIPAA readiness is not only code:
  - BAAs/DPAs with vendors
  - policies and procedures
  - access reviews and key management
  - logging retention and incident response processes

- PHI/data-safety defaults in starter:
  - never put sensitive data in logs, analytics, Stripe metadata, or error payloads
  - minimize data collection by default
  - isolate tenant data in every query path

## Open Questions

- Do you want a strict "HIPAA mode" that disables GA and any non-approved integrations automatically?
- Should custom roles be allowed, or only fixed roles (Owner/Admin/Member/Viewer)?
- Should owner-only actions require step-up auth (re-auth + 2FA challenge)?
- Is SSO/SAML needed in v1 or later phase?

## Next Steps

1. Scaffold the starter foundation (Next.js + Supabase + schema + RLS + org model).
2. Implement authz, invites, and 2FA policy enforcement.
3. Add Stripe org billing + seat controls + webhook pipeline.
4. Add observability, audit logs, jobs, and compliance-safe analytics.
5. Add test suites + CI gates and security hardening.

