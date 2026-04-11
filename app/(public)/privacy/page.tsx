import { LegalPage } from "@/components/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      eyebrow="Privacy"
      summary="Baseline privacy language for a B2B starter. Replace the placeholders with your real retention, subprocessors, and regulatory commitments before production use."
      lastUpdated="11 April 2026"
      sections={[
        {
          title: "Information we collect",
          body: [
            "This starter assumes you collect account, tenant, billing, and audit-log data needed to operate a B2B SaaS product.",
            "Do not send protected health information, card data, or other regulated payloads into analytics, logs, or support tools unless your production setup explicitly permits it."
          ]
        },
        {
          title: "How data is used",
          body: [
            "Use customer data only to deliver the service, secure the platform, support billing, and investigate operational issues.",
            "Optional analytics remain consent-gated and should be configured to avoid personally identifiable information in event payloads."
          ]
        },
        {
          title: "Retention and deletion",
          body: [
            "Document your retention periods for user records, audit logs, support history, and uploaded files before going live.",
            "Provide a customer process for export and deletion requests that matches your actual operational capabilities."
          ]
        }
      ]}
    />
  );
}
