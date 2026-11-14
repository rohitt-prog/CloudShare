# CloudShare Architecture Documentation

> [!IMPORTANT]
> **Design Status Notice:**
> The current repository contains the **frontend architecture foundation** and **Supabase architectural design specifications**.
>
> **Supabase database tables, Row Level Security (RLS) policies, Storage buckets, database triggers, and Edge Function runtime execution logic are NOT yet deployed or operational.**
>
> The backend sections in this document describe the **target architecture** for subsequent implementation phases (Phases 2B through 8).

---

## Current Implementation vs. Planned Components

| Component / Subsystem | Current Status | Target Implementation Phase |
|---|:---:|:---:|
| **Frontend Feature Architecture (`frontend/src/app/`, `features/`, `components/`)** | **Implemented** | Phase 2A |
| **Domain TypeScript Type Contracts (`auth`, `files`, `sharing`)** | **Implemented** | Phase 2A |
| **Vite & TypeScript Strict Mode Tooling** | **Implemented** | Phase 1 & 2A |
| **Supabase Configuration (`backend/supabase/config.toml`)** | **Implemented** | Phase 2A |
| **Edge Function Type Contracts & Definitions** | **Implemented** | Phase 2A |
| **Supabase Client SDK (`@supabase/supabase-js`)** | **Implemented** | Phase 2B |
| **PostgreSQL Database Tables (`profiles`, `files`, `share_links`)** | **Implemented in Migration (Deployment Pending)** | Phase 2B |
| **Database Triggers (`on_auth_user_created`, `handle_updated_at`)** | **Implemented in Migration (Deployment Pending)** | Phase 2B |
| **Row Level Security (RLS) Policies** | **Implemented in Migration (Deployment Pending)** | Phase 2B |
| **Private Supabase Storage Bucket (`user-files`) & Storage RLS** | **Implemented in Migration (Deployment Pending)** | Phase 5 |
| **Authentication Flow & Session Management (`features/auth`)** | **Implemented** | Phase 3 |
| **File Management & Dashboard (`features/files`)** | **Implemented** | Phase 4 |
| **File Upload, Download & Storage Operations (`features/files`)** | **Implemented** | Phase 5 |
| **Edge Function Runtime Logic (`create-share-link`, `access-shared-file`)** | **Implemented in Code (Deployment Pending)** | Phase 6 |
| **Secure File Sharing UI & Service (`features/sharing`, `useShare`, `ShareModal`)** | **Implemented** | Phase 6 |
| **Public Guest Portal & Route (`pages/SharedFilePage`, `?share=TOKEN`)** | **Implemented** | Phase 6 |

---

## 1. System Overview

CloudShare is a secure cloud-based file-sharing web application designed on a modern decoupled architecture:
1. **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React.
2. **Backend Services (Target):** Supabase (Auth, PostgreSQL Database, Private Storage, Row Level Security, Edge Functions).

In the target architecture, there is **no standalone Node.js, Express, or FastAPI server**. The React client will communicate directly with Supabase via the official Supabase JavaScript SDK using the public anonymous key (`VITE_SUPABASE_ANON_KEY`), while all authorization, data integrity, and multi-tenant isolation will be enforced at the PostgreSQL database layer (via Row Level Security) and isolated serverless Supabase Edge Functions.

```mermaid
flowchart TD
    subgraph Client["Client Application (React + Vite - Implemented)"]
        UI["UI Layer (Components & Layout)"]
        Features["Features (auth, files, sharing)"]
        Router["App Router & Providers"]
        SupaClient["Supabase Client (Anon Key Only - Phase 2B)"]
        UI --> Features
        Features --> SupaClient
        Router --> UI
    end

    subgraph SupabasePlatform["Supabase Managed Cloud Backend (Target Design)"]
        subgraph EdgeRuntime["Edge Functions Runtime (Contracts Defined)"]
            CreateShareFn["create-share-link (Phase 6)"]
            AccessShareFn["access-shared-file (Phase 6)"]
        end

        subgraph SecurityLayer["Security & Policy Boundary (Planned)"]
            RLS["PostgreSQL Row Level Security (Phase 2B)"]
            AuthEngine["GoTrue Auth Engine (Phase 4)"]
        end

        subgraph DataLayer["Storage & Data Layer (Planned)"]
            PGDB[("PostgreSQL DB: profiles, files, share_links (Phase 2B)")]
            PrivateBucket[("Private Storage Bucket: user-files (Phase 2B)")]
        end
    end

    Features -. "Authenticated Queries (JWT)" .-> RLS
    Features -. "Auth Requests (Sign In/Up)" .-> AuthEngine
    Features -. "Invoke Share Operations" .-> EdgeRuntime
    AuthEngine -. "Issues JWT" .-> SupaClient
    RLS -.-> PGDB
    EdgeRuntime -. "Service Role (Bypass RLS)" .-> PGDB
    EdgeRuntime -. "Generate Signed URLs" .-> PrivateBucket
    PrivateBucket -. "Enforces Private Access" .-> RLS
```

