import { redirect } from "next/navigation";
import { TenantFilesManager } from "@/components/tenant-files-manager";
import { canUploadTenantFiles } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadTenantFilesForSession } from "@/lib/storage/store";

export default async function FilesPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  const files = await loadTenantFilesForSession(session);

  return (
    <main className="page-shell">
      <TenantFilesManager
        canUpload={canUploadTenantFiles(session)}
        roleLabel={session.role ?? "Member"}
        tenantName={session.tenantName ?? "Workspace"}
        initialFiles={files}
      />
    </main>
  );
}
