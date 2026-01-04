"use client";

import { useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  createCheckoutSessionAction,
  createCustomerPortalAction,
} from "@/actions/stripe";

export function ManageBillingButton({
  organizationId,
  isSubscribed,
  priceId,
}: {
  organizationId: string;
  isSubscribed: boolean;
  priceId?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleAction = () => {
    startTransition(async () => {
      if (isSubscribed) {
        await createCustomerPortalAction(organizationId);
      } else if (priceId) {
        await createCheckoutSessionAction(organizationId, priceId);
      }
    });
  };

  return (
    <Button onClick={handleAction} disabled={isPending}>
      {isPending
        ? "Loading..."
        : isSubscribed
          ? "Manage Billing"
          : "Subscribe Now"}
    </Button>
  );
}
