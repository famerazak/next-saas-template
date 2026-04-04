import { redirect } from "next/navigation";
import { NoAccessCard } from "@/components/no-access-card";
import { PaymentMethodSetupForm } from "@/components/payment-method-setup-form";
import { canManageTenantBilling } from "@/lib/auth/authorization";
import { getAppSessionFromCookies } from "@/lib/auth/session";
type PaymentMethodSetupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function PaymentMethodSetupPage({ searchParams }: PaymentMethodSetupPageProps) {
  const session = await getAppSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  if (!canManageTenantBilling(session)) {
    return <NoAccessCard areaName="billing payment method setup" />;
  }

  const params = await searchParams;
  const setupId = readSearchValue(params.setup);
  if (!setupId) {
    redirect("/billing");
  }

  return (
    <PaymentMethodSetupForm
      setupId={setupId}
      tenantId={session.tenantId ?? session.email}
      tenantName={session.tenantName ?? "Workspace"}
      ownerEmail={session.email}
    />
  );
}
