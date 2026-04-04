import { redirect } from "next/navigation";
import { SecurityPageShell } from "@/components/security-page-shell";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadActiveSessionsForUser } from "@/lib/auth/session-registry";
import { loadTwoFactorStateForUser } from "@/lib/security/two-factor";

export default async function SecurityPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  const twoFactorState = await loadTwoFactorStateForUser(session.userId, session.email);
  const sessions = await loadActiveSessionsForUser(session.userId);

  return (
    <SecurityPageShell
      session={session}
      twoFactorState={twoFactorState}
      sessions={sessions}
      currentSessionId={session.sessionId ?? null}
    />
  );
}
