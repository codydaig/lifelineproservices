"use server";

import { auth } from "@/auth";
import { stripe, getAppUrl } from "@/lib/stripe";
import { getOrganizationById } from "@workspace/db";
import { redirect } from "next/navigation";

export async function createCheckoutSessionAction(
  organizationId: string,
  priceId: string,
) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const organization = await getOrganizationById(organizationId);

  if (!organization || !organization.stripeCustomerId) {
    throw new Error("Organization not found or Stripe customer not created");
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: organization.stripeCustomerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${getAppUrl()}/organizations/${organizationId}/billing?success=true`,
    cancel_url: `${getAppUrl()}/organizations/${organizationId}/billing?canceled=true`,
    metadata: {
      organizationId,
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Failed to create checkout session");
  }

  redirect(checkoutSession.url);
}

export async function createCustomerPortalAction(organizationId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const organization = await getOrganizationById(organizationId);

  if (!organization || !organization.stripeCustomerId) {
    throw new Error("Organization not found or Stripe customer not created");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: organization.stripeCustomerId,
    return_url: `${getAppUrl()}/organizations/${organizationId}/billing`,
  });

  if (!portalSession.url) {
    throw new Error("Failed to create portal session");
  }

  redirect(portalSession.url);
}
