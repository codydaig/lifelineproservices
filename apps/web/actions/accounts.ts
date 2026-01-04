"use server";

import { auth } from "@/auth";
import {
  getChartOfAccounts,
  insertChartOfAccounts,
  createChartOfAccount as dbCreateChartOfAccount,
  updateChartOfAccount as dbUpdateChartOfAccount,
  NewChartOfAccount,
} from "@workspace/db";
import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

function convertQBAccount(type: string): {
  type?: "asset" | "liability" | "equity" | "revenue" | "expense";
  subType?: "bank" | "cash" | "fixed_asset" | "other" | "credit_card";
} {
  if (type === "Bank") {
    return { type: "asset", subType: "bank" };
  } else if (type === "Accounts payable (A/P)") {
    return {};
  } else if (type === "Accounts receivable (A/R)") {
    return {};
  } else if (type === "Cost of Goods Sold") {
    return {};
  } else if (type === "Credit Card") {
    return { type: "liability", subType: "credit_card" };
  } else if (type === "Equity") {
    return { type: "equity", subType: "other" };
  } else if (type === "Expenses") {
    return { type: "expense", subType: "other" };
  } else if (type === "Fixed Assets") {
    return { type: "asset", subType: "fixed_asset" };
  } else if (type === "Income") {
    return { type: "revenue", subType: "other" };
  } else if (type === "Other Current Assets") {
    return { type: "asset", subType: "other" };
  } else if (type === "Other Current Liabilities") {
    return { type: "liability", subType: "other" };
  } else if (type === "Other Expense") {
    return { type: "expense", subType: "other" };
  }
  return {};
}

export async function importQuickBooksAccounts(csvData: string) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  const organizationId = session.user.organizationId;

  // Re-parsing after skipping first 3 lines of junk if necessary
  // The user's script: skipLines: 3
  const lines = csvData.split(/\r?\n/);
  const cleanedCsvData = lines.slice(2).join("\n");

  const parsed = Papa.parse(cleanedCsvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => {
      if (header === "Account #") return "number";
      if (header === "Full name") return "name";
      if (header === "Type") return "type";
      if (header === "Detail type") return "subtype";
      if (header === "Description") return "description";
      if (header === "Total balance") return "balance";
      return header;
    },
  });

  let rows = parsed.data as any[];

  // Delete the last 5 rows as per the user's script
  if (rows.length > 5) {
    rows = rows.slice(0, -5);
  } else {
    rows = [];
  }

  // Fetch existing accounts to handle parent lookups
  const existingAccounts = await getChartOfAccounts(organizationId);
  const nameToId = new Map<string, string>();
  for (const acc of existingAccounts) {
    if (acc.name) {
      nameToId.set(acc.name, acc.id);
    }
  }

  // Sort rows by name to ensure parents come before children
  rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const accountsToInsert: NewChartOfAccount[] = [];

  for (const row of rows) {
    const { type, subType } = convertQBAccount(row.type);
    if (!type || !row.name) {
      continue;
    }

    const id = randomUUID();
    let parentAccountId: string | undefined = undefined;

    if (row.name.includes(":")) {
      const lastColonIndex = row.name.lastIndexOf(":");
      const parentName = row.name.substring(0, lastColonIndex).trim();
      parentAccountId = nameToId.get(parentName);

      if (!parentAccountId) {
        // Try without trim if exact match failed
        parentAccountId = nameToId.get(row.name.substring(0, lastColonIndex));
      }
    }

    accountsToInsert.push({
      id: id,
      name: row.name,
      type: type,
      subType: subType || "other",
      description: row.description,
      organizationId: organizationId,
      parentAccountId: parentAccountId,
    });

    // Add new account to the map so its children can find it
    nameToId.set(row.name, id);
  }

  if (accountsToInsert.length > 0) {
    await insertChartOfAccounts(accountsToInsert);
  }

  revalidatePath("/accounts");
  return { success: true, count: accountsToInsert.length };
}

export async function createChartOfAccount(
  data: Omit<
    NewChartOfAccount,
    "id" | "organizationId" | "createdAt" | "updatedAt"
  >,
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  const account = await dbCreateChartOfAccount({
    ...data,
    organizationId: session.user.organizationId,
  });

  revalidatePath("/accounts");
  return account;
}

export async function updateChartOfAccount(
  id: string,
  data: Partial<
    Omit<NewChartOfAccount, "id" | "organizationId" | "createdAt" | "updatedAt">
  >,
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  // TODO: Verify account belongs to organization
  const account = await dbUpdateChartOfAccount(id, data);

  revalidatePath("/accounts");
  return account;
}