---

## 2. Directory Structure & Responsibilities

The codebase follows a decoupled architecture separating the frontend client application, root documentation, and Supabase BaaS configurations:

```text
CloudVault/
├── .gitignore                      # Multi-tier secret and artifact ignore rules
├── README.md                       # Project documentation and phase roadmap
├── package.json                    # Minimal root delegating scripts
│
├── backend/
│   └── supabase/                   # Supabase BaaS infrastructure
│       ├── config.toml             # Local Supabase development configuration
│       ├── migrations/             # PostgreSQL schema migrations (DDL, triggers, RLS policies)
│       └── functions/              # Deno-based Edge Functions for privileged operations
│           ├── create-share-link/  # Generates cryptographically secure sharing links
│           └── access-shared-file/ # Validates tokens, checks expirations, issues signed download URLs
│
├── docs/                           # System design, architecture, and schema documentation
│   ├── ARCHITECTURE.md             # Architecture specifications and security boundary definitions
│   └── DATABASE_SCHEMA.md          # Proposed PostgreSQL tables, relationships, and RLS policies
│
└── frontend/                       # Decoupled React + TypeScript + Vite application
    ├── .env.example                # Template for frontend environment variables (Anon key only)
    ├── eslint.config.js            # Frontend ESLint configuration
    ├── index.html                  # Single-page application HTML entry shell
    ├── package.json                # Frontend package dependencies & scripts
    ├── package-lock.json           # Frontend dependency lockfile
    ├── postcss.config.js           # PostCSS configuration
    ├── tailwind.config.js          # Tailwind CSS configuration
    ├── tsconfig.json               # Frontend TypeScript project references
    ├── tsconfig.app.json           # Application TypeScript configuration
    ├── tsconfig.node.json          # Vite tooling TypeScript configuration
    ├── vite.config.ts              # Vite configuration with @/ alias
    │
    ├── public/                     # Static public assets
    │   └── favicon.svg             # Application favicon
    │
    ├── src/                        # Frontend source code
    │   ├── app/                    # Application initialization, root wrapper, router, and global providers
    │   │   ├── App.tsx             # Root container composing providers and routing
    │   │   ├── router.tsx          # Declarative route dispatcher
    │   │   ├── router-context.ts   # Navigation context
    │   │   └── providers/          # Composable application-wide context providers
    │   ├── components/             # Shared presentation components (feature-agnostic)
    │   │   ├── ui/                 # Atomic UI primitives (Button, Input)
    │   │   └── layout/             # Structural shell components (Header)
    │   ├── constants/              # Application-wide constants, limits, and configuration keys
    │   ├── features/               # Domain-driven feature modules (isolated business verticals)
    │   │   ├── auth/               # Authentication state, login/registration UI, auth hooks & types
    │   │   ├── files/              # File explorer, upload workflows, file management hooks & types
    │   │   └── sharing/            # Link generation, access verification, permission rules & types
    │   ├── hooks/                  # Global application hooks
    │   ├── lib/                    # External library instances and integrations (Supabase client)
    │   ├── pages/                  # Route-level page components (views assembled from features)
    │   ├── services/               # Shared service interfaces
    │   ├── types/                  # Cross-domain type exports and global application contracts
    │   ├── utils/                  # Pure utility functions (string formatting, byte size calculation, cn)
    │   ├── App.tsx                 # Root entry wrapper component
    │   ├── index.css               # Global Tailwind CSS directives
    │   ├── main.tsx                # Vite DOM entry point
    │   └── vite-env.d.ts           # Vite client environment typing
    │
    └── tests/                      # Frontend unit test suites
        ├── auth-validation.test.js # Authentication validation tests
        ├── file-management.test.js # File dashboard filtering and isolation tests
        ├── file-operations.test.js # File upload validation, storage path, sanitization, and workflow tests
        └── sharing-operations.test.js # Token cryptography, format validation, and share service tests
```

