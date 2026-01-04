import { db } from "../client";
import { accountingPayees, NewAccountingPayee } from "../schema";
import { eq } from "drizzle-orm";

export async function getAccountingPayees(organizationId: string) {
  return db.query.accountingPayees.findMany({
    where: eq(accountingPayees.organizationId, organizationId),
    orderBy: (payees, { asc }) => [asc(payees.name)],
  });
}

export async function insertAccountingPayees(payees: NewAccountingPayee[]) {
  if (payees.length === 0) return;
  return db.insert(accountingPayees).values(payees);
}

export async function createAccountingPayee(payee: NewAccountingPayee) {
  return db.insert(accountingPayees).values(payee).returning();
}

export async function updateAccountingPayee(
  id: string,
  payee: Partial<NewAccountingPayee>,
) {
  return db
    .update(accountingPayees)
    .set({ ...payee, updatedAt: new Date() })
    .where(eq(accountingPayees.id, id))
    .returning();
}
