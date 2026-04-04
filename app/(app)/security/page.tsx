import { redirect } from "next/navigation";
import { SecurityPageShell } from "@/components/security-page-shell";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadTwoFactorStateForUser } from "@/lib/security/two-factor";

export default async function SecurityPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  const twoFactorState = await loadTwoFactorStateForUser(session.userId, session.email);

  return <SecurityPageShell session={session} twoFactorState={twoFactorState} />;
}
