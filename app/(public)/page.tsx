import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="auth-card">
        <h1>Starter Home</h1>
        <p className="auth-subtitle">Use one of the public auth routes below.</p>
        <nav className="auth-links" aria-label="Public auth routes">
          <Link href="/login">Login</Link>
          <Link href="/signup">Sign up</Link>
          <Link href="/forgot-password">Forgot password</Link>
        </nav>
      </section>
    </main>
  );
}
