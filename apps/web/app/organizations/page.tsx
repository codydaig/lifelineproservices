import { auth, signOut } from "@/auth";
import { getUserOrganizations } from "@workspace/db";
import { redirect } from "next/navigation";
import { OrganizationCard } from "./organization-card";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const organizations = await getUserOrganizations(session.user.id);

  return (
    <div className="min-h-screen bg-muted pb-20">
      <header className="border-b bg-background">
        <div className="container mx-auto py-10 px-4">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Organizations
              </h1>
              <p className="text-muted-foreground mt-1">
                Select an organization to manage your services.
              </p>
              <p className="text-[10px] text-muted-foreground/40 mt-2 uppercase tracking-tighter">
                Session: {session.user.email} • {session.user.id}
              </p>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <Button variant="outline" size="sm">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto pt-10 px-4">
        <Card className="max-w-5xl mx-auto shadow-lg border-0 bg-background">
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizations.map((org) => (
                <OrganizationCard key={org.id} organization={org} />
              ))}
              {organizations.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <p className="text-muted-foreground text-lg">
                    You are not a member of any organizations yet.
                  </p>
                </div>
              )}
            </div>
            <Button className="w-full mt-6">Create New Organization</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
