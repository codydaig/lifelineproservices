import { db } from "../client";
import { organizations, organizationMembers } from "../schema";
import { eq } from "drizzle-orm";

export async function getUserOrganizations(userId: string) {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      imageUrl: organizations.imageUrl,
    })
    .from(organizations)
    .innerJoin(
      organizationMembers,
      eq(organizations.id, organizationMembers.organizationId),
    )
    .where(eq(organizationMembers.userId, userId));
}

export async function createOrganization(data: {
  name: string;
  slug: string;
  userId: string;
}) {
  return db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({
        name: data.name,
        slug: data.slug,
      })
      .returning();

    if (!organization) {
      throw new Error("Failed to create organization");
    }

    await tx.insert(organizationMembers).values({
      organizationId: organization.id,
      userId: data.userId,
      role: "owner",
    });

    return organization;
  });
}
