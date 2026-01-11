# Test Suite

This directory contains the test suite for the accounting system using [Vitest](https://vitest.dev/).

## Setup

**IMPORTANT:** Tests use a separate test database to avoid affecting your development data.

### 1. Create Test Database

Create a separate PostgreSQL database for testing:

```bash
createdb lifeline_test
```

### 2. Configure Test Database

Create a `.env.test.local` file in the `apps/web` directory:

```bash
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/lifeline_test"
```

Replace `user`, `password`, and other connection details with your PostgreSQL credentials.

### 3. Seed Test Database

Run migrations and seed the test database with the chart of accounts:

```bash
# From the project root
TEST_DATABASE_URL="your-test-db-url" pnpm --filter @workspace/db db:migrate:run

# Then import the chart of accounts and other seed data
# (You'll need to run the import scripts with TEST_DATABASE_URL)
```

## Running Tests

From the `apps/web` directory:

### Run all tests once
```bash
pnpm test
```

### Run tests in watch mode (re-runs on file changes)
```bash
pnpm test:watch
```

### Run tests with UI (visual test runner)
```bash
pnpm test:ui
```

## Test Structure

### `accounting-import.test.ts`
End-to-end tests for QuickBooks import and reporting:
- **Import Tests**: Validates that all transactions are imported correctly
- **Balance Sheet Tests**: Verifies account balances match expected values
- **Profit & Loss Tests**: Validates revenue and expense calculations

## Adding New Tests

1. Create a new test file in `__tests__/` with the `.test.ts` extension
2. Import Vitest testing utilities:
   ```typescript
   import { describe, it, expect, beforeAll, afterAll } from "vitest";
   ```
3. Write your tests using the Vitest API (compatible with Jest)
4. Run the tests with `pnpm test`

### Example Test Structure

```typescript
import { describe, it, expect } from "vitest";

describe("Feature Name", () => {
  it("should do something", () => {
    expect(1 + 1).toBe(2);
  });

  it("should handle edge cases", async () => {
    const result = await someAsyncFunction();
    expect(result).toBeTruthy();
  });
});
```

## Test Configuration

Configuration is in `vitest.config.ts` in the apps/web directory:
- **Timeout**: 2 minutes for E2E tests
- **Environment**: Node.js
- **Setup**: `__tests__/setup.ts` runs before all tests

## CI/CD Integration

To run tests in CI/CD, ensure `TEST_DATABASE_URL` is set as an environment variable:

```bash
export TEST_DATABASE_URL="postgresql://user:password@localhost:5432/lifeline_test"
cd apps/web
pnpm test
```

The test suite exits with code 0 on success, 1 on failure, making it suitable for CI/CD pipelines.

**Note:** Your CI/CD pipeline should:
1. Create a test database
2. Run migrations on the test database
3. Seed the test database with required data (chart of accounts, etc.)
4. Run the test suite
5. Tear down the test database after tests complete

## Tips

- Use `it.only()` to run a single test during development
- Use `describe.skip()` or `it.skip()` to temporarily disable tests
- Tests run in parallel by default for speed
- Use `beforeAll` for expensive setup operations (like database seeding)
- Use `afterAll` for cleanup operations
