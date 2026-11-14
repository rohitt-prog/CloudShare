# CloudShare

CloudShare is a secure cloud-based file-sharing web application built with React, TypeScript, Tailwind CSS, and Supabase.

---

## 🚀 Development Roadmap (8 Phases)

- **Phase 1: Project Planning and Foundation** *(Completed)*
- **Phase 2A: Architecture Restructuring** *(Completed)*
- **Phase 2B: Backend Architecture & Supabase Integration** *(Completed)*
- **Phase 3: Authentication Implementation** *(Completed)*
- **Phase 4: UI/UX Design System & File Dashboard** *(Next)*
- **Phase 5: File Upload & Storage Management**
- **Phase 6: File Sharing & Access Permissions**
- **Phase 7: Security Hardening & Audit**
- **Phase 8: Testing, Optimization & Deployment**

---

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React
- **Cloud Platform:** Supabase (Auth, Storage, Database, RLS, Edge Functions)
- **Repository:** GitHub (`rohitt-prog/CloudVault`)
- **Tooling:** ESLint 9, PostCSS, Autoprefixer

---

## 📁 Directory Structure

```text
CloudShare/
├── public/                 # Static public assets
│
├── src/
│   ├── app/                # App initialization, router, and providers
│   │   ├── App.tsx         # Composed root application shell
│   │   ├── router.tsx      # Route dispatcher
│   │   └── providers/      # Global providers
│   │
│   ├── components/         # Shared presentation components
│   │   ├── layout/         # Shell components (Header, etc.)
│   │   └── ui/             # Atomic design components (Button, etc.)
│   │
│   ├── features/           # Domain-driven business features
│   │   ├── auth/           # Authentication components, hooks, services, types
│   │   ├── files/          # File explorer, upload workflows, services, types
│   │   └── sharing/        # Link generation, access verification, services, types
│   │
│   ├── pages/              # Route-level page components
│   ├── lib/                # Library configurations & clients
│   ├── utils/              # Utility helper functions
│   ├── constants/          # Application-wide constants & limits
│   ├── types/              # Cross-domain type exports
│   ├── App.tsx             # Root entry wrapper
│   ├── index.css           # Global Tailwind CSS styles
│   ├── main.tsx            # Application DOM entry point
│   └── vite-env.d.ts       # Vite client typing
│
├── supabase/               # Backend-as-a-Service infrastructure
│   ├── migrations/         # PostgreSQL schema migrations
│   ├── functions/          # Deno Edge Functions (privileged operations)
│   │   ├── create-share-link/  # Generates cryptographically secure sharing links
│   │   └── access-shared-file/ # Guest access & signed download URL generator
│   └── config.toml         # Local Supabase development configuration
│
├── docs/                   # Architecture & system specifications
│   ├── ARCHITECTURE.md     # Architecture specifications & security boundaries
│   └── DATABASE_SCHEMA.md  # Proposed database tables, RLS policies, and storage rules
│
├── .env.example            # Environment configuration template (Anon key only)
├── .gitignore              # Git ignore rules
├── eslint.config.js        # ESLint flat configuration
├── index.html              # HTML shell
├── package.json            # Project manifest & scripts
├── postcss.config.js       # PostCSS configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # Root TypeScript configuration
├── tsconfig.app.json       # App TypeScript configuration
├── tsconfig.node.json      # Node TypeScript configuration
└── vite.config.ts          # Vite build configuration
```

---

## 🚦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env
```

Configure your Supabase credentials in `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
> **Security Notice:** Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend environment variables. Only the public anon key (`VITE_SUPABASE_ANON_KEY`) should ever be included.

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

### 5. Lint Codebase
```bash
npm run lint
```
