import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { getOrganizationById } from "@workspace/db";
import { stripe } from "@/lib/stripe";
import { ManageBillingButton } from "./manage-billing-button";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const session = await auth();
  const { organizationId } = await params;

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const organization = await getOrganizationById(organizationId);

  if (!organization) {
    redirect("/organizations");
  }

  // Check if we have subscription info in the DB
  const isSubscribed =
    !!organization.stripeSubscriptionId &&
    !!organization.stripeCurrentPeriodEnd &&
    organization.stripeCurrentPeriodEnd > new Date();

  let subscriptionStatus = isSubscribed ? "active" : "inactive";

  // Fallback: If DB says not subscribed but we have an ID, verify with Stripe
  // This helps if webhooks are delayed or missed
  if (!isSubscribed && organization.stripeSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        organization.stripeSubscriptionId,
      );
      if (
        subscription.status === "active" ||
        subscription.status === "trialing"
      ) {
        subscriptionStatus = subscription.status;
      }
    } catch (error) {
      console.error("Failed to fetch subscription from Stripe:", error);
    }
  }

  const priceId = "price_1RKtVK2cynnbBbhubDXy0qsM"; // Replace with your actual Stripe Price ID

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Billing</h1>
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plan</CardTitle>
            <CardDescription>
              Manage your organization's subscription and billing information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Organization
                </p>
                <p className="text-lg font-semibold">{organization.name}</p>
              </div>

              {subscriptionStatus === "active" ||
              subscriptionStatus === "trialing" ? (
                <div className="p-4 border rounded-lg bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Active Subscription</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your plan is currently {subscriptionStatus}.
                        {organization.stripeCurrentPeriodEnd && (
                          <>
                            {" "}
                            Renewing on{" "}
                            {organization.stripeCurrentPeriodEnd.toLocaleDateString()}
                            .
                          </>
                        )}
                      </p>
                    </div>
                    <ManageBillingButton
                      organizationId={organizationId}
                      isSubscribed={true}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        No active subscription found.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose a plan to get started with Lifeline Pro Services.
                      </p>
                    </div>
                    <ManageBillingButton
                      organizationId={organizationId}
                      isSubscribed={false}
                      priceId={priceId}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
