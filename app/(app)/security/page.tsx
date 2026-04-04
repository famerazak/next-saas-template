import { redirect } from "next/navigation";
import { SecurityPageShell } from "@/components/security-page-shell";
import { getAppSessionFromCookies } from "@/lib/auth/session";

export default async function SecurityPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  return <SecurityPageShell session={session} />;
}
