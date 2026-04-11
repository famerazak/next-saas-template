import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/dpa", label: "DPA" },
  { href: "/baa", label: "BAA" }
];

export function PublicLegalFooter() {
  return (
    <footer className="public-legal-footer" data-testid="public-legal-footer">
      <div>
        <strong>Legal & compliance</strong>
        <p>Starter-ready placeholder policies for privacy, terms, and customer agreements.</p>
      </div>
      <nav className="public-legal-links" aria-label="Public legal links">
        {LEGAL_LINKS.map((link) => (
          <Link key={link.href} href={link.href} data-testid={`legal-link-${link.label.toLowerCase()}`}>
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
