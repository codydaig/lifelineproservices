"use server";

import { auth } from "@/auth";
import {
  createTransactionWithEntries,
  updateTransactionWithEntries,
  deleteTransaction as dbDeleteTransaction,
  getAccountingTransactions,
  getChartOfAccounts,
  getAccountingPayees,
  getAccountingClasses,
} from "@workspace/db";
import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

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

export async function createTransaction(data: TransactionData) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  const result = await createTransactionWithEntries(
    {
      transaction: {
        date: data.date,
        transactionType: data.transactionType,
        description: data.description || null,
        attachments: null,
        organizationId: session.user.organizationId,
      },
      entries: data.entries,
    },
    session.user.organizationId,
  );

  revalidatePath("/accounting/register");
  return result;
}

export async function updateTransaction(
  transactionId: string,
  data: TransactionData,
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  const result = await updateTransactionWithEntries(
    transactionId,
    {
      transaction: {
        date: data.date,
        transactionType: data.transactionType,
        description: data.description || null,
        attachments: null,
        organizationId: session.user.organizationId,
      },
      entries: data.entries,
    },
    session.user.organizationId,
  );

  revalidatePath("/accounting/register");
  return result;
}

export async function deleteTransaction(transactionId: string) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  await dbDeleteTransaction(transactionId, session.user.organizationId);
  revalidatePath("/accounting/register");
}

// Helper to normalize transaction type from CSV
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

// Helper to parse amount and remove commas
function parseAmount(amount: string | undefined): number {
  if (!amount) return 0;
  return parseFloat(amount.toString().replace(/,/g, ""));
}

export async function importQuickBooksLedger(csvData: string) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  const organizationId = session.user.organizationId;

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
  console.log(`First 10 lines:`, lines.slice(0, 10));

  // Find the header row (contains "Distribution account")
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.includes("Distribution account")) {
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
  console.log(`Data lines from header: ${dataLines.length}`);

  // Parse CSV
  const parsed = Papa.parse(dataLines.join("\n"), {
    header: true,
    skipEmptyLines: true,
  });

  let rows = parsed.data as any[];
  console.log(`Parsed rows: ${rows.length}`);
  console.log(`First parsed row:`, rows[0]);
  console.log(`Column headers:`, Object.keys(rows[0] || {}));

  let currentAccount: string | null = null;
  const transactionsToCreate: TransactionData[] = [];

  for (const row of rows) {
    // Get the first column (the one with no name or empty string)
    const firstColumn = row[""] || row[Object.keys(row)[0]];

    // Check if this is an account header row (first column has account name, rest are empty)
    if (firstColumn && firstColumn.trim() !== "" && !row["Transaction date"]) {
      currentAccount = firstColumn.trim();
      console.log(`Found account header: ${currentAccount}`);
      continue;
    }

    // Skip if no current account or no transaction date
    if (!currentAccount || !row["Transaction date"]) {
      continue;
    }

    // Skip total rows (you can add more conditions here)
    const name = row["Name"] || "";
    if (name.toLowerCase().includes("total")) {
      continue;
    }

    // Parse the row
    const date = new Date(row["Transaction date"]);
    const transactionType = normalizeTransactionType(
      row["Transaction type"] || "journal_entry",
    );
    const payeeName = row["Name"];
    const description = row["Memo/Description"] || payeeName || "";
    const splitAccountName = row["Split account"];
    const className = row["Item class"];
    const checkNumber = row["Num"] || null;
    const debit = parseAmount(row["Debit"]);
    const credit = parseAmount(row["Credit"]);

    // Get IDs
    const mainAccountId = accountMap.get(currentAccount);
    const splitAccountId = splitAccountName
      ? accountMap.get(splitAccountName)
      : null;
    const payeeId = payeeName ? payeeMap.get(payeeName) : null;
    const classId = className ? classMap.get(className) : null;

    if (!mainAccountId) {
      console.warn(`Account not found: ${currentAccount}`);
      continue;
    }

    // Create entries for this transaction
    const entries: TransactionData["entries"] = [];

    // Main account entry
    if (debit > 0) {
      entries.push({
        accountId: mainAccountId,
        payeeId,
        classId,
        number: checkNumber,
        debit: debit.toFixed(2),
        credit: null,
        memo: description,
      });
    } else if (credit > 0) {
      entries.push({
        accountId: mainAccountId,
        payeeId,
        classId,
        number: checkNumber,
        debit: null,
        credit: credit.toFixed(2),
        memo: description,
      });
    }

    // Split account entry (opposite side)
    if (splitAccountId) {
      if (debit > 0) {
        // If main account was debited, split account is credited
        entries.push({
          accountId: splitAccountId,
          payeeId,
          classId,
          number: checkNumber,
          debit: null,
          credit: debit.toFixed(2),
          memo: description,
        });
      } else if (credit > 0) {
        // If main account was credited, split account is debited
        entries.push({
          accountId: splitAccountId,
          payeeId,
          classId,
          number: checkNumber,
          debit: credit.toFixed(2),
          credit: null,
          memo: description,
        });
      }
    }

    // Only add transaction if we have valid entries
    if (entries.length >= 2) {
      transactionsToCreate.push({
        date,
        transactionType,
        description,
        entries,
      });
    } else {
      console.log(
        `Skipping transaction - not enough entries (${entries.length})`,
      );
    }
  }

  console.log(`Total transactions to create: ${transactionsToCreate.length}`);

  // Create all transactions
  let successCount = 0;
  let errorCount = 0;

  for (const txnData of transactionsToCreate) {
    try {
      await createTransaction(txnData);
      successCount++;
    } catch (error) {
      console.error("Failed to create transaction:", error);
      errorCount++;
    }
  }

  console.log(
    `Import complete - Success: ${successCount}, Errors: ${errorCount}`,
  );

  revalidatePath("/accounting/register");
  return {
    success: true,
    imported: successCount,
    errors: errorCount,
    total: transactionsToCreate.length,
  };
}
