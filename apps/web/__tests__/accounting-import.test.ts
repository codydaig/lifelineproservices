/**
 * End-to-end tests for QuickBooks import and reporting
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  accountingTransactions,
  chartOfAccounts,
  getBalanceSheetReport,
  getProfitAndLossReport,
} from "@workspace/db";
import { importQuickBooksLedgerForTest } from "../lib/import-helper";
import Papa from "papaparse";
import fs from "fs";
import path from "path";

interface DateRange {
  startDate: Date;
  endDate: Date;
}

function parseAmount(value: string): number {
  if (!value) return 0;
  const cleaned = value
    .toString()
    .replace(/[\$,"\s]/g, "")
    .replace(/[()]/g, "-");
  return parseFloat(cleaned) || 0;
}

function parseBalanceSheetCSV(csvPath: string): Map<string, number> {
  const csvData = fs.readFileSync(csvPath, "utf-8");
  const parsed = Papa.parse(csvData, { skipEmptyLines: true });
  const rows = parsed.data as string[][];
  const accounts = new Map<string, number>();

  const shouldSkip = (name: string) => {
    return (
      name.includes("Balance Sheet") ||
      name.includes("Gogebic Homes") ||
      name.includes("All Dates") ||
      name.includes("Distribution account") ||
      name.includes("Cash Basis") ||
      name === "Assets" ||
      name === "Liabilities and Equity" ||
      name === "Liabilities" ||
      name === "Equity" ||
      name.includes("Current Assets") ||
      name.includes("Fixed Assets") ||
      name.includes("Current Liabilities") ||
      name.includes("Bank Accounts") ||
      name.includes("Credit Cards") ||
      name.includes("Other Current Liabilities") ||
      name.toLowerCase().includes("total for")
    );
  };

  // First pass: identify parent accounts
  const parentAccounts = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    const accountName = rows[i]?.[0]?.trim();
    if (!accountName) continue;

    if (accountName.toLowerCase().startsWith("total for ")) {
      const parentName = accountName.replace(/^total for /i, "").trim();
      parentAccounts.add(parentName);
    }
  }

  // Second pass: process all accounts
  let currentParent: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 1) continue;

    const accountName = row[0]?.trim();
    const amount = row[1]?.trim();

    if (!accountName) continue;

    if (shouldSkip(accountName)) {
      if (accountName.toLowerCase().includes("total for")) {
        currentParent = null;
      }
      continue;
    }

    const isParent = parentAccounts.has(accountName);

    if (isParent) {
      currentParent = accountName;
      if (amount && amount !== "") {
        accounts.set(accountName, parseAmount(amount));
      }
    } else if (currentParent) {
      const fullName = `${currentParent}:${accountName}`;
      if (amount && amount !== "") {
        accounts.set(fullName, parseAmount(amount));
      }
    } else {
      if (amount && amount !== "") {
        accounts.set(accountName, parseAmount(amount));
      }
    }
  }

  return accounts;
}

function parseProfitLossCSV(
  csvPath: string,
): Map<string, { total: number; byClass: Map<string, number> }> {
  const csvData = fs.readFileSync(csvPath, "utf-8");
  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data as any[];
  const accounts = new Map<
    string,
    { total: number; byClass: Map<string, number> }
  >();

  const columns = Object.keys(rows[0] || {});
  const accountColumn = columns[0];

  for (const row of rows) {
    const accountName = row[accountColumn]?.trim();
    if (!accountName) continue;

    if (
      accountName.toLowerCase().includes("income") ||
      accountName.toLowerCase().includes("cost of goods") ||
      accountName.toLowerCase().includes("gross profit") ||
      accountName.toLowerCase().includes("expenses") ||
      accountName.toLowerCase().includes("operating income") ||
      accountName.toLowerCase().includes("other income") ||
      accountName.toLowerCase().includes("other expenses") ||
      accountName.toLowerCase().includes("total for") ||
      accountName.toLowerCase().includes("net") ||
      accountName.toLowerCase().includes("profit and loss") ||
      accountName.toLowerCase().includes("gogebic homes") ||
      accountName.toLowerCase().includes("all dates") ||
      accountName.toLowerCase().includes("cash basis")
    ) {
      continue;
    }

    const totalValue = row["Total"] || row[columns[columns.length - 1]];
    const total = parseAmount(totalValue);

    if (total === 0) continue;

    const byClass = new Map<string, number>();

    columns.slice(1, -1).forEach((className) => {
      const value = parseAmount(row[className]);
      if (value !== 0) {
        byClass.set(className, value);
      }
    });

    accounts.set(accountName, { total, byClass });
  }

  return accounts;
}

describe("QuickBooks Import and Reporting", () => {
  let organizationId: string;

  beforeAll(async () => {
    // Clear database
    await db.delete(accountingTransactions);

    // Get organization ID
    const accounts = await db.select().from(chartOfAccounts).limit(1);
    if (accounts.length === 0) {
      throw new Error("No accounts found - database not seeded");
    }
    organizationId = accounts[0].organizationId;

    // Import ledger
    const ledgerPath = path.join(process.cwd(), "../../gh_data", "Ledger.csv");
    const csvData = fs.readFileSync(ledgerPath, "utf-8");
    await importQuickBooksLedgerForTest(csvData, organizationId);
  });

  describe("Import", () => {
    it("should import all transactions successfully", async () => {
      const transactions = await db.select().from(accountingTransactions);
      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions.length).toBe(882);
    });

    it("should have balanced transactions", async () => {
      const ledgerPath = path.join(process.cwd(), "../../gh_data", "Ledger.csv");
      const csvData = fs.readFileSync(ledgerPath, "utf-8");
      const result = await importQuickBooksLedgerForTest(csvData, organizationId);

      expect(result.errors).toBe(0);
      expect(result.imported).toBe(882);
    });
  });

  describe("Balance Sheet Report", () => {
    it("should match expected account balances", async () => {
      const { balanceSheet, netIncome } = await getBalanceSheetReport(
        organizationId,
      );

      const expectedPath = path.join(
        process.cwd(),
        "../../gh_data",
        "balance-sheet.csv",
      );
      const expected = parseBalanceSheetCSV(expectedPath);

      const tolerance = 0.02;
      let matchCount = 0;
      let mismatchCount = 0;

      for (const [accountName, expectedAmount] of expected.entries()) {
        // Handle Net Income separately
        if (accountName === "Net Income") {
          const netIncomeMatch = Math.abs(netIncome - expectedAmount) < tolerance;
          expect(netIncomeMatch).toBe(true);
          if (netIncomeMatch) matchCount++;
          else mismatchCount++;
          continue;
        }

        const actualAccount = balanceSheet.find((a) => a.name === accountName);
        expect(actualAccount).toBeDefined();

        if (actualAccount) {
          const difference = Math.abs(actualAccount.balance - expectedAmount);
          expect(difference).toBeLessThan(tolerance);

          if (difference < tolerance) {
            matchCount++;
          } else {
            mismatchCount++;
          }
        } else {
          mismatchCount++;
        }
      }

      expect(matchCount).toBe(expected.size);
      expect(mismatchCount).toBe(0);
    });

    it("should have a balanced accounting equation", async () => {
      const { balanceSheet, netIncome } = await getBalanceSheetReport(
        organizationId,
      );

      const totalAssets = balanceSheet
        .filter((a) => a.type === "asset" && !a.parentAccountId)
        .reduce((sum, a) => sum + a.totalBalance, 0);

      const totalLiabilities = balanceSheet
        .filter((a) => a.type === "liability" && !a.parentAccountId)
        .reduce((sum, a) => sum + a.totalBalance, 0);

      const totalEquity = balanceSheet
        .filter((a) => a.type === "equity" && !a.parentAccountId)
        .reduce((sum, a) => sum + a.totalBalance, 0);

      const totalLiabilitiesAndEquity =
        totalLiabilities + totalEquity + netIncome;
      const balanceDifference = Math.abs(totalAssets - totalLiabilitiesAndEquity);

      expect(balanceDifference).toBeLessThan(0.01);
    });

    it("should calculate correct net income", async () => {
      const { netIncome } = await getBalanceSheetReport(organizationId);
      expect(netIncome).toBeCloseTo(2639.28, 2);
    });
  });

  describe("Profit & Loss Report", () => {
    it("should match expected account totals", async () => {
      const dateRange: DateRange = {
        startDate: new Date(0),
        endDate: new Date(2099, 11, 31),
      };
      const profitLoss = await getProfitAndLossReport(organizationId, dateRange);

      const expectedPath = path.join(
        process.cwd(),
        "../../gh_data",
        "profit-loss.csv",
      );
      const expected = parseProfitLossCSV(expectedPath);

      const tolerance = 0.02;
      let matchCount = 0;
      let mismatchCount = 0;

      for (const [accountName, expectedData] of expected.entries()) {
        const actualAccount = profitLoss.find((a) => a.name === accountName);
        expect(actualAccount).toBeDefined();

        if (actualAccount) {
          // Flip sign for expense accounts (CSV shows positive, DB stores negative)
          const expectedTotal =
            actualAccount.type === "expense"
              ? -expectedData.total
              : expectedData.total;

          const difference = Math.abs(actualAccount.total - expectedTotal);
          expect(difference).toBeLessThan(tolerance);

          if (difference < tolerance) {
            matchCount++;
          } else {
            mismatchCount++;
          }
        } else {
          mismatchCount++;
        }
      }

      expect(matchCount).toBe(expected.size);
      expect(mismatchCount).toBe(0);
    });

    it("should calculate correct net income", async () => {
      const dateRange: DateRange = {
        startDate: new Date(0),
        endDate: new Date(2099, 11, 31),
      };
      const profitLoss = await getProfitAndLossReport(organizationId, dateRange);

      const totalRevenue = profitLoss
        .filter((a) => a.type === "revenue" && !a.parentAccountId)
        .reduce((sum, a) => sum + a.totalBalance, 0);

      const totalExpenses = profitLoss
        .filter((a) => a.type === "expense" && !a.parentAccountId)
        .reduce((sum, a) => sum + a.totalBalance, 0);

      const netIncome = totalRevenue + totalExpenses;

      expect(netIncome).toBeCloseTo(2639.28, 2);
    });

    it("should have revenue greater than expenses", async () => {
      const dateRange: DateRange = {
        startDate: new Date(0),
        endDate: new Date(2099, 11, 31),
      };
      const profitLoss = await getProfitAndLossReport(organizationId, dateRange);

      const totalRevenue = profitLoss
        .filter((a) => a.type === "revenue" && !a.parentAccountId)
        .reduce((sum, a) => sum + a.totalBalance, 0);

      const totalExpenses = profitLoss
        .filter((a) => a.type === "expense" && !a.parentAccountId)
        .reduce((sum, a) => sum + a.totalBalance, 0);

      expect(totalRevenue).toBeGreaterThan(0);
      expect(totalExpenses).toBeLessThan(0);
      expect(totalRevenue).toBeGreaterThan(Math.abs(totalExpenses));
    });
  });
});
