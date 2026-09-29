# buy-n-sell (working name)

A multi-tenant management platform for businesses that run a physical store, an online shop, or both. It started as an internal CRM for a buy-and-sell business and is being built as a product that other businesses can use too.

Each business on the platform has its own team, its own custom roles, and its own data, fully separated from every other business.

> **Status:** Early development. The account, business, and role foundation is in place. Team management, customers, inventory, and orders are next.

---

## Features

### Done

- **Invite-only accounts.** There is no public sign-up. The platform super admin creates businesses and their owners; owners create accounts for their staff.
- **Temporary passwords.** New accounts receive a temporary password and must set their own on first login.
- **Platform admin panel** (`/platform`) for the super admin to create businesses with owner accounts and view all businesses.
- **Multi-business support.** A user can belong to more than one business. Users with one business are sent straight to it; others get a picker.
- **Discord-style roles and permissions.**
  - Owners create custom roles (e.g. Cashier, Inventory Staff) and choose which permissions each role has.
  - Members can hold multiple roles; their permissions are combined.
  - Roles are ranked. You can only manage roles below your own highest role, and you can only grant permissions you have yourself.
  - The Owner role is locked and always has every permission.
- **Permission-aware navigation.** Each member only sees the sections their roles allow.
- **Tenant isolation.** Every business-owned query is filtered by `businessId`.

### Planned

- Team page: create staff accounts, assign roles, deactivate members
- Role reordering
- Customers
- Inventory (items, sellers/suppliers, stock status)
- Orders and payments
- Business settings
- Dashboard reports

---

## Tech stack

| Area      | Tool                                                                     |
| --------- | ------------------------------------------------------------------------ |
| Framework | [Next.js](https://nextjs.org) (App Router) + TypeScript                  |
| Database  | [Neon](https://neon.tech) (PostgreSQL)                                   |
| ORM       | [Prisma 7](https://www.prisma.io) with the Neon adapter                  |
| Auth      | [Better Auth](https://www.better-auth.com) (admin + nextCookies plugins) |
| Styling   | [Tailwind CSS](https://tailwindcss.com)                                  |

---

## How access works

```
Super Admin (platform level, role = "admin")
 └── creates Business + Owner account
      └── Owner (locked role, all permissions)
           └── creates custom roles and staff accounts
                └── Staff (one or more custom roles)
```

- **Super admin** is a platform-level role stored on the user (`role = "admin"`). It is not tied to any business and does **not** grant access to a business's data. This protects each business's privacy.
- **Permissions** are a fixed list defined in `src/lib/permissions.ts`. Owners can't invent new permissions, but they can bundle existing ones into any role.
- **Code checks permissions, never role names.** For example, pages check `customers.view` instead of "is this user a Cashier?", so custom roles work automatically.

### Data model (simplified)

| Model                                | Purpose                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `User`                               | A person's login account (Better Auth), including `role`, `banned`, and `mustChangePassword` |
| `Business`                           | A tenant on the platform, identified in URLs by its `slug`                                   |
| `Role`                               | A custom role inside a business, with `position` (rank), `color`, and `permissions`          |
| `Membership`                         | Connects a user to a business (one per user per business)                                    |
| `MembershipRole`                     | Connects a membership to its roles (many-to-many)                                            |
| `Session`, `Account`, `Verification` | Managed by Better Auth                                                                       |
| `Invitation`                         | Reserved for a possible future invite-by-email feature                                       |

---

## Getting started

### Prerequisites

- Node.js (LTS)
- A [Neon](https://neon.tech) project
- Git

### 1. Install dependencies

```bash
git clone <your-repo-url>
cd buy-n-sell
npm install
```

### 2. Set up environment variables

Create a `.env` file in the project root:

```env
# Neon pooled connection (host contains "-pooler") - used by the app
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler/DBNAME?sslmode=require"

# Neon direct connection - used by Prisma CLI for migrations
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"

# Better Auth
BETTER_AUTH_SECRET="a-long-random-string"
BETTER_AUTH_URL="http://localhost:3000"
```

Generate a secret with `npx @better-auth/cli secret`. Never commit `.env`.

### 3. Set up the database

```bash
npx prisma migrate dev
npx prisma generate
```

> Prisma 7 does not run `generate` automatically after migrations. Always run `npx prisma generate` after `migrate dev`.

### 4. Create the super admin account

Sign-up is disabled, so the first super admin is created directly in the database.

1. Generate a password hash with Better Auth's hashing function:

   ```bash
   npx tsx -e "import { hashPassword } from 'better-auth/crypto'; hashPassword(process.argv[1]).then(console.log)" "YOUR_PASSWORD"
   ```

   Clear the command from your terminal history afterward.

2. In the Neon SQL Editor, run:

   ```sql
   WITH new_user AS (
     INSERT INTO "user" (id, name, email, "emailVerified", role, "mustChangePassword", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, 'Your Name', 'you@example.com', true, 'admin', false, now(), now())
     RETURNING id
   )
   INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
   SELECT gen_random_uuid()::text, id, 'credential', id, 'PASTE_HASH_HERE', now(), now()
   FROM new_user;
   ```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) and sign in. As super admin, go to `/platform` to create your first business and its owner.

---

## Project structure

```
prisma/
  schema.prisma            Database schema
  migrations/              Migration history
prisma.config.ts           Prisma CLI config
src/
  app/
    api/auth/[...all]/     Better Auth API route
    login/                 Login page
    change-password/       Forced password change for temporary passwords
    dashboard/             Redirects users to their business (or shows a picker)
    platform/              Super admin panel
    b/[slug]/              Business area (layout, home, roles, ...)
  components/              Shared UI components
  generated/prisma/        Generated Prisma client (not committed)
  lib/
    prisma.ts              Shared Prisma client (Neon adapter)
    auth.ts                Better Auth server config
    auth-client.ts         Better Auth client
    session.ts             requireUser, requireSignedIn, requireSuperAdmin
    access.ts              Membership and permission helpers
    permissions.ts         Permission list, labels, and groups
```

---

## Adding a new permission

1. Add it to `PERMISSIONS` in `src/lib/permissions.ts`.
2. Add a label to `PERMISSION_LABELS` (TypeScript will remind you).
3. Add it to the right group in `PERMISSION_GROUPS` so it appears in the role editor.
4. Check it in pages with `can(access, PERMISSIONS.YOUR_PERMISSION)` and in server actions with `requirePermission(...)`.

Owners get new permissions automatically. Existing custom roles don't, so owners grant them from the Roles page.

---

## Development notes

- **Security rules to keep:**
  - Every server action must check who is calling (`requireSuperAdmin`, `requirePermission`, or `requireBusinessAccess`) before doing anything.
  - Every query on business data must filter by `businessId`.
  - Never give `role = "admin"` to anyone other than the platform owner.
- **Windows "ENOENT ... build-manifest.json" errors:** stop the dev server, delete `.next` (`Remove-Item -Recurse -Force .next`), and restart.
- **"@prisma/client did not initialize yet":** import `PrismaClient` from `@/generated/prisma/client`, not `@prisma/client`, and run `npx prisma generate`.
- **Theme:** the app is light-only for now. Dark mode will be added later with Tailwind `dark:` classes.

---

## License

Private project. All rights reserved.