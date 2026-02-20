import { AuthPage } from "@/components/auth-page";

export default function SignupPage() {
  return (
    <AuthPage
      title="Create account"
      subtitle="Start your team workspace."
      submitText="Create account"
      fields={[
        { id: "email", label: "Work email", type: "email", placeholder: "you@company.com" },
        { id: "password", label: "Password", type: "password", placeholder: "Create a password" }
      ]}
      footerLinks={[
        { href: "/login", label: "Already have an account?" },
        { href: "/forgot-password", label: "Forgot password?" }
      ]}
    />
  );
}
