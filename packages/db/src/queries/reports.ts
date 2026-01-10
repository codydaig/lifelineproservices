import { db } from "../client";
import {
  accountingEntries,
  accountingTransactions,
  chartOfAccounts,
} from "../schema";
import { and, eq, gte, inArray, lte } from "drizzle-orm";

export interface ProfitAndLossAccount {
  id: string;
  name: string;
  type: "revenue" | "expense";
  parentAccountId: string | null;
  total: number;
  totalBalance: number;
}

export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export type DateRangePreset =
  | "last30days"
  | "last90days"
  | "thismonth"
  | "thisquarter"
  | "yeartodate"
  | "thisyear"
  | "lastmonth"
  | "lastquarter"
  | "lastyear"
  | "all"
  | "custom";

export function getDateRange(preset: DateRangePreset): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  switch (preset) {
    case "last30days":
      return {
        startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: endOfToday,
      };
    case "last90days":
      return {
        startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate: endOfToday,
      };
    case "thismonth":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: endOfToday,
      };
    case "thisquarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        startDate: new Date(now.getFullYear(), quarter * 3, 1),
        endDate: endOfToday,
      };
    }
    case "yeartodate":
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: endOfToday,
      };
    case "thisyear":
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    case "lastmonth":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        endDate: new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
          23,
          59,
          59,
          999,
        ),
      };
    case "lastquarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        startDate: new Date(now.getFullYear(), (quarter - 1) * 3, 1),
        endDate: new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59, 999),
      };
    }
    case "lastyear":
      return {
        startDate: new Date(now.getFullYear() - 1, 0, 1),
        endDate: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
      };
    case "all":
    default:
      return {
        startDate: new Date(0),
        endDate: endOfToday,
      };
  }
}

export async function getProfitAndLossReport(
  organizationId: string,
  dateRange: DateRange,
  classId?: string,
) {
  // Get all accounts of type Revenue or Expense
  const accounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.organizationId, organizationId),
      inArray(chartOfAccounts.type, ["revenue", "expense"]),
    ),
    orderBy: (accounts, { asc }) => [asc(accounts.name)],
  });

  if (accounts.length === 0) {
    return [];
  }

  // Get all entries for these accounts within the date range
  const entriesQuery = db
    .select({
      accountId: accountingEntries.accountId,
      debit: accountingEntries.debit,
      credit: accountingEntries.credit,
    })
    .from(accountingEntries)
    .innerJoin(
      accountingTransactions,
      eq(accountingEntries.transactionId, accountingTransactions.id),
    )
    .where(
      and(
        eq(accountingEntries.organizationId, organizationId),
        inArray(
          accountingEntries.accountId,
          accounts.map((a) => a.id),
        ),
        gte(accountingTransactions.date, dateRange.startDate),
        lte(accountingTransactions.date, dateRange.endDate),
        classId ? eq(accountingEntries.classId, classId) : undefined,
      ),
    );

  const entries = await entriesQuery;

  // Calculate totals for each account
  const accountTotals = new Map<string, number>();
  entries.forEach((entry) => {
    const currentTotal = accountTotals.get(entry.accountId) || 0;
    const debit = entry.debit ? parseFloat(entry.debit) : 0;
    const credit = entry.credit ? parseFloat(entry.credit) : 0;
    const amount = debit ? -debit : credit;
    accountTotals.set(entry.accountId, currentTotal + amount);
  });

  // Combine accounts with their totals
  const profitLoss: ProfitAndLossAccount[] = accounts.map((account) => ({
    id: account.id,
    name: account.name || "",
    type: account.type as "revenue" | "expense",
    parentAccountId: account.parentAccountId,
    total: accountTotals.get(account.id) || 0,
    totalBalance: accountTotals.get(account.id) || 0,
  }));

  // Calculate total balances including sub-accounts
  const accountBalances = new Map<string, number>();
  profitLoss.forEach((account) => {
    accountBalances.set(account.id, account.total);
  });

  // Update parent account totals with sub-account totals
  profitLoss.forEach((account) => {
    if (account.parentAccountId) {
      const parentBalance = accountBalances.get(account.parentAccountId) || 0;
      accountBalances.set(
        account.parentAccountId,
        parentBalance + account.total,
      );
    }
  });

  // Update accounts with their total balances
  profitLoss.forEach((account) => {
    account.totalBalance = accountBalances.get(account.id) || 0;
  });

  // Filter out zero-balance accounts but keep parent accounts with non-zero sub-accounts

  return profitLoss.filter((account) => {
    const hasNonZeroSubAccounts = profitLoss.some(
      (acc) => acc.parentAccountId === account.id && acc.totalBalance !== 0,
    );
    return account.totalBalance !== 0 || hasNonZeroSubAccounts;
  });
}
