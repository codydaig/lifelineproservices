/**
 * Import missing accounts from accounts.csv into the database
 */

import { db, chartOfAccounts } from "@workspace/db";
import Papa from "papaparse";
import fs from "fs";
import path from "path";

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("dummy")) {
  console.error("\n❌ Error: DATABASE_URL not found");
  console.error('Run with: DATABASE_URL=$(grep DATABASE_URL apps/web/.env.local | cut -d \'=\' -f2- | tr -d \'"\') pnpm tsx scripts/import-missing-accounts.ts');
  process.exit(1);
}

// Map QuickBooks types to our account types
function mapAccountType(qbType: string, qbDetailType: string): string {
  const type = qbType?.toLowerCase() || "";
  const detailType = qbDetailType?.toLowerCase() || "";

  if (type.includes("bank") || type.includes("checking")) return "asset";
  if (type.includes("accounts receivable")) return "asset";
  if (type.includes("fixed asset")) return "asset";
  if (type.includes("other asset")) return "asset";

  if (type.includes("accounts payable")) return "liability";
  if (type.includes("credit card")) return "liability";
  if (type.includes("loan") || type.includes("line of credit")) return "liability";
  if (type.includes("other current liabilities")) return "liability";

  if (type.includes("equity")) return "equity";
  if (type.includes("retained earnings")) return "equity";

  if (type.includes("income") || type.includes("other income")) return "revenue";

  if (type.includes("expense") || type.includes("other expense")) return "expense";
  if (type.includes("cost of goods sold")) return "expense";

  // Default based on common patterns
  if (detailType.includes("income")) return "revenue";
  if (detailType.includes("expense") || detailType.includes("cogs")) return "expense";

  return "expense"; // Default to expense if unclear
}

async function main() {
  // Read accounts.csv
  const csvPath = path.join(process.cwd(), "gh_data", "accounts.csv");
  const csvData = fs.readFileSync(csvPath, "utf-8");

  // Skip first 2 lines (title and empty line)
  const lines = csvData.split(/\r?\n/);
  const dataLines = lines.slice(2);

  const parsed = Papa.parse(dataLines.join("\n"), {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data as any[];

  // Get existing accounts from database
  const existingAccounts = await db.select().from(chartOfAccounts);
  const existingAccountNames = new Set(existingAccounts.map((a) => a.name));

  // Get organization ID from first account
  if (existingAccounts.length === 0) {
    console.error("❌ No accounts found in database. Cannot determine organization ID.");
    process.exit(1);
  }

  const organizationId = existingAccounts[0].organizationId;

  console.log(`\n📥 Importing missing accounts from accounts.csv...`);
  console.log(`Organization ID: ${organizationId}\n`);

  let importedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const accountName = row["Full name"]?.trim();
    const qbType = row["Type"]?.trim();
    const qbDetailType = row["Detail type"]?.trim();
    const description = row["Description"]?.trim();

    if (!accountName) continue;

    // Skip footer rows
    if (
      accountName === "TOTAL" ||
      accountName.includes("GMTZ") ||
      accountName === "Full name"
    ) {
      continue;
    }

    // Check if account already exists
    if (existingAccountNames.has(accountName)) {
      skippedCount++;
      continue;
    }

    // Map to our account type
    const accountType = mapAccountType(qbType, qbDetailType);

    // Map to subType
    let subType = "other";
    if (qbType?.toLowerCase().includes("bank") || qbType?.toLowerCase().includes("checking")) {
      subType = "bank";
    } else if (qbType?.toLowerCase().includes("credit card")) {
      subType = "credit_card";
    } else if (qbType?.toLowerCase().includes("fixed asset")) {
      subType = "fixed_asset";
    }

    console.log(`Adding: ${accountName}`);
    console.log(`  QB Type: ${qbType} → ${accountType} (${subType})`);
    console.log(`  Detail Type: ${qbDetailType}`);

    try {
      await db.insert(chartOfAccounts).values({
        name: accountName,
        type: accountType as "equity" | "asset" | "liability" | "revenue" | "expense",
        subType: subType as "bank" | "cash" | "fixed_asset" | "other" | "credit_card",
        description: description || null,
        organizationId: organizationId,
        parentAccountId: null,
      });

      importedCount++;
      console.log(`  ✅ Added\n`);
    } catch (error) {
      console.error(`  ❌ Error: ${error}\n`);
    }
  }

  console.log(`\n📊 Import Summary:`);
  console.log(`  Imported: ${importedCount}`);
  console.log(`  Skipped (already exist): ${skippedCount}`);
  console.log(`  Total in CSV: ${rows.length}`);

  process.exit(0);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
