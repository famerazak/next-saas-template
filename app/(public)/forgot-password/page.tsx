import { AuthPage } from "@/components/auth-page";

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      title="Reset password"
      subtitle="Enter your email and we will send reset instructions."
      submitText="Send reset email"
      fields={[
        { id: "email", label: "Email", type: "email", placeholder: "you@company.com" }
      ]}
      footerLinks={[
        { href: "/login", label: "Back to login" },
        { href: "/signup", label: "Create account" }
      ]}
    />
  );
}