### 2.1 Supabase CLI Invocation
Backend assets are located in `backend/supabase/`. To execute Supabase CLI commands from the repository root, use the global `--workdir backend` flag:

```bash
# Start local Supabase development environment
supabase --workdir backend start

# Run database migrations locally
supabase --workdir backend db reset

# Deploy or inspect Edge Functions locally
supabase --workdir backend functions serve
```
*(Or navigate directly to the backend directory: `cd backend && supabase <command>`)*

---

## 3. Communication Architecture & Boundaries (Target Design)

### 3.1 Client-to-Supabase Communication
- **Protocol:** HTTPS REST (PostgREST API) and WebSockets (Supabase Realtime).
- **Client Configuration:** Only the **Supabase URL** (`VITE_SUPABASE_URL`) and the **Public Anon Key** (`VITE_SUPABASE_ANON_KEY`) will be bundled into client code.
- **Identity Context:** When a user logs in, GoTrue will issue a signed JWT containing their `sub` (User UUID). Every subsequent client request will include this JWT in the `Authorization: Bearer <JWT>` header. PostgreSQL will automatically extract `auth.uid()` from this token to evaluate Row Level Security (RLS) rules.

### 3.2 Service Role Protection Boundary
> [!CAUTION]
> **Zero Leakage Rule:** The Supabase `service_role` key bypasses all Row Level Security policies. **It must NEVER appear in client-side code, `.env`, or browser bundles.**
>
> If an operation requires elevated permissions (such as generating guest download tokens or validating password hashes for unauthorized users), that operation will be strictly isolated inside **Supabase Edge Functions** running on the Supabase infrastructure.

---

## 4. Subsystem Responsibilities (Target Design)

### 4.1 Authentication Responsibility (Planned: Phase 4)
- **Provider:** Supabase Auth (GoTrue).
- **Client Role:** Will manage login, registration, password recovery forms, and authentication state (`useAuth` hook). Will store session securely in browser local storage via the SDK.
- **Database Hook:** An automated PostgreSQL trigger (`on_auth_user_created`) will provision a matching record in the public `profiles` table whenever a new user registers in `auth.users`.

### 4.2 File Storage Responsibility (Implemented in Migration — Deployment Pending)
- **Storage Engine:** Supabase Storage (S3-compatible object storage).
- **Migration File:** `backend/supabase/migrations/20261114213000_create_storage_bucket.sql`.
- **Bucket Configuration:** Single private bucket named `user-files` with public access disabled (`public = false`) and maximum file size enforced at `52,428,800` bytes (50 MB).
- **Storage Path Convention:** Collision-resistant path pattern:
  `{user_id}/{file_id}/{sanitized_filename}`
  - `{user_id}`: Owner's UUID (verified via `auth.uid()`).
  - `{file_id}`: Client-generated UUIDv4 preventing collisions across identical file names.
  - `{sanitized_filename}`: Sanitized file name with path traversal patterns (`../`), null bytes, and illegal characters stripped.
- **Storage RLS Policies on `storage.objects`:**
  - **SELECT:** `(storage.foldername(name))[1] = (SELECT auth.uid()::text)`
  - **INSERT:** `(storage.foldername(name))[1] = (SELECT auth.uid()::text)`
  - **UPDATE:** `(storage.foldername(name))[1] = (SELECT auth.uid()::text)`
  - **DELETE:** `(storage.foldername(name))[1] = (SELECT auth.uid()::text)`
  Direct unauthenticated access to storage buckets is completely blocked.
