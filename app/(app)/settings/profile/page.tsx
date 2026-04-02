import { redirect } from "next/navigation";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { getAppSessionFromCookies } from "@/lib/auth/session";
import { loadProfileForUser } from "@/lib/profile/store";

export default async function ProfileSettingsPage() {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  const persisted = await loadProfileForUser(session.userId);
  const initialFullName = persisted?.fullName ?? session.fullName ?? "";
  const initialJobTitle = persisted?.jobTitle ?? session.jobTitle ?? "";

  return (
    <ProfileSettingsForm
      email={session.email}
      initialFullName={initialFullName}
      initialJobTitle={initialJobTitle}
    />
  );
}
