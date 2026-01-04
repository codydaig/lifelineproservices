import { db } from "../client";
import {
  accountingTransactions,
  accountingEntries,
  NewAccountingTransaction,
  NewAccountingEntry,
} from "../schema";
import { eq, desc, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function getAccountingTransactions(organizationId: string) {
  // Get transactions with their entries
  const transactions = await db.query.accountingTransactions.findMany({
    where: eq(accountingTransactions.organizationId, organizationId),
    orderBy: [desc(accountingTransactions.date), desc(accountingTransactions.createdAt)],
    with: {
      entries: {
        with: {
          account: true,
          payee: true,
          class: true,
        },
      },
    },
  });

  return transactions;
}

export async function getAccountingTransaction(id: string, organizationId: string) {
  const transaction = await db.query.accountingTransactions.findFirst({
    where: and(
      eq(accountingTransactions.id, id),
      eq(accountingTransactions.organizationId, organizationId)
    ),
    with: {
      entries: {
        with: {
          account: true,
          payee: true,
          class: true,
        },
      },
    },
  });

  return transaction;
}

interface TransactionWithEntries {
  transaction: Omit<NewAccountingTransaction, "id" | "createdAt" | "updatedAt">;
  entries: Omit<NewAccountingEntry, "id" | "transactionId" | "organizationId" | "createdAt" | "updatedAt">[];
}

// Validate that debits equal credits
function validateBalance(entries: TransactionWithEntries["entries"]): boolean {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const entry of entries) {
    if (entry.debit) {
      totalDebits += parseFloat(entry.debit.toString());
    }
    if (entry.credit) {
      totalCredits += parseFloat(entry.credit.toString());
    }
  }

  // Check if they're equal within a small tolerance (to handle floating point issues)
  return Math.abs(totalDebits - totalCredits) < 0.01;
}

export async function createTransactionWithEntries(
  data: TransactionWithEntries,
  organizationId: string
) {
  // Validate entries
  if (data.entries.length < 2) {
    throw new Error("Transaction must have at least 2 entries");
  }

  if (!validateBalance(data.entries)) {
    throw new Error("Transaction is not balanced: debits must equal credits");
  }

  // Validate each entry has either debit or credit (not both, not neither)
  for (const entry of data.entries) {
    const hasDebit = entry.debit !== null && entry.debit !== undefined && parseFloat(entry.debit.toString()) !== 0;
    const hasCredit = entry.credit !== null && entry.credit !== undefined && parseFloat(entry.credit.toString()) !== 0;

    if (hasDebit && hasCredit) {
      throw new Error("Entry cannot have both debit and credit");
    }
    if (!hasDebit && !hasCredit) {
      throw new Error("Entry must have either debit or credit");
    }
  }

  // Use a database transaction to ensure atomicity
  return await db.transaction(async (tx) => {
    // Create the transaction
    const [transaction] = await tx
      .insert(accountingTransactions)
      .values({
        ...data.transaction,
        organizationId,
      })
      .returning();

    if (!transaction) {
      throw new Error("Failed to create transaction");
    }

    // Create all entries
    const entries = await tx
      .insert(accountingEntries)
      .values(
        data.entries.map((entry) => ({
          ...entry,
          transactionId: transaction.id,
          organizationId,
        }))
      )
      .returning();

    return { transaction, entries };
  });
}

export async function updateTransactionWithEntries(
  transactionId: string,
  data: TransactionWithEntries,
  organizationId: string
) {
  // Validate entries
  if (data.entries.length < 2) {
    throw new Error("Transaction must have at least 2 entries");
  }

  if (!validateBalance(data.entries)) {
    throw new Error("Transaction is not balanced: debits must equal credits");
  }

  // Validate each entry
  for (const entry of data.entries) {
    const hasDebit = entry.debit !== null && entry.debit !== undefined && parseFloat(entry.debit.toString()) !== 0;
    const hasCredit = entry.credit !== null && entry.credit !== undefined && parseFloat(entry.credit.toString()) !== 0;

    if (hasDebit && hasCredit) {
      throw new Error("Entry cannot have both debit and credit");
    }
    if (!hasDebit && !hasCredit) {
      throw new Error("Entry must have either debit or credit");
    }
  }

  // Use a database transaction
  return await db.transaction(async (tx) => {
    // Update the transaction
    const [transaction] = await tx
      .update(accountingTransactions)
      .set({
        ...data.transaction,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(accountingTransactions.id, transactionId),
          eq(accountingTransactions.organizationId, organizationId)
        )
      )
      .returning();

    if (!transaction) {
      throw new Error("Failed to update transaction");
    }

    // Delete existing entries
    await tx
      .delete(accountingEntries)
      .where(
        and(
          eq(accountingEntries.transactionId, transactionId),
          eq(accountingEntries.organizationId, organizationId)
        )
      );

    // Create new entries
    const entries = await tx
      .insert(accountingEntries)
      .values(
        data.entries.map((entry) => ({
          ...entry,
          transactionId: transaction.id,
          organizationId,
        }))
      )
      .returning();

    return { transaction, entries };
  });
}

export async function deleteTransaction(transactionId: string, organizationId: string) {
  // Entries will be cascade deleted automatically
  return await db
    .delete(accountingTransactions)
    .where(
      and(
        eq(accountingTransactions.id, transactionId),
        eq(accountingTransactions.organizationId, organizationId)
      )
    )
    .returning();
}
