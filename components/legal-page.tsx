import Link from "next/link";

export type LegalSection = {
  title: string;
  body: string[];
};

type LegalPageProps = {
  title: string;
  eyebrow: string;
  summary: string;
  lastUpdated: string;
  sections: LegalSection[];
};

const RELATED_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/dpa", label: "DPA" },
  { href: "/baa", label: "BAA" }
];

export function LegalPage({ title, eyebrow, summary, lastUpdated, sections }: LegalPageProps) {
  return (
    <main className="page-shell legal-page-shell">
      <section className="auth-card legal-page-card" data-testid="legal-page">
        <div className="legal-page-header">
          <span className="cookie-consent-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="auth-subtitle">{summary}</p>
          <div className="legal-page-meta">
            <span>Last updated</span>
            <strong>{lastUpdated}</strong>
          </div>
        </div>

        <div className="legal-page-sections">
          {sections.map((section) => (
            <article key={section.title} className="legal-page-section">
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
        </div>

        <nav className="legal-page-links" aria-label="Legal pages">
          {RELATED_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
