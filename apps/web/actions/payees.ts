"use server";

import { auth } from "@/auth";
import {
  getAccountingPayees,
  insertAccountingPayees,
  createAccountingPayee as dbCreateAccountingPayee,
  updateAccountingPayee as dbUpdateAccountingPayee,
  NewAccountingPayee,
} from "@workspace/db";
import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function importQuickBooksPayees(csvData: string) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  const organizationId = session.user.organizationId;

  // Detect if this is a vendor or customer CSV by looking for header keywords
  const isVendorCSV = csvData.includes("Vendor") || csvData.includes("1099 Tracking");
  const isCustomerCSV = csvData.includes("Customer type");

  // Parse the CSV
  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => {
      // Normalize headers for both vendor and customer formats
      if (header === "Vendor" || header === "Name") return "name";
      if (header === "Company name") return "companyName";
      if (header === "Street Address") return "address1";
      if (header === "City") return "city";
      if (header === "State") return "state";
      if (header === "Zip") return "zip";
      if (header === "Phone") return "phone";
      if (header === "Email") return "email";
      if (header === "Attachments") return "attachments";
      if (header === "1099 Tracking") return "tracking1099";
      return header;
    },
  });

  let rows = parsed.data as any[];

  // Remove junk rows at the end
  while (rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    if (
      !lastRow.name ||
      lastRow.name.trim() === "" ||
      lastRow.name.includes("Sunday") ||
      lastRow.name.includes("Monday") ||
      lastRow.name.includes("Tuesday") ||
      lastRow.name.includes("Wednesday") ||
      lastRow.name.includes("Thursday") ||
      lastRow.name.includes("Friday") ||
      lastRow.name.includes("Saturday") ||
      lastRow.name.includes("GMTZ")
    ) {
      rows.pop();
    } else {
      break;
    }
  }

  const payeesToInsert: NewAccountingPayee[] = [];

  for (const row of rows) {
    // Use either the name field or company name, prioritizing name
    const payeeName = row.name || row.companyName;

    if (!payeeName) {
      continue;
    }

    const id = randomUUID();

    // For vendors: 1 = has attachment (W9 vendor), 0 = no attachment
    const hasAttachment = row.attachments === "1" || row.attachments === 1;

    payeesToInsert.push({
      id: id,
      name: payeeName,
      address1: row.address1 || null,
      address2: null, // CSV doesn't have address2
      city: row.city || null,
      state: row.state || null,
      zip: row.zip || null,
      phone: row.phone || null,
      email: row.email || null,
      isW9vendor: hasAttachment,
      w9Attachment: hasAttachment ? "Yes" : null,
      organizationId: organizationId,
    });
  }

  if (payeesToInsert.length > 0) {
    await insertAccountingPayees(payeesToInsert);
  }

  revalidatePath("/accounting/payees");
  return { success: true, count: payeesToInsert.length };
}

export async function createAccountingPayee(
  data: Omit<
    NewAccountingPayee,
    "id" | "organizationId" | "createdAt" | "updatedAt"
  >,
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  const payee = await dbCreateAccountingPayee({
    ...data,
    organizationId: session.user.organizationId,
  });

  revalidatePath("/accounting/payees");
  return payee;
}

export async function updateAccountingPayee(
  id: string,
  data: Partial<
    Omit<NewAccountingPayee, "id" | "organizationId" | "createdAt" | "updatedAt">
  >,
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  // TODO: Verify payee belongs to organization
  const payee = await dbUpdateAccountingPayee(id, data);

  revalidatePath("/accounting/payees");
  return payee;
}
