"use server";

import { auth } from "@/auth";
import {
  getAccountingClasses,
  insertAccountingClasses,
  createAccountingClass as dbCreateAccountingClass,
  updateAccountingClass as dbUpdateAccountingClass,
  NewAccountingClass,
} from "@workspace/db";
import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function importQuickBooksClasses(csvData: string) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  const organizationId = session.user.organizationId;

  // Skip first row (before header) if needed
  const lines = csvData.split(/\r?\n/);
  // Find the header row
  let headerIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.includes("Class full name")) {
      headerIndex = i;
      break;
    }
  }

  // Take from header onwards
  const cleanedCsvData = lines.slice(headerIndex).join("\n");

  const parsed = Papa.parse(cleanedCsvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => {
      if (header === "Class full name") return "name";
      if (header === "Created date") return "createdDate";
      return header;
    },
  });

  let rows = parsed.data as any[];

  // Remove junk rows at the end (empty rows or rows without a valid name)
  // Trim from the end until we find a row with actual data
  while (rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    // If the last row doesn't have a name or the name looks like metadata/timestamp
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
      rows.pop(); // Remove the last row
    } else {
      break; // Stop when we find a valid row
    }
  }

  const classesToInsert: NewAccountingClass[] = [];

  for (const row of rows) {
    if (!row.name) {
      continue;
    }

    const id = randomUUID();
    let createdAt: Date | undefined = undefined;

    // Parse the created date if present
    if (row.createdDate) {
      const parsedDate = new Date(row.createdDate);
      if (!isNaN(parsedDate.getTime())) {
        createdAt = parsedDate;
      }
    }

    classesToInsert.push({
      id: id,
      name: row.name,
      description: row.description || null,
      organizationId: organizationId,
      ...(createdAt && { createdAt }),
    });
  }

  if (classesToInsert.length > 0) {
    await insertAccountingClasses(classesToInsert);
  }

  revalidatePath("/accounting/classes");
  return { success: true, count: classesToInsert.length };
}

export async function createAccountingClass(
  data: Omit<
    NewAccountingClass,
    "id" | "organizationId" | "createdAt" | "updatedAt"
  >,
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  const accountingClass = await dbCreateAccountingClass({
    ...data,
    organizationId: session.user.organizationId,
  });

  revalidatePath("/accounting/classes");
  return accountingClass;
}

export async function updateAccountingClass(
  id: string,
  data: Partial<
    Omit<NewAccountingClass, "id" | "organizationId" | "createdAt" | "updatedAt">
  >,
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized");
  }

  // TODO: Verify class belongs to organization
  const accountingClass = await dbUpdateAccountingClass(id, data);

  revalidatePath("/accounting/classes");
  return accountingClass;
}
