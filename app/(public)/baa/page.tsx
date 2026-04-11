import { LegalPage } from "@/components/legal-page";

export default function BaaPage() {
  return (
    <LegalPage
      title="Business Associate Agreement"
      eyebrow="BAA"
      summary="A HIPAA-oriented placeholder page for teams that may later need a BAA. Keep this as a visible placeholder until you have legal approval and operational controls to support it."
      lastUpdated="11 April 2026"
      sections={[
        {
          title: "Availability",
          body: [
            "This starter does not imply that a BAA is automatically available or that the default deployment is suitable for protected health information.",
            "Only publish executable BAA terms when your infrastructure, subprocessors, logging, and support workflows are actually aligned with HIPAA obligations."
          ]
        },
        {
          title: "Security expectations",
          body: [
            "Before offering a BAA, confirm encryption, access review, audit retention, incident response, and vendor contracts across the full production stack.",
            "Optional analytics, support tooling, and error monitoring must all be reviewed for PHI exposure before HIPAA use cases are enabled."
          ]
        },
        {
          title: "Execution process",
          body: [
            "Use this placeholder to explain how prospective customers request a BAA review and what commercial or technical prerequisites apply.",
            "Replace this page with your executed template and contact process once legal review is complete."
          ]
        }
      ]}
    />
  );
}
