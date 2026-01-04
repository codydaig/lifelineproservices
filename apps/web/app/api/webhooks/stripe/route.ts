import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  updateOrganizationSubscription,
  getOrganizationByStripeCustomerId,
} from "@workspace/db";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || "",
    );
  } catch (error: any) {
    console.error(`Webhook Error: ${error.message}`);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  try {
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("invoice.payment_succeeded", invoice.id);

      if (invoice.lines) {
        const line = invoice.lines.data.find((line) => {
          return (
            line?.pricing?.price_details?.product === "prod_SFOHKHRzndJlpr"
          );
        });
        if (line) {
          const customer = await stripe.customers.retrieve(
            invoice.customer as string,
          );
          await updateOrganizationSubscription(
            // @ts-expect-error metadata isn't typed by stripe
            customer.metadata.organizationId,
            {
              stripeSubscriptionId:
                line?.parent?.subscription_item_details?.subscription || "",
              stripePriceId:
                (line.pricing?.price_details?.price as string) || "",
              stripeCurrentPeriodEnd: line?.period?.end
                ? new Date(line?.period?.end * 1000)
                : null,
            },
          );
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("customer.subscription.deleted", subscription.id);
      const organization = await getOrganizationByStripeCustomerId(
        subscription.customer as string,
      );

      if (organization) {
        await updateOrganizationSubscription(organization.id, {
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
        });
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error: any) {
    console.error(`Error processing webhook ${event.type}:`, error);
    return new NextResponse(`Error processing webhook: ${error.message}`, {
      status: 500,
    });
  }
}
