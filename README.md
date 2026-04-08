# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Understanding Permissions

This application uses a **two-layer permission model** combining **Role-Based Access Control (RBAC)** and **Capability-Based Access Control (CBAC)**.

### Quick Reference: Role Hierarchy & Access

| Role | Tier | Admin Access | Directory Access | Leave Management | Payroll | Documents | Sensitive Data |
|------|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **Employee** | 1 | ❌ | ❌ | View Own | ❌ | ❌ | ✅ |
| **Manager** | 2 | ❌ | ✅ | View Team | ❌ | ❌ | ✅ |
| **General Manager** | 3 | ✅ | ✅ | View Team | ❌ | ❌ | ✅ |
| **HR** | 4 | ✅ | ✅ | Manage | ✅ | ✅ | ✅ |
| **Director** | 5 | ✅ | ✅ | Manage | ✅ | ❌ | ✅ |
| **Admin** | 6 | ✅ | ✅ | View | ❌ | ✅ | ✅ |

### Key Concepts

**Roles** (`AppRole`): The primary permission unit. Routes and navigation use role checks exclusively.

```typescript
type AppRole = 'employee' | 'manager' | 'general_manager' | 'hr' | 'director' | 'admin'
```

**Capabilities** (`AdminCapability`): Additional fine-grained controls for admin-specific features. Only used within admin pages for feature toggling.

**Permission Layers**:
1. **Route Level**: `ProtectedRoute` component gates entire route trees by role
2. **Navigation Level**: `AppSidebar` shows/hides menu items based on role helpers
3. **Page Level**: Admin pages may add capability-specific feature gating
4. **Business Logic**: Individual functions check permissions before executing operations

### For Developers

- **Adding a new page**: See [docs/admin-architecture.md](docs/admin-architecture.md#new-page-checklist) for how to choose the right shell and permission model
- **Permission helpers**: Use functions from [src/lib/permissions.ts](src/lib/permissions.ts) instead of inline role checks
- **Mobile navigation**: Mobile bottom nav uses same permission checks as desktop sidebar (see [src/components/layout/mobile-bottom-nav-config.ts](src/components/layout/mobile-bottom-nav-config.ts))
- **Testing**: Permission matrix test suite in [src/lib/permissions.test.ts](src/lib/permissions.test.ts) with 24+ test cases

### For Operations & Security

- **Admin credentials**: Only users with 'admin', 'hr', 'director', or 'general_manager' roles can access the governance console
- **Sensitive data access**: All authenticated users can view employee identifiers and contact info (define restrictions in RLS policies if needed)
- **Leave balance adjustments**: Only 'admin', 'hr', and 'director' roles can modify leave balances
- **Audit & compliance**: Admin users have full audit log visibility

### Detailed Documentation

- [Permission Architecture Guide](docs/permission-architecture.md) — Complete permission model, code patterns, and testing strategies
- [Admin Shell Architecture](docs/admin-architecture.md) — When to use AdminLayout vs AppLayout, rationale for separate shells
- [Test Coverage](src/lib/permissions.test.ts) — 24+ unit tests covering role hierarchies, matrix combinations, and regression cases
- [Integration Tests](src/test/integration/route-access.integration.test.ts) — 28 integration tests validating route access behavior

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
