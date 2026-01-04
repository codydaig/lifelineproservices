import { db } from "../client";
import { chartOfAccounts } from "../schema";
import { eq } from "drizzle-orm";

export async function getChartOfAccounts(organizationId: string) {
  return db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.organizationId, organizationId),
    orderBy: (accounts, { asc }) => [asc(accounts.name)],
  });
}
