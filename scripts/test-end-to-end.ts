/**
 * End-to-end test suite for import and reporting
 *
 * This test:
 * 1. Clears the database
 * 2. Imports the ledger.csv
 * 3. Generates Balance Sheet and Profit & Loss reports
 * 4. Compares against expected balance-sheet.csv and profit-loss.csv
 * 5. Reports any discrepancies
 *
 * Run with:
 * DATABASE_URL=$(grep DATABASE_URL apps/web/.env.local | cut -d '=' -f2- | tr -d '"') pnpm tsx scripts/test-end-to-end.ts
 */

import {
  db,
  accountingTransactions,
  accountingEntries,
  chartOfAccounts,
  accountingPayees,
  accountingClasses,
  getBalanceSheetReport,
  getProfitAndLossReport,
  getDateRange,
} from "@workspace/db";
import { importQuickBooksLedgerForTest } from "./import-helper";
import Papa from "papaparse";
import fs from "fs";
import path from "path";

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("dummy")) {
  console.error("\n❌ Error: DATABASE_URL not found");
  console.error('Run with: DATABASE_URL=$(grep DATABASE_URL apps/web/.env.local | cut -d \'=\' -f2- | tr -d \'"\') pnpm tsx scripts/test-end-to-end.ts');
  process.exit(1);
}

interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function parseAmount(value: string): number {
  if (!value) return 0;
  const cleaned = value.toString().replace(/[\$,"\s]/g, "").replace(/[()]/g, "-");
  return parseFloat(cleaned) || 0;
}

async function clearDatabase() {
  console.log("\n🗑️  Clearing database...");
  await db.delete(accountingTransactions);
  console.log("   ✅ Database cleared");
}

async function importLedger() {
  console.log("\n📥 Importing ledger...");

  const ledgerPath = path.join(process.cwd(), "gh_data", "Ledger.csv");
  const csvData = fs.readFileSync(ledgerPath, "utf-8");

  // Get organization ID from first account
  const accounts = await db.select().from(chartOfAccounts).limit(1);
  if (accounts.length === 0) {
    throw new Error("No accounts found - database not seeded");
  }

  const organizationId = accounts[0].organizationId;

  const result = await importQuickBooksLedgerForTest(csvData, organizationId);

  console.log(`   📊 Import result:`);
  console.log(`      Imported: ${result.imported}`);
  console.log(`      Errors: ${result.errors}`);
  console.log(`      Total: ${result.total}`);

  if (result.errorMessages && result.errorMessages.length > 0) {
    console.log(`   ⚠️  First 5 error messages:`);
    result.errorMessages.slice(0, 5).forEach((msg) => {
      console.log(`      - ${msg}`);
    });
  }

  return result;
}

function parseBalanceSheetCSV(csvPath: string) {
  const csvData = fs.readFileSync(csvPath, "utf-8");

  // Use Papa Parse to properly handle CSV format
  const parsed = Papa.parse(csvData, {
    skipEmptyLines: true,
  });

  const rows = parsed.data as string[][];
  const accounts = new Map<string, number>();

  // Helper to check if account name should be skipped
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

  // First pass: identify parent accounts by finding "Total for..." rows
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

    // Skip header and total rows
    if (shouldSkip(accountName)) {
      // If this is a "Total for..." row, exit parent context
      if (accountName.toLowerCase().includes("total for")) {
        currentParent = null;
      }
      continue;
    }

    // Check if this account is a parent (has a matching "Total for..." row)
    const isParent = parentAccounts.has(accountName);

    if (isParent) {
      // This is a parent account
      currentParent = accountName;

      // If parent has a direct balance, include it
      if (amount && amount !== "") {
        accounts.set(accountName, parseAmount(amount));
      }
      // Otherwise it's just a header, don't add it to accounts
    } else if (currentParent) {
      // We're inside a parent context, so this is a child account
      const fullName = `${currentParent}:${accountName}`;
      if (amount && amount !== "") {
        accounts.set(fullName, parseAmount(amount));
      }
    } else {
      // Standalone account (not a parent, not a child)
      if (amount && amount !== "") {
        accounts.set(accountName, parseAmount(amount));
      }
    }
  }

  return accounts;
}

function parseProfitLossCSV(csvPath: string) {
  const csvData = fs.readFileSync(csvPath, "utf-8");
  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data as any[];
  const accounts = new Map<string, { total: number; byClass: Map<string, number> }>();

  // Get the actual column name for the first column (account names)
  const columns = Object.keys(rows[0] || {});
  const accountColumn = columns[0]; // First column name

  for (const row of rows) {
    const accountName = row[accountColumn]?.trim();
    if (!accountName) continue;

    // Skip headers and totals
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

    const totalValue = row["Total"] || row[columns[columns.length - 1]]; // Last column is usually Total
    const total = parseAmount(totalValue);

    // Skip if no total value
    if (total === 0) continue;

    const byClass = new Map<string, number>();

    // Parse all class columns (skip first and last which are account name and total)
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

async function testBalanceSheet() {
  console.log("\n📊 Testing Balance Sheet...");

  try {
    const accounts = await db.select().from(chartOfAccounts).limit(1);
    const organizationId = accounts[0].organizationId;

    // Generate report
    const { balanceSheet, netIncome } = await getBalanceSheetReport(organizationId);

    // Parse expected values
    const expectedPath = path.join(process.cwd(), "gh_data", "balance-sheet.csv");
    const expected = parseBalanceSheetCSV(expectedPath);

    console.log(`   📄 Expected accounts: ${expected.size}`);
    console.log(`   📄 Actual accounts: ${balanceSheet.filter(a => a.balance !== 0).length}`);

    // Compare each expected account
    const tolerance = 0.02; // $0.02 tolerance
    let matchCount = 0;
    let mismatchCount = 0;
    const mismatches: string[] = [];

    for (const [accountName, expectedAmount] of expected.entries()) {
      // Skip "Net Income" - it's a calculated value, not an actual account
      if (accountName === "Net Income") {
        // Verify the calculated net income matches
        const netIncomeMatch = Math.abs(netIncome - expectedAmount) < tolerance;
        if (netIncomeMatch) {
          matchCount++;
        } else {
          mismatchCount++;
          mismatches.push(
            `❌ Net Income calculation mismatch\n     Expected: $${expectedAmount.toFixed(2)}\n     Actual: $${netIncome.toFixed(2)}\n     Difference: $${Math.abs(netIncome - expectedAmount).toFixed(2)}`
          );
        }
        continue;
      }

      // Find matching account in actual results
      const actualAccount = balanceSheet.find((a) => a.name === accountName);

      if (!actualAccount) {
        mismatchCount++;
        mismatches.push(`❌ Missing: ${accountName} (expected: $${expectedAmount.toFixed(2)})`);
        continue;
      }

      const difference = Math.abs(actualAccount.balance - expectedAmount);

      if (difference > tolerance) {
        mismatchCount++;
        mismatches.push(
          `❌ Mismatch: ${accountName}\n     Expected: $${expectedAmount.toFixed(2)}\n     Actual: $${actualAccount.balance.toFixed(2)}\n     Difference: $${difference.toFixed(2)}`
        );
      } else {
        matchCount++;
      }
    }

    // Calculate totals
    const totalAssets = balanceSheet
      .filter((a) => a.type === "asset" && !a.parentAccountId)
      .reduce((sum, a) => sum + a.totalBalance, 0);

    const totalLiabilities = balanceSheet
      .filter((a) => a.type === "liability" && !a.parentAccountId)
      .reduce((sum, a) => sum + a.totalBalance, 0);

    const totalEquity = balanceSheet
      .filter((a) => a.type === "equity" && !a.parentAccountId)
      .reduce((sum, a) => sum + a.totalBalance, 0);

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + netIncome;
    const balanceDifference = Math.abs(totalAssets - totalLiabilitiesAndEquity);

    console.log(`\n   ✅ Matched accounts: ${matchCount}`);
    console.log(`   ❌ Mismatched accounts: ${mismatchCount}`);

    if (mismatches.length > 0 && mismatches.length <= 10) {
      console.log(`\n   Mismatches:`);
      mismatches.forEach((msg) => console.log(`      ${msg}`));
    } else if (mismatches.length > 10) {
      console.log(`\n   First 10 mismatches:`);
      mismatches.slice(0, 10).forEach((msg) => console.log(`      ${msg}`));
      console.log(`   ... and ${mismatches.length - 10} more`);
    }

    console.log(`\n   📊 Balance Sheet Equation:`);
    console.log(`      Assets: $${totalAssets.toFixed(2)}`);
    console.log(`      Liabilities: $${totalLiabilities.toFixed(2)}`);
    console.log(`      Equity: $${totalEquity.toFixed(2)}`);
    console.log(`      Net Income: $${netIncome.toFixed(2)}`);
    console.log(`      L + E + NI: $${totalLiabilitiesAndEquity.toFixed(2)}`);
    console.log(`      Difference: $${balanceDifference.toFixed(2)}`);

    const balanceSheetBalanced = balanceDifference < tolerance;

    if (!balanceSheetBalanced) {
      results.push({
        passed: false,
        message: "Balance Sheet does not balance",
        details: { difference: balanceDifference },
      });
    }

    if (mismatchCount === 0 && balanceSheetBalanced) {
      results.push({
        passed: true,
        message: "Balance Sheet matches expected values",
      });
    } else {
      results.push({
        passed: false,
        message: `Balance Sheet has ${mismatchCount} mismatches`,
        details: { mismatches: mismatches.slice(0, 5) },
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: "Balance Sheet test failed",
      details: { error: String(error) },
    });
    console.error(`   ❌ Error:`, error);
  }
}

async function testProfitAndLoss() {
  console.log("\n📊 Testing Profit & Loss...");

  try {
    const accounts = await db.select().from(chartOfAccounts).limit(1);
    const organizationId = accounts[0].organizationId;

    // Generate report for all dates
    // Note: Use a far future date to include all transactions in the CSV,
    // including any future-dated transactions
    const dateRange = {
      startDate: new Date(0), // Epoch
      endDate: new Date(2099, 11, 31), // Far future date
    };
    const profitLoss = await getProfitAndLossReport(organizationId, dateRange);

    // Parse expected values
    const expectedPath = path.join(process.cwd(), "gh_data", "profit-loss.csv");
    const expected = parseProfitLossCSV(expectedPath);

    console.log(`   📄 Expected accounts: ${expected.size}`);
    console.log(`   📄 Actual accounts: ${profitLoss.length}`);

    // Compare totals
    const tolerance = 0.02;
    let matchCount = 0;
    let mismatchCount = 0;
    const mismatches: string[] = [];

    for (const [accountName, expectedData] of expected.entries()) {
      const actualAccount = profitLoss.find((a) => a.name === accountName);

      if (!actualAccount) {
        mismatchCount++;
        mismatches.push(`❌ Missing: ${accountName} (expected: $${expectedData.total.toFixed(2)})`);
        continue;
      }

      // In the CSV, expenses are shown as positive, but in DB they're stored as negative
      // So flip the sign of expected value for expense accounts
      const expectedTotal = actualAccount.type === "expense"
        ? -expectedData.total
        : expectedData.total;

      const difference = Math.abs(actualAccount.total - expectedTotal);

      if (difference > tolerance) {
        mismatchCount++;
        mismatches.push(
          `❌ Mismatch: ${accountName}\n     Expected: $${expectedTotal.toFixed(2)}\n     Actual: $${actualAccount.total.toFixed(2)}\n     Difference: $${difference.toFixed(2)}`
        );
      } else {
        matchCount++;
      }
    }

    // Calculate Net Income
    const totalRevenue = profitLoss
      .filter((a) => a.type === "revenue" && !a.parentAccountId)
      .reduce((sum, a) => sum + a.totalBalance, 0);

    const totalExpenses = profitLoss
      .filter((a) => a.type === "expense" && !a.parentAccountId)
      .reduce((sum, a) => sum + a.totalBalance, 0);

    const netIncome = totalRevenue + totalExpenses; // expenses are negative

    console.log(`\n   ✅ Matched accounts: ${matchCount}`);
    console.log(`   ❌ Mismatched accounts: ${mismatchCount}`);

    if (mismatches.length > 0 && mismatches.length <= 10) {
      console.log(`\n   Mismatches:`);
      mismatches.forEach((msg) => console.log(`      ${msg}`));
    } else if (mismatches.length > 10) {
      console.log(`\n   First 10 mismatches:`);
      mismatches.slice(0, 10).forEach((msg) => console.log(`      ${msg}`));
      console.log(`   ... and ${mismatches.length - 10} more`);
    }

    console.log(`\n   📊 Profit & Loss Summary:`);
    console.log(`      Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`      Expenses: $${totalExpenses.toFixed(2)}`);
    console.log(`      Net Income: $${netIncome.toFixed(2)}`);
    console.log(`      Expected Net Income: $2,639.28`);

    if (mismatchCount === 0) {
      results.push({
        passed: true,
        message: "Profit & Loss matches expected values",
      });
    } else {
      results.push({
        passed: false,
        message: `Profit & Loss has ${mismatchCount} mismatches`,
        details: { mismatches: mismatches.slice(0, 5) },
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: "Profit & Loss test failed",
      details: { error: String(error) },
    });
    console.error(`   ❌ Error:`, error);
  }
}

async function runTests() {
  console.log("\n🧪 End-to-End Test Suite");
  console.log("=".repeat(80));

  try {
    // Step 1: Clear database
    await clearDatabase();

    // Step 2: Import ledger
    const importResult = await importLedger();

    if (importResult.errors > importResult.imported * 0.1) {
      // More than 10% errors
      console.log("\n⚠️  Warning: High error rate during import");
    }

    // Step 3: Test Balance Sheet
    await testBalanceSheet();

    // Step 4: Test Profit & Loss
    await testProfitAndLoss();

    // Print summary
    console.log("\n" + "=".repeat(80));
    console.log("\n📊 Test Summary");
    console.log("=".repeat(80));

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    results.forEach((result) => {
      const icon = result.passed ? "✅" : "❌";
      console.log(`${icon} ${result.message}`);
      if (result.details && !result.passed) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });

    console.log(`\n${passed}/${results.length} tests passed`);

    if (failed === 0) {
      console.log("\n🎉 All tests passed!");
      console.log("\n✅ The import and reporting system is working correctly!");
      process.exit(0);
    } else {
      console.log("\n❌ Some tests failed. Please review the errors above.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Fatal error during testing:", error);
    process.exit(1);
  }
}

runTests();
