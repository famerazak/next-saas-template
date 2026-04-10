import { redirect } from "next/navigation";
import { TenantFilesManager } from "@/components/tenant-files-manager";
import { canManageTenantFiles } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { buildSignedDownloadUrl } from "@/lib/storage/signed-download";
import { loadTenantFilesForSession } from "@/lib/storage/store";

export default async function FilesPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  const files = await loadTenantFilesForSession(session);
  const downloadUrls = Object.fromEntries(
    files.map((file) => [
      file.id,
      buildSignedDownloadUrl({
        fileId: file.id,
        tenantId: file.tenantId
      })
    ])
  );

  return (
    <main className="page-shell">
      <TenantFilesManager
        canManage={canManageTenantFiles(session)}
        downloadUrls={downloadUrls}
        roleLabel={session.role ?? "Member"}
        tenantName={session.tenantName ?? "Workspace"}
        initialFiles={files}
      />
    </main>
  );
}
