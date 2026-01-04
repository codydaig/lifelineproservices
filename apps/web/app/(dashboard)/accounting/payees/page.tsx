import { auth } from "@/auth";
import { getAccountingPayees } from "@workspace/db";
import { redirect } from "next/navigation";
import { PayeesClient } from "./payees-client";

export default async function PayeesPage() {
  const session = await auth();
  if (!session?.user?.organizationId) return redirect("/api/auth/signin");

  const payees = await getAccountingPayees(session.user.organizationId);

  return <PayeesClient payees={payees} />;
}
