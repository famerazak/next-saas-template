import { AuthPage } from "@/components/auth-page";

export default function LoginPage() {
  return (
    <AuthPage
      title="Log in"
      subtitle="Welcome back. Access your workspace."
      submitText="Log in"
      fields={[
        { id: "email", label: "Email", type: "email", placeholder: "you@company.com" },
        { id: "password", label: "Password", type: "password", placeholder: "••••••••" }
      ]}
      footerLinks={[
        { href: "/signup", label: "Create account" },
        { href: "/forgot-password", label: "Forgot password?" }
      ]}
    />
  );
}
