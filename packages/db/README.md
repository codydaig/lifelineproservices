# @workspace/db

Database package for Lifeline Pro Services using Drizzle ORM with Neon PostgreSQL.

## Features

- **Auth.js v5 Integration**: Complete schema for NextAuth.js authentication
- **Multi-tenancy**: Organization-based tenancy with user memberships
- **Billing Support**: Stripe integration fields at the organization level
- **Type-safe**: Full TypeScript support with Drizzle ORM

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
DATABASE_URL="postgresql://..."
```

3. Generate migrations:
```bash
pnpm db:generate
```

4. Push to database:
```bash
pnpm db:push
```

## Usage

### In your Next.js app

Import the database client and schema:

```typescript
import { db } from "@workspace/db/client";
import { users, organizations } from "@workspace/db/schema";
```

### Auth.js Configuration

Use the provided adapter in your Auth.js configuration:

```typescript
import { authAdapter } from "@workspace/db/adapter";

export const authOptions = {
  adapter: authAdapter,
  // ... other auth options
};
```

## Schema

### Auth Tables

- `user` - User accounts
- `account` - OAuth provider accounts
- `session` - User sessions
- `verificationToken` - Email verification tokens

### Multi-tenancy Tables

- `organization` - Organizations with billing info
- `organization_member` - User-organization relationships with roles

### Organization Roles

- `owner` - Full access, can delete organization
- `admin` - Can manage members and settings
- `member` - Basic access

## Scripts

- `pnpm db:generate` - Generate migrations from schema
- `pnpm db:migrate` - Run migrations
- `pnpm db:push` - Push schema directly to database
- `pnpm db:studio` - Open Drizzle Studio
