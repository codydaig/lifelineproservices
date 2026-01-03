import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

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
            <p className="text-muted-foreground">
              Organization ID: {organizationId}
            </p>
            {/* Subscription details will go here */}
            <div className="mt-6 p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium">
                No active subscription found.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a plan to get started with Lifeline Pro Services.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
