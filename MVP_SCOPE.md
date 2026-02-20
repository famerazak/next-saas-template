# MVP Scope: B2B Teams SaaS Starter (Deepened)

## Enhancement Summary

**Deepened on:** 2026-02-19  
**Source plan:** `/Users/fame/www/next-saas-template/PRD.md`  
**Sections enhanced:** 11 major sections + security/compliance overlays  
**Research agents used (simulated via workflow):**
- `best-practices-researcher`
- `framework-docs-researcher`
- `security-sentinel`
- `architecture-strategist`
- `performance-oracle`
- `deployment-verification-agent`

### Key Improvements
1. Added concrete Supabase RLS/RBAC patterns (including custom JWT claims and policy structure).
2. Added Stripe reliability constraints (signature verification, fast `2xx`, idempotency behavior).
3. Added explicit security/performance tradeoffs for Next.js CSP, env handling, and testing stack.

### New Considerations Discovered
- Nonce-based CSP in Next.js can force dynamic rendering and disable ISR/CDN defaults.
- Google Analytics usage needs strict PII controls and careful HIPAA boundary handling.
- Retry systems can multiply total attempts per step; idempotency and dedupe keys are mandatory.

## Section Manifest

Section 1: Product Summary - validate scope for B2B tenant + platform operations in one app.  
Section 2: Auth/Authz - harden role model with Supabase RLS, JWT claims, MFA/AAL enforcement model.  
Section 3: Billing/Webhooks/Jobs - add reliability guarantees for Stripe + async processing.  
Section 4: Product UI - ensure each screen has enforceable role boundaries and auditable actions.  
Section 5: Platform UI - ensure high-risk operations are explicit and fully attributable.  
Section 6: Security Baseline - align to OWASP patterns and secure defaults.  
Section 7: Analytics/Consent/Legal - define safe defaults for GA and privacy constraints.  
Section 8: Testing/CI - define coverage, matrix, and deterministic build/test practices.  
Section 9: Storage - ensure tenant isolation and signed URL flow with policy gates.  
Section 10: Observability/Audit - define immutable audit trail and operational alerting scope.  
Section 11: Deployment/DoD - add go/no-go checks and rollout safety requirements.

---

## 1) Product Summary (Locked Scope)

Build a reusable B2B SaaS starter with:
- Single app site containing:
  - Product app area (tenant-facing)
  - Platform admin area (`/platform/*`)
- Tenant role model:
  - `Owner`, `Admin`, `Member`, `Viewer`
- Global role model:
  - `PlatformAdmin`
- 2FA setup available for all users, not forced by default.
- Tenant audit logs visible/exportable only by `Owner`/`Admin`.

### Research Insights

**Best Practices**
- Keep authentication and authorization separated:
  - Auth identifies user.
  - Authorization enforced per route/action/resource (server and DB).
- Treat all mutations as untrusted input paths, including Server Actions.

**Implementation Details**
- Use route visibility checks in UI, but treat server endpoints and DB policies as canonical enforcement layers.
- Keep platform and tenant role evaluation independent in access middleware/guards.

**Edge Cases**
- User with both `PlatformAdmin` and tenant role can accidentally use wrong context.
  - Mitigation: persistent mode indicator and explicit action descriptions in platform screens.

---

## 2) Authentication and Authorization

### MVP Decisions
- Supabase Auth for sign-in/session lifecycle.
- Optional user 2FA enrollment.
- View-only role matrix in v1.
- Team management by `Owner` + `Admin`; ownership transfer by `Owner` only.

### Research Insights

**Best Practices**
- Supabase MFA supports enrollment + challenge/verify APIs and can be optional or required by policy.
- Use JWT claims (`role`, custom claims, and `aal`) to enforce authorization and MFA assurance.
- For exposed schemas, enable RLS on all tables and define explicit `TO authenticated` policies.

**Implementation Details**
- Add custom access token hook for role claims when scaling permissions beyond static role fields.
- Enforce access at 3 layers:
  1. UI gating
  2. API/Server Action checks
  3. RLS policies
- Keep auth abuse controls enabled:
  - Supabase auth rate limits
  - CAPTCHA on high-risk auth forms

**Performance Considerations**
- Put role and permission resolution near token issuance when possible to reduce repeated DB lookups.

**Edge Cases**
- Role changed mid-session:
  - Ensure refresh token cycle or forced revalidation on privileged actions.
- User at `aal1` attempting privileged action:
  - Return step-up auth requirement if policy is later enabled.

