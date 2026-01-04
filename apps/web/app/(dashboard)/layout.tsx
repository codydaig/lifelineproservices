import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
} from "@workspace/ui/components/sidebar";
import { auth, signOut } from "@/auth";
import { getUserOrganizations } from "@workspace/db";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session?.user?.id) return redirect("/api/auth/signin");
  if (!session.user.organizationId) return redirect("/organizations");
  const orgMemberships = await getUserOrganizations(session?.user?.id);
  const currentOrg = orgMemberships.find(
    (org) => org.id === session.user.organizationId,
  );
  if (
    !currentOrg?.stripeCurrentPeriodEnd ||
    currentOrg?.stripeCurrentPeriodEnd < new Date()
  )
    return redirect(`/organizations/${session.user.organizationId}/billing`);

  return (
    <SidebarProvider>
      <AppSidebar
        user={session?.user}
        memberships={orgMemberships}
        organizationid={session.user.organizationId}
        signout={async function () {
          "use server";
          return signOut();
        }}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
