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

export async function getOrganizationById(id: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, id),
  });
}

export async function createOrganization(data: {
  name: string;
  slug: string;
  userId: string;
  stripeCustomerId?: string;
}) {
  return db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({
        name: data.name,
        slug: data.slug,
        stripeCustomerId: data.stripeCustomerId,
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

export async function updateOrganizationSubscription(
  organizationId: string,
  data: {
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    stripeCurrentPeriodEnd: Date | null;
  },
) {
  console.log(
    `Updating organization ${organizationId} subscription:`,
    JSON.stringify(data),
  );
  return db
    .update(organizations)
    .set({
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripePriceId: data.stripePriceId,
      stripeCurrentPeriodEnd: data.stripeCurrentPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));
}

export async function getOrganizationByStripeCustomerId(
  stripeCustomerId: string,
) {
  return db.query.organizations.findFirst({
    where: eq(organizations.stripeCustomerId, stripeCustomerId),
  });
}
