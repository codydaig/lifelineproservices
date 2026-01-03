"use server";

import { auth, unstable_update } from "@/auth";
import { createOrganization } from "@workspace/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createOrganizationAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;

  if (!name || !slug) {
    throw new Error("Name and slug are required");
  }

  const organization = await createOrganization({
    name,
    slug,
    userId: session.user.id,
  });

  // Update the session with the new organizationId
  await unstable_update({
    user: {
      ...session.user,
      organizationId: organization.id,
    },
  });

  revalidatePath("/organizations");
  redirect("/");
}

export async function selectOrganizationAction(organizationId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Update the session with the selected organizationId
  await unstable_update({
    user: {
      ...session.user,
      organizationId,
    },
  });

  // revalidatePath("/organizations");
  redirect("/");
}
