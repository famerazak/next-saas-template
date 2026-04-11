import { LegalPage } from "@/components/legal-page";

export default function DpaPage() {
  return (
    <LegalPage
      title="Data Processing Addendum"
      eyebrow="DPA"
      summary="A public placeholder for your controller/processor commitments. Replace with your signed exhibit, subprocessors list, and cross-border transfer language before customer use."
      lastUpdated="11 April 2026"
      sections={[
        {
          title: "Processing scope",
          body: [
            "This starter assumes the customer is the controller and your SaaS business acts as processor for service data handled on the customer’s behalf.",
            "Describe the categories of personal data, processing purposes, and data subject types that actually apply to your product."
          ]
        },
        {
          title: "Security measures",
          body: [
            "Document the technical and organizational measures you actually operate, including access control, audit logging, backups, and incident handling.",
            "Reference only controls that are truly implemented in production, not just present as starter placeholders."
          ]
        },
        {
          title: "Subprocessors and transfers",
          body: [
            "Publish your current subprocessors and explain how customers are notified of material changes.",
            "Add the regional transfer mechanism, SCC language, and return/deletion terms that your legal team approves."
          ]
        }
      ]}
    />
  );
}
