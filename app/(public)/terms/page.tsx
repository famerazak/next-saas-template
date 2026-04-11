import { LegalPage } from "@/components/legal-page";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      eyebrow="Terms"
      summary="Starter placeholder terms covering account access, billing responsibilities, and acceptable use. Replace this with counsel-reviewed contract language before launch."
      lastUpdated="11 April 2026"
      sections={[
        {
          title: "Accounts and workspace access",
          body: [
            "The customer is responsible for user provisioning, role assignment, and safeguarding administrative access to each tenant workspace.",
            "You may suspend or limit access when required to protect the platform, investigate abuse, or comply with legal obligations."
          ]
        },
        {
          title: "Billing and renewals",
          body: [
            "Owner roles control billing for the tenant and are responsible for maintaining accurate payment details and seat counts.",
            "Subscription, renewal, refund, and termination terms must match your actual Stripe setup and finance policy before publication."
          ]
        },
        {
          title: "Acceptable use",
          body: [
            "Customers may not use the service to violate law, interfere with other tenants, bypass security controls, or upload content they do not have rights to process.",
            "These placeholders should be extended with your real abuse, suspension, and liability terms."
          ]
        }
      ]}
    />
  );
}
