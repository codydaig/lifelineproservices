/**
 * Import helper for testing - bypasses auth requirements
 */

import {
  db,
  createTransactionWithEntries,
  getChartOfAccounts,
  getAccountingPayees,
  getAccountingClasses,
} from "@workspace/db";
import Papa from "papaparse";

interface TransactionData {
  date: Date;
  transactionType:
    | "journal_entry"
    | "check"
    | "deposit"
    | "transfer"
    | "expense"
    | "invoice";
  description?: string | null;
  entries: {
    accountId: string;
    payeeId?: string | null;
    classId?: string | null;
    number?: string | null;
    debit?: string | null;
    credit?: string | null;
    memo?: string | null;
  }[];
}

function normalizeTransactionType(
  type: string,
): TransactionData["transactionType"] {
  const normalized = type.toLowerCase().replace(/\s+/g, "_");
  switch (normalized) {
    case "journal_entry":
    case "journal":
      return "journal_entry";
    case "check":
      return "check";
    case "deposit":
      return "deposit";
    case "transfer":
      return "transfer";
    case "expense":
    case "bill":
      return "expense";
    default:
      return "journal_entry";
  }
}

function parseAmount(amount: string | undefined): number {
  if (!amount) return 0;
  const cleaned = amount.toString().replace(/,/g, "").replace(/"/g, "");
  return parseFloat(cleaned) || 0;
}

// Raw CSV row from Papa Parse
interface QuickBooksCSVRow {
  "": string;
  "Transaction date": string;
  "Transaction type": string;
  "Num": string;
  "Name": string;
  "Memo/Description": string;
  "Split account": string;
  "Distribution account": string;
  "Debit": string;
  "Credit": string;
  "Balance": string;
  "Item class": string;
  [key: string]: string; // Allow dynamic access for first column
}

// Processed ledger row for transaction grouping
interface ParsedLedgerRow {
  account: string;
  date: string;
  type: string;
  num: string;
  name: string;
  memo: string;
  splitAccount: string;
  debit: string;
  balance: string;
  class: string;
  credit: string;
}

interface TransactionKey {
  date: string;
  type: string;
  num: string;
}

interface TransactionGroup {
  key: TransactionKey;
  entries: ParsedLedgerRow[];
}

export async function importQuickBooksLedgerForTest(
  csvData: string,
  organizationId: string,
) {
  // Get all accounts, payees, and classes for matching
  const [accounts, payees, classes] = await Promise.all([
    getChartOfAccounts(organizationId),
    getAccountingPayees(organizationId),
    getAccountingClasses(organizationId),
  ]);

  // Create lookup maps
  const accountMap = new Map(accounts.map((a) => [a.name, a.id]));
  const payeeMap = new Map(payees.map((p) => [p.name, p.id]));
  const classMap = new Map(classes.map((c) => [c.name, c.id]));

  const lines = csvData.split(/\r?\n/);

  console.log(`Total lines in CSV: ${lines.length}`);

  // Find the header row
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i]?.includes("Distribution account") ||
      lines[i]?.includes("Transaction date")
    ) {
      headerIndex = i;
      console.log(`Found header row at index ${i}`);
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error("Could not find header row in CSV");
  }

  // Start parsing from the header row
  const dataLines = lines.slice(headerIndex);

  // Parse CSV
  const parsed = Papa.parse(dataLines.join("\n"), {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data as QuickBooksCSVRow[];
  console.log(`Parsed ${rows.length} rows`);

  // Group rows by transaction
  const transactionGroups = new Map<string, TransactionGroup>();
  let currentAccount: string | null = null;
  let parentAccount: string | null = null;

  for (const row of rows) {
    // Get the first column for account name
    const firstKey = Object.keys(row)[0];
    const firstColumn = row[""] || (firstKey ? row[firstKey] : undefined);

    // Check if this is an account header row
    if (firstColumn && firstColumn.trim() !== "" && !row["Transaction date"]) {
      const accountName = firstColumn.trim();

      // If we have a parent context, FIRST try hierarchical name
      if (parentAccount) {
        const hierarchicalName = `${parentAccount}:${accountName}`;

        if (accountMap.has(hierarchicalName)) {
          // Found hierarchical match - use it
          currentAccount = hierarchicalName;
          console.log(`Found account: ${accountName} (parent: ${parentAccount}) -> using: ${hierarchicalName}`);
          continue;
        }
        // If hierarchical doesn't exist, fall through to check if this is a new parent
      }

      // Check if any accounts start with this name followed by a colon (it's a parent)
      const hasChildren = Array.from(accountMap.keys()).some(name =>
        name.startsWith(accountName + ":")
      );

      if (hasChildren) {
        // This is a parent account - but it can still have direct transactions
        parentAccount = accountName;
        currentAccount = accountName; // Allow parent to have direct entries
        console.log(`Found parent account: ${accountName}`);
      } else if (accountMap.has(accountName)) {
        // Direct match found (and it's not a parent with children)
        currentAccount = accountName;
        parentAccount = null; // Reset parent context
        console.log(`Found account: ${accountName} -> using: ${accountName}`);
      } else {
        // Account not found at all - skip it
        console.warn(`Account not found: ${accountName}`);
        currentAccount = null;
      }

      continue;
    }

    // Skip if no current account or no transaction date
    if (!currentAccount || !row["Transaction date"]) {
      continue;
    }

    // Skip total rows
    if (firstColumn?.toLowerCase().includes("total")) {
      continue;
    }

    const date = row["Transaction date"];
    const type = row["Transaction type"] || "Journal Entry";
    const num = row["Num"] || "";
    const name = row["Name"] || "";
    const memo = row["Memo/Description"] || "";
    const splitAccount = row["Split account"] || row["Distribution account"] || "";
    const debit = row["Debit"] || "";
    const credit = row["Credit"] || "";
    const balance = row["Balance"] || "";
    const className = row["Item class"] || "";

    const transactionKey = `${date}|${type}|${num}`;

    if (!transactionGroups.has(transactionKey)) {
      transactionGroups.set(transactionKey, {
        key: { date, type, num },
        entries: [],
      });
    }

    transactionGroups.get(transactionKey)!.entries.push({
      account: currentAccount,
      date,
      type,
      num,
      name,
      memo,
      splitAccount,
      debit,
      balance,
      class: className,
      credit,
    });
  }

  console.log(`Grouped into ${transactionGroups.size} transactions`);

  // Convert grouped transactions into TransactionData format
  const transactionsToCreate: TransactionData[] = [];
  const errors: string[] = [];

  for (const [key, group] of transactionGroups.entries()) {
    try {
      if (group.entries.length === 0) continue;

      const firstEntry = group.entries[0];
      if (!firstEntry) continue;

      const date = new Date(firstEntry.date);
      const transactionType = normalizeTransactionType(firstEntry.type);
      const descriptions = group.entries
        .map((e) => e.memo || e.name)
        .filter((d) => d)
        .join(", ");

      const entries: TransactionData["entries"] = [];

      for (const entry of group.entries) {
        const accountId = accountMap.get(entry.account);
        if (!accountId) {
          console.warn(`Account not found: ${entry.account}`);
          continue;
        }

        const payeeId = entry.name ? payeeMap.get(entry.name) : null;
        const classId = entry.class ? classMap.get(entry.class) : null;
        const debit = parseAmount(entry.debit);
        const credit = parseAmount(entry.credit);

        if (debit > 0 || credit > 0) {
          entries.push({
            accountId,
            payeeId,
            classId,
            number: entry.num || null,
            debit: debit > 0 ? debit.toFixed(2) : null,
            credit: credit > 0 ? credit.toFixed(2) : null,
            memo: entry.memo || entry.name || null,
          });
        }
      }

      // Validate that transaction balances
      const totalDebits = entries.reduce(
        (sum, e) => sum + (e.debit ? parseFloat(e.debit) : 0),
        0
      );
      const totalCredits = entries.reduce(
        (sum, e) => sum + (e.credit ? parseFloat(e.credit) : 0),
        0
      );

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        console.warn(
          `Transaction doesn't balance: ${key} (Debits: ${totalDebits}, Credits: ${totalCredits})`
        );
        errors.push(
          `Transaction ${key}: Debits ${totalDebits} != Credits ${totalCredits}`
        );
        continue;
      }

      if (entries.length >= 2) {
        transactionsToCreate.push({
          date,
          transactionType,
          description: descriptions,
          entries,
        });
      }
    } catch (error) {
      console.error(`Error processing transaction ${key}:`, error);
      errors.push(`Error in transaction ${key}: ${error}`);
    }
  }

  console.log(`Created ${transactionsToCreate.length} transactions to import`);

  // Create all transactions
  let successCount = 0;
  let errorCount = 0;

  for (const txnData of transactionsToCreate) {
    try {
      await createTransactionWithEntries(
        {
          transaction: {
            date: txnData.date,
            transactionType: txnData.transactionType,
            description: txnData.description || null,
            attachments: null,
            organizationId: organizationId,
          },
          entries: txnData.entries,
        },
        organizationId,
      );
      successCount++;
    } catch (error) {
      console.error("Failed to create transaction:", error);
      errorCount++;
      errors.push(`Failed to create: ${error}`);
    }
  }

  console.log(
    `Import complete - Success: ${successCount}, Errors: ${errorCount}`
  );

  return {
    success: true,
    imported: successCount,
    errors: errorCount,
    total: transactionsToCreate.length,
    errorMessages: errors,
  };
}