---

## 3) Billing, Webhooks, and Background Jobs

### MVP Decisions
- Stripe billing with owner-only management in tenant product UI.
- Platform billing operations available to `PlatformAdmin`.
- Webhook/job observability screens included.

### Research Insights

**Best Practices**
- Stripe webhook handlers should:
  - Verify Stripe signature headers.
  - Return `2xx` quickly before long-running work.
  - Process asynchronously via job/event layer.
- All POST mutation flows should use idempotency keys to avoid duplicate side effects.
- Retry systems should use backoff and jitter.

**Implementation Details**
- Webhook pipeline pattern:
  1. Verify signature.
  2. Persist event receipt (dedupe key = provider event id).
  3. Return `2xx`.
  4. Process in background worker with retry policy.
- Capture dead-letter records for permanently failed events with replay tooling.
- For function/job retries, note step-level retries can multiply total attempts; require idempotent handlers.

**Performance Considerations**
- Keep webhook endpoint minimal; defer expensive writes and cross-service calls.
- Batch reconcilers for billing sync jobs.

**Edge Cases**
- Out-of-order webhook delivery:
  - State transitions must be monotonic or version-aware.
- Duplicate event deliveries:
  - Deduplicate by event id + immutable processing ledger.

---

## 4) Product App UI Scope

### Included Routes
- `/dashboard`, `/app/*`, `/team`, `/roles-permissions`, `/security`, `/billing`, `/audit-logs`, `/settings/*`

### Research Insights

**Best Practices**
- Design route access first by permission contract, then component-level affordances.
- Any high-risk UI action should include confirmation and structured audit reason where applicable.

**Implementation Details**
- `/roles-permissions` remains read-only in v1 to reduce privilege drift risk.
- `/billing` hard-restricted to `Owner`.
- `/audit-logs` and export hard-restricted to `Owner` + `Admin`.

**Edge Cases**
- Viewer accessing deep links to restricted routes:
  - Return consistent 403/redirect behavior and never leak resource existence.
- Invite acceptance with stale role map:
  - Force role re-fetch on first post-invite session.

---

## 5) Platform UI Scope (`/platform/*`)

### Included Routes
- Dashboard, Tenants, Tenant Detail, Users, Billing Ops, Support, Security/Compliance, Webhooks/Jobs, Feature Flags, System Settings

### Research Insights

**Best Practices**
- Keep platform nav completely hidden for non-platform users.
- Require reason codes for privileged operator actions.
- Log all tenant-affecting platform reads/writes with operator identity and timestamp.

**Implementation Details**
- Minimum audit payload for platform actions:
  - actor user id
  - actor role context
  - target tenant id
  - action verb
  - target resource id/type
  - reason string
  - request correlation id

**Edge Cases**
- Operator is also member of tenant:
  - Record explicit context (`platform` vs `tenant`) in audit events.

---

## 6) Security Baseline (MVP Must-Haves)

### Research Insights

**Best Practices**
- Follow OWASP logging and REST security guidance:
  - Do not log sensitive/regulated fields.
  - Verify JWT integrity and claims for access control.
  - Use HTTPS-only transport.
  - Apply rate limits with `429` handling on abuse.
- Apply strict headers and CSP in Next.js.

**Implementation Details**
- Header baseline:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - CSP configured per environment
- Next.js CSP strategy:
  - Nonce path for strict compliance use cases.
  - Evaluate SRI path if static performance is priority.
- Validate all env vars at startup and prevent secret leakage to client (`NEXT_PUBLIC_*` only for public values).

**Performance Considerations**
- Nonce-based CSP can require dynamic rendering and reduce cacheability/ISR.
- Prefer measured CSP profile per route class (public marketing vs sensitive app surfaces).

**Edge Cases**
- Security headers misconfigured for static assets/prefetch paths:
  - Use route matching strategy that excludes unnecessary paths while protecting sensitive pages.

---

## 7) Analytics, Consent, and Legal

### MVP Decisions
- Google Analytics included.
- Cookie/legal baseline included.

### Research Insights

**Best Practices**
- Enforce strict no-PII analytics payload policy.
- Set explicit retention periods and review cadence.
- Use consent-aware analytics behavior where required.

**Implementation Details**
- Add analytics governance checklist:
  - blocked fields (emails, phone, IDs containing PHI/PII)
  - event naming convention
  - data retention setting target
  - consent state handling
- HIPAA boundary note:
  - Do not use Google Analytics in ways that disclose PHI.

