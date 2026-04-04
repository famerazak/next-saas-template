import { getPreAuthChallengeFromCookies } from "@/lib/auth/session";
import { LoginForm } from "@/components/login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    twoFactorError?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const challenge = await getPreAuthChallengeFromCookies();
  const params = (await searchParams) ?? {};

  return (
    <LoginForm
      initialStep={challenge ? "two-factor" : "password"}
      challengedEmail={challenge?.email ?? ""}
      twoFactorError={challenge ? params.twoFactorError ?? "" : ""}
    />
  );
}
