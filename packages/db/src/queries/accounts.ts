import { db } from "../client";
import { chartOfAccounts, NewChartOfAccount } from "../schema";
import { eq } from "drizzle-orm";

export async function getChartOfAccounts(organizationId: string) {
  return db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.organizationId, organizationId),
    orderBy: (accounts, { asc }) => [asc(accounts.name)],
  });
}

export async function insertChartOfAccounts(accounts: NewChartOfAccount[]) {
  if (accounts.length === 0) return;
  return db.insert(chartOfAccounts).values(accounts);
}

export async function createChartOfAccount(account: NewChartOfAccount) {
  return db.insert(chartOfAccounts).values(account).returning();
}

export async function updateChartOfAccount(
  id: string,
  account: Partial<NewChartOfAccount>,
) {
  return db
    .update(chartOfAccounts)
    .set({ ...account, updatedAt: new Date() })
    .where(eq(chartOfAccounts.id, id))
    .returning();
}
