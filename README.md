# CloudShare

CloudShare is a secure cloud-based file-sharing web application built with React, TypeScript, Tailwind CSS, and Supabase.

---

## 🚀 Development Roadmap (8 Phases)

- **Phase 1: Project Planning and Foundation** *(Completed)*
- **Phase 2A: Architecture Restructuring** *(Completed)*
- **Phase 2B: Backend Architecture & Supabase Integration** *(Completed)*
- **Phase 3: Authentication Implementation** *(Completed)*
- **Phase 4: UI/UX Design System & File Dashboard** *(Completed)*
- **Phase 5: File Upload & Storage Management** *(Completed)*
- **Phase 6: File Sharing & Access Permissions** *(Completed)*
- **Phase 7: Security Hardening & Audit** *(Next)*
- **Phase 8: Testing, Optimization & Deployment**

---

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React
- **Cloud Platform:** Supabase (Auth, Storage, Database, RLS, Edge Functions)
- **Repository:** GitHub (`rohitt-prog/CloudVault`)
- **Tooling:** ESLint 9, PostCSS, Autoprefixer, Node Test Runner

---

## 📁 Directory Structure

```text
CloudVault/
├── .gitignore                      # Multi-tier secret and artifact ignore rules
├── README.md                       # Project documentation and developer guide
├── package.json                    # Minimal root delegating scripts
│
├── backend/
│   └── supabase/                   # Supabase BaaS infrastructure
│       ├── config.toml             # Local Supabase development configuration
│       ├── migrations/             # PostgreSQL schema migrations (DDL, triggers, RLS)
│       └── functions/              # Deno Edge Functions (privileged operations)
│           ├── create-share-link/  # Generates cryptographically secure sharing links
│           └── access-shared-file/ # Guest access & signed download URL generator
│
├── docs/                           # Architecture & system specifications
│   ├── ARCHITECTURE.md             # System architecture & security boundaries
│   └── DATABASE_SCHEMA.md          # Proposed database tables, RLS policies, and storage rules
│
└── frontend/                       # Decoupled React + TypeScript + Vite application
    ├── .env.example                # Frontend environment configuration template (Anon key only)
    ├── eslint.config.js            # Frontend ESLint configuration
    ├── index.html                  # Single-page application HTML entry point
    ├── package.json                # Frontend dependencies and scripts
    ├── package-lock.json           # Frontend dependency lockfile
    ├── postcss.config.js           # PostCSS configuration
    ├── tailwind.config.js          # Tailwind CSS configuration
    ├── tsconfig.json               # Frontend TypeScript project references
    ├── tsconfig.app.json           # Application TypeScript configuration
    ├── tsconfig.node.json          # Vite Node tooling TypeScript configuration
    ├── vite.config.ts              # Vite build configuration with @/ alias
    │
    ├── public/                     # Static public assets
    │   └── favicon.svg             # Application favicon
    │
    ├── src/                        # Frontend source code
    │   ├── app/                    # Application initialization, router, and providers
    │   │   ├── App.tsx             # Composed root application shell
    │   │   ├── router.tsx          # Route dispatcher
    │   │   ├── router-context.ts   # Navigation context
    │   │   └── providers/          # Global providers (Auth, Router)
    │   ├── components/             # Shared presentation components
    │   │   ├── layout/             # Shell components (Header, etc.)
    │   │   └── ui/                 # Atomic design components (Button, Input, etc.)
    │   ├── constants/              # Application constants & limits
    │   ├── features/               # Domain-driven business verticals
    │   │   ├── auth/               # Authentication components, hooks, services, types
    │   │   ├── files/              # File explorer, upload workflows, services, types
    │   │   └── sharing/            # Link generation, access verification, services, types
    │   ├── hooks/                  # Global hooks
    │   ├── lib/                    # Library configurations (Supabase client)
    │   ├── pages/                  # Route-level page components (Home, Login, Register)
    │   ├── services/               # Shared services
    │   ├── types/                  # Cross-domain type exports and database contracts
    │   ├── utils/                  # Pure utility helper functions (cn, formatting)
    │   ├── App.tsx                 # Root entry wrapper
    │   ├── index.css               # Global Tailwind CSS directives
    │   ├── main.tsx                # Application DOM entry point
    │   └── vite-env.d.ts           # Vite client environment declarations
    │
    └── tests/                      # Frontend unit test suites
        ├── auth-validation.test.js # Authentication validation tests
        ├── file-management.test.js # File categorization, formatting, isolation tests
        ├── file-operations.test.js # File upload validation, storage path, and operation workflow tests
        └── sharing-operations.test.js # Token cryptography, format validation, and share service tests
```

---

## 🚦 Getting Started

### 1. Install Frontend Dependencies
```bash
cd frontend && npm install
```
*(Or from the repository root: `npm --prefix frontend install`)*

### 2. Environment Setup
Copy the example environment configuration inside `frontend/`:
```bash
cp frontend/.env.example frontend/.env
```

Configure your Supabase credentials in `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
> **Security Notice:** Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend environment variables. Only the public anon key (`VITE_SUPABASE_ANON_KEY`) should ever be included.

### 3. Development Server
Run from repository root:
```bash
npm run dev
```
*(Delegates to `npm --prefix frontend run dev`)*

### 4. Build for Production
Run from repository root:
```bash
npm run build
```
*(Delegates to `npm --prefix frontend run build`)*

### 5. Lint Codebase
Run from repository root:
```bash
npm run lint
```
*(Delegates to `npm --prefix frontend run lint`)*

### 6. Run Test Suites
Run from repository root:
```bash
npm test
```
*(Delegates to `npm --prefix frontend run test`)*

---

## ⚡ Supabase CLI Usage

Supabase backend assets reside in `backend/supabase/`. When invoking the Supabase CLI from the repository root, supply the global `--workdir backend` flag:

```bash
# Start local Supabase development stack
supabase --workdir backend start

# Check local Supabase stack status
supabase --workdir backend status

# Reset local database and run migrations
supabase --workdir backend db reset

# Test Edge Functions locally
supabase --workdir backend functions serve
```
*(Alternatively, change directory first: `cd backend && supabase <command>`)*
