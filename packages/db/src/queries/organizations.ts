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
