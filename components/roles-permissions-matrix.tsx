type PermissionLevel = "Full access" | "Manage team" | "Read only" | "No access";

type PermissionRow = {
  capability: string;
  owner: PermissionLevel;
  admin: PermissionLevel;
  member: PermissionLevel;
  viewer: PermissionLevel;
  note: string;
};

const PERMISSION_ROWS: PermissionRow[] = [
  {
    capability: "Dashboard overview",
    owner: "Full access",
    admin: "Full access",
    member: "Read only",
    viewer: "Read only",
    note: "All signed-in users can see tenant context and their own profile link."
  },
  {
    capability: "Files and uploads",
    owner: "Full access",
    admin: "Full access",
    member: "Full access",
    viewer: "Read only",
    note: "All signed-in users can see tenant files. Viewer stays read-only while other roles can upload and delete."
  },
  {
    capability: "Tenant settings",
    owner: "Full access",
    admin: "Full access",
    member: "No access",
    viewer: "No access",
    note: "Reserved for tenant admins because these changes affect the whole workspace."
  },
  {
    capability: "Team management",
    owner: "Manage team",
    admin: "Manage team",
    member: "No access",
    viewer: "No access",
    note: "Admins can invite, remove, and change roles. Ownership transfer remains owner-only."
  },
  {
    capability: "Billing and plan controls",
    owner: "Full access",
    admin: "No access",
    member: "No access",
    viewer: "No access",
    note: "Only the owner can manage billing so subscription authority stays explicit."
  },
  {
    capability: "Audit logs and exports",
    owner: "Full access",
    admin: "Full access",
    member: "No access",
    viewer: "No access",
    note: "Only admin roles can review and export tenant audit history."
  },
  {
    capability: "Roles & permissions reference",
    owner: "Read only",
    admin: "Read only",
    member: "No access",
    viewer: "No access",
    note: "This screen is intentionally read-only so admins can confirm expected access."
  }
];

type RoleSummary = {
  role: string;
  summary: string;
};

const ROLE_SUMMARIES: RoleSummary[] = [
  {
    role: "Owner",
    summary: "Full tenant control, including ownership transfer and every admin area."
  },
  {
    role: "Admin",
    summary: "Runs day-to-day tenant operations without taking ownership."
  },
  {
    role: "Member",
    summary: "Works in the product app but cannot manage tenant-wide settings."
  },
  {
    role: "Viewer",
    summary: "Read-only product access with no administrative actions."
  }
];

function PermissionBadge({ level }: { level: PermissionLevel }) {
  const tone =
    level === "Full access"
      ? "is-full"
      : level === "Manage team"
        ? "is-manage"
        : level === "Read only"
          ? "is-read"
          : "is-none";

  return <span className={`permission-pill ${tone}`}>{level}</span>;
}

export function RolesPermissionsMatrix() {
  return (
    <main className="page-shell">
      <section className="auth-card settings-card permissions-card" data-testid="roles-permissions-page">
        <div className="settings-header">
          <div>
            <h1>Roles & permissions</h1>
            <p className="auth-subtitle">
              A read-only reference for how each tenant role can use the starter by default.
            </p>
          </div>
        </div>

        <div className="permissions-summary-grid" data-testid="roles-permissions-summary">
          {ROLE_SUMMARIES.map((summary) => (
            <article
              key={summary.role}
              className="permissions-summary-card"
              data-testid={`role-summary-${summary.role.toLowerCase()}`}
            >
              <span className="settings-label">{summary.role}</span>
              <strong>{summary.role}</strong>
              <p>{summary.summary}</p>
            </article>
          ))}
        </div>

        <div className="permissions-matrix" data-testid="roles-permissions-matrix">
          <div className="permissions-matrix-header">
            <span>Capability</span>
            <span>Owner</span>
            <span>Admin</span>
            <span>Member</span>
            <span>Viewer</span>
            <span>Notes</span>
          </div>
          {PERMISSION_ROWS.map((row) => (
            <div
              key={row.capability}
              className="permissions-matrix-row"
              data-testid={`permission-row-${row.capability.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <strong className="permissions-capability">{row.capability}</strong>
              <PermissionBadge level={row.owner} />
              <PermissionBadge level={row.admin} />
              <PermissionBadge level={row.member} />
              <PermissionBadge level={row.viewer} />
              <span className="permissions-note">{row.note}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
