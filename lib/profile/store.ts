import { createClient } from "@supabase/supabase-js";

export type UserProfile = {
  fullName: string;
  jobTitle: string;
};

type ProfileRow = {
  full_name: string | null;
  job_title: string | null;
};

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function normalizeProfile(row: ProfileRow | null | undefined): UserProfile {
  return {
    fullName: row?.full_name ?? "",
    jobTitle: row?.job_title ?? ""
  };
}

export async function loadProfileForUser(userId: string): Promise<UserProfile | null> {
  const supabase = getServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, job_title")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    return null;
  }

  return normalizeProfile(data);
}

export async function saveProfileForUser(
  userId: string,
  profile: UserProfile
): Promise<{ profile: UserProfile; persistedToDatabase: boolean }> {
  const supabase = getServiceClient();
  if (!supabase) {
    return { profile, persistedToDatabase: false };
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        full_name: profile.fullName || null,
        job_title: profile.jobTitle || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    )
    .select("full_name, job_title")
    .maybeSingle<ProfileRow>();

  if (error) {
    return { profile, persistedToDatabase: false };
  }

  return { profile: normalizeProfile(data), persistedToDatabase: true };
}