**Edge Cases**
- Engineers accidentally attaching user identifiers in custom event labels.
  - Add CI/static checks for banned analytics field patterns.

---

## 8) Testing and CI Scope

### Research Insights

**Best Practices**
- Layered testing:
  - Unit: permission predicates and helpers
  - Integration: API + RLS policy behavior
  - E2E: auth flows, invites, role boundaries, billing happy path
- Use Playwright cross-browser coverage by default.
- Use GitHub Actions matrix for Node versions and deterministic installs (`npm ci`).

**Implementation Details**
- CI minimum gates:
  1. Typecheck
  2. Lint
  3. Unit/integration tests
  4. E2E smoke suite
  5. Migration verification checks

**Performance Considerations**
- Parallelize test jobs and cache dependencies in Actions.

**Edge Cases**
- Flaky auth/billing E2E tests:
  - Separate deterministic local mocks from provider-integrated nightly tests.

---

## 9) Storage and File Security

### Research Insights

**Best Practices**
- Supabase Storage is policy-driven via `storage.objects` RLS.
- Restrict operations by bucket and tenant-scoped path conventions.
- Prefer signed URL flows for controlled uploads/downloads.

**Implementation Details**
- Suggested object key shape:
  - `<tenant_id>/<user_id>/<uuid>/<filename>`
- Policy examples should enforce:
  - bucket constraint
  - tenant ownership check
  - operation-specific permission checks

**Edge Cases**
- Orphaned objects after deleted DB records:
  - scheduled cleanup/reconciliation job.

---

## 10) Observability and Auditability

### Research Insights

**Best Practices**
- Include logging in code review and verification pipeline.
- Keep immutable audit records for privileged actions.
- Separate business audit events from low-level request logs.

**Implementation Details**
- Audit event taxonomy:
  - auth, membership, billing, security, platform-support, config-change
- Include correlation ids across request, job, and webhook processing.

**Edge Cases**
- Sensitive data accidentally included in logs:
  - centralized log sanitizer + denylist fields.

---

## 11) MVP Phasing and Definition of Done

## Phase 0: Foundation
- App shell, auth plumbing, tenant model, baseline RLS, audit table.

## Phase 1: Tenant Operations
- Team management, role matrix UI (read-only), security page, optional 2FA.

## Phase 2: Billing + Reliability
- Billing page, Stripe integration, webhook ingestion + retries + dead-letter visibility.

## Phase 3: Platform Operations
- `/platform/*` routes, tenant/user/billing ops, support + compliance views.

## Phase 4: Hardening
- Security headers/CSP profile, rate limiting/CAPTCHA, full CI matrix and E2E.

### Deepened DoD
1. RLS enabled on all exposed tenant tables with explicit policies.
2. Privileged route and mutation checks pass server-side authorization tests.
3. Webhook processing is idempotent, retryable, and observable.
4. Audit log coverage exists for all privileged tenant and platform actions.
5. GA payloads are PII-safe and consent-aware by policy.
6. CI gates include unit/integration/e2e with deterministic install and caching.

---

## References

- Supabase MFA: https://supabase.com/docs/guides/auth/auth-mfa
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase RBAC with custom claims: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Auth rate limits: https://supabase.com/docs/guides/auth/rate-limits
- Supabase CAPTCHA: https://supabase.com/docs/guides/auth/auth-captcha
- Supabase security/compliance page: https://supabase.com/security
- Stripe webhooks: https://docs.stripe.com/webhooks
- Stripe webhook signatures: https://docs.stripe.com/webhooks/signature
- Stripe idempotent requests: https://docs.stripe.com/api/idempotent_requests
- Inngest retries: https://www.inngest.com/docs/features/inngest-functions/error-retries/retries
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- OWASP REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- Next.js CSP guide: https://nextjs.org/docs/app/guides/content-security-policy
- Next.js env vars guide: https://nextjs.org/docs/app/guides/environment-variables
- Next.js Jest guide: https://nextjs.org/docs/app/guides/testing/jest
- Playwright intro: https://playwright.dev/docs/intro
- GitHub Actions Node build/test: https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs
- Google Analytics PII guidance: https://support.google.com/analytics/answer/6366371
- Google Analytics data retention: https://support.google.com/analytics/answer/7667196
- Google Analytics EU-focused privacy controls: https://support.google.com/analytics/answer/12017362
- Google Analytics HIPAA guidance: https://support.google.com/analytics/answer/13297105

