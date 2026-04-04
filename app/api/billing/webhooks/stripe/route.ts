import { NextResponse } from "next/server";
import { processStripeWebhookPayload } from "@/lib/billing/store";

export async function POST(request: Request) {
  const payload = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");

  try {
    const result = await processStripeWebhookPayload(payload, signatureHeader);
    return NextResponse.json(
      {
        deliveryStatus: result.deliveryStatus,
        eventId: result.activity.eventId,
        eventType: result.activity.eventType
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook delivery failed." },
      { status: 400 }
    );
  }
}
