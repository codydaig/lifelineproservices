/**
 * Vitest setup file
 * Runs before all tests
 */

// Verify TEST_DATABASE_URL is loaded
if (!process.env.TEST_DATABASE_URL || process.env.TEST_DATABASE_URL.includes("dummy")) {
  console.error("\n❌ Error: TEST_DATABASE_URL not found");
  console.error("Please create a separate test database and set TEST_DATABASE_URL in your .env.test.local file");
  console.error("\nExample .env.test.local:");
  console.error('TEST_DATABASE_URL="postgresql://user:password@localhost:5432/lifeline_test"');
  console.error("\nRun tests with: pnpm test");
  process.exit(1);
}

// Override DATABASE_URL with TEST_DATABASE_URL for all DB operations
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