- **File Lifecycle & Compensation Workflow:**
  1. **Pre-upload Validation:** Client validates file existence, non-zero size, 50 MB upper limit, and blocks dangerous executable extensions (`.exe`, `.bat`, `.cmd`, `.sh`, `.ps1`, `.vbs`, `.msi`, `.jar`, `.com`, `.scr`).
  2. **Session Verification:** Authenticated user identity is resolved at service boundary via `supabase.auth.getUser()`.
  3. **Storage Upload:** Uploaded to private bucket `user-files` at `{user_id}/{file_id}/{sanitized_filename}`.
  4. **Database Metadata Insertion:** File metadata recorded in `public.files` (governed by PostgreSQL RLS).
  5. **Atomic Compensation on Partial Failure:** If database insertion fails after storage upload succeeds, the client service automatically purges the orphaned blob from `user-files` via `supabase.storage.from('user-files').remove([storagePath])`.
  6. **Download Workflow:** Initiates authenticated download via `supabase.storage.from('user-files').download(storagePath)`, receives a `Blob`, creates a temporary browser object URL, and triggers an anchor download.
  7. **Delete Workflow:** Accessible confirmation dialog confirms intent, database record is deleted first from `public.files`, followed by storage object removal from `user-files`.
- **Deployment Status:** **Pending Deployment.** The migration has been authored and validated in the repository, but remote Supabase execution is deferred pending production deployment approval.

### 4.3 Secure Sharing Responsibility (Implemented in Code — Deployment Pending)
- **Challenge:** Enabling an unauthenticated or guest recipient to view or download a specific private file without granting them direct access to the owner's private storage bucket or compromising storage path privacy.
- **Architectural Solution — Edge Function & Cryptographic Mediation:**
  1. **High-Entropy Token Generation:**
     - Generates 32 cryptographically random bytes (256 bits of entropy) using Web Crypto API.
     - Encoded as an unpadded Base64URL string (RFC 4648 §5, exactly 43 characters).
     - Persists only the SHA-256 cryptographic hash (64 hex characters) in `public.share_links.token_hash`.
     - The raw token is NEVER persisted in the database and NEVER logged.
  2. **Link Creation (`create-share-link` Edge Function):**
     - Runs in Supabase Edge Runtime (Deno). Accepts strictly `POST` requests and handles `OPTIONS` CORS preflight.
     - Validates caller session JWT and confirms caller ownership of the target file in `public.files`.
     - Generates the high-entropy token, calculates expiration (1h to 720h), and inserts the row into `public.share_links` using the service-role client (as client INSERT is blocked by RLS).
     - Returns the raw token once in the creation response to the file owner.
  3. **Link Access & Mediation (`access-shared-file` Edge Function):**
     - Runs in Supabase Edge Runtime (Deno). Permitted for unauthenticated guests.
     - Enforces strict 43-character Base64URL token format validation.
     - Computes SHA-256 hash of the incoming token to query `public.share_links` joined with `public.files`.
     - Returns a uniform HTTP 404 response for non-existent, expired, or revoked links to prevent timing or enumeration oracles.
     - Conceals private storage paths, owner IDs, and bucket names from guest responses.
     - **Action `metadata`:** Returns safe public attributes (`fileName`, `fileSize`, `mimeType`, `expiresAt`).
     - **Action `download`:** Generates a short-lived (60-second) signed URL via Supabase Storage admin API for the private `user-files` bucket.
  4. **Frontend Integration:**
     - **Share Modal (`ShareModal.tsx`):** Provides expiration duration selection (1h, 24h, 7d), link generation, single-display copy-to-clipboard feedback, active link listing, and revocation controls.
     - **Guest Portal (`SharedFilePage.tsx`):** Renders public landing page for URLs formatted as `https://domain/?share=TOKEN`. Verifies metadata and enables 60-second direct download tunnel without requiring login.
     - **Router (`AppRouter`):** Detects `?share=TOKEN`, bypasses authentication redirects for guest route, and clears URL parameters upon navigation away.
  5. **Zero Fake Sharing Policy:** If Supabase credentials are unconfigured, sharing services return explicit configuration errors rather than fabricating fake share links.

### 4.4 Row Level Security (RLS) Boundary (Planned: Phase 2B)
Row Level Security will serve as the primary security wall. Every table in the `public` schema (`profiles`, `files`, `share_links`) will have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- `profiles`: Authenticated users can read public profile details, but will only be permitted to update their own profile (`auth.uid() = id`).
- `files`: Authenticated users will only be permitted to SELECT, INSERT, UPDATE, or DELETE files where `owner_id = auth.uid()`.
- `share_links`: File owners will be permitted to manage share links for files they own. Direct guest queries via PostgREST will be disallowed; all guest interactions will be mediated through Edge Functions.
