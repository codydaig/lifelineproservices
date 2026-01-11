/**
 * Script to clear all transactions from the database
 * This prepares the database for a fresh import
 *
 * Run with:
 * DATABASE_URL=$(grep DATABASE_URL apps/web/.env.local | cut -d '=' -f2- | tr -d '"') pnpm tsx scripts/clear-transactions.ts
 *
 * WARNING: This will delete ALL transactions and their entries!
 * Make sure you have a backup if needed.
 */

import { db } from "@workspace/db/client";
import { accountingTransactions, accountingEntries } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import readline from "readline";

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("dummy")) {
  console.error("\n❌ Error: DATABASE_URL not found or is set to dummy value");
  console.error("\nTo run this script, use:");
  console.error('  DATABASE_URL=$(grep DATABASE_URL apps/web/.env.local | cut -d \'=\' -f2- | tr -d \'"\') pnpm tsx scripts/clear-transactions.ts');
  process.exit(1);
}

async function clearTransactions() {
  console.log("\n⚠️  WARNING: This will delete ALL transactions and entries!");
  console.log("This action cannot be undone.");

  // Create readline interface for user confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question("\nAre you sure you want to proceed? (type 'yes' to confirm): ", resolve);
  });

  rl.close();

  if (answer.toLowerCase() !== "yes") {
    console.log("\n❌ Operation cancelled.");
    process.exit(0);
  }

  console.log("\n🗑️  Clearing transactions...");

  try {
    // Get counts before deletion
    const entriesCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(accountingEntries);

    const transactionsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(accountingTransactions);

    console.log(`\nFound:`);
    console.log(`  ${entriesCount[0].count} entries`);
    console.log(`  ${transactionsCount[0].count} transactions`);

    // Delete all transactions (entries will cascade delete)
    await db.delete(accountingTransactions);

    console.log("\n✅ Successfully deleted all transactions!");
    console.log("\n📊 Database is now ready for fresh import.");
    console.log("\n📝 Next steps:");
    console.log("  1. Navigate to the Register page in the web app");
    console.log("  2. Click 'Import CSV'");
    console.log("  3. Upload gh_data/ledger.csv");
    console.log("  4. Wait for the import to complete");
    console.log("  5. Verify the Balance Sheet balances");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error clearing transactions:", error);
    process.exit(1);
  }
}

clearTransactions();
