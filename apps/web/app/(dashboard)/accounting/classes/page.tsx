import { auth } from "@/auth";
import { getAccountingClasses } from "@workspace/db";
import { redirect } from "next/navigation";
import { ClassesClient } from "./classes-client";

export default async function ClassesPage() {
  const session = await auth();
  if (!session?.user?.organizationId) return redirect("/api/auth/signin");

  const classes = await getAccountingClasses(session.user.organizationId);

  return <ClassesClient classes={classes} />;
}
