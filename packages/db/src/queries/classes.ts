import { db } from "../client";
import { accountingClasses, NewAccountingClass } from "../schema";
import { eq } from "drizzle-orm";

export async function getAccountingClasses(organizationId: string) {
  return db.query.accountingClasses.findMany({
    where: eq(accountingClasses.organizationId, organizationId),
    orderBy: (classes, { asc }) => [asc(classes.name)],
  });
}

export async function insertAccountingClasses(classes: NewAccountingClass[]) {
  if (classes.length === 0) return;
  return db.insert(accountingClasses).values(classes);
}

export async function createAccountingClass(accountingClass: NewAccountingClass) {
  return db.insert(accountingClasses).values(accountingClass).returning();
}

export async function updateAccountingClass(
  id: string,
  accountingClass: Partial<NewAccountingClass>,
) {
  return db
    .update(accountingClasses)
    .set({ ...accountingClass, updatedAt: new Date() })
    .where(eq(accountingClasses.id, id))
    .returning();
}
