import Link from "next/link";
import type { ReactNode } from "react";

type AuthField = {
  id: string;
  label: string;
  type: "email" | "password";
  placeholder?: string;
};

type AuthPageProps = {
  title: string;
  subtitle: string;
  submitText: string;
  fields: AuthField[];
  footerLinks: Array<{ href: string; label: string }>;
  extraContent?: ReactNode;
};

export function AuthPage({
  title,
  subtitle,
  submitText,
  fields,
  footerLinks,
  extraContent
}: AuthPageProps) {
  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        <form className="auth-form" data-testid="auth-form" method="post">
          {fields.map((field) => (
            <label key={field.id} htmlFor={field.id}>
              {field.label}
              <input
                id={field.id}
                name={field.id}
                type={field.type}
                autoComplete={field.type === "email" ? "email" : "current-password"}
                placeholder={field.placeholder}
                required
              />
            </label>
          ))}
          {extraContent}
          <button type="submit">{submitText}</button>
        </form>
        <nav className="auth-links" aria-label="Auth shortcuts">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
