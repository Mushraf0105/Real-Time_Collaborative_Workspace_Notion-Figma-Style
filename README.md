# SyncSpace — Real-Time Collaborative Workspace Suite (Notion + Figma + Excel + PowerPoint)

[![Live Web App](https://img.shields.io/badge/Live%20App-Vercel%20Deployed-success.svg?logo=vercel)](https://real-time-collaborative-workspace-n-five.vercel.app/)
[![Live Backend](https://img.shields.io/badge/Live%20Backend-Render%20Web%20Service-blue.svg?logo=render)](https://syncspace-backend-v89m.onrender.com)
[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%2014%20%7C%20Yjs%20CRDT%20%7C%20WebSockets%20%7C%20PostgreSQL%20%7C%20Redis%20%7C%20Prisma-blue.svg)](#-required-tech-stack)
[![CRDT Engine](https://img.shields.io/badge/CRDT-Yjs%20%28Commutative%29-purple.svg)](https://github.com/yjs/yjs)
[![Suite](https://img.shields.io/badge/Suite-Notion%20%7C%20Figma%20%7C%20Excel%20%7C%20PowerPoint-blueviolet.svg)](#-four-collaborative-workplace-modalities)
[![RBAC](https://img.shields.io/badge/Security-Admin%20RBAC%20Enforced-red.svg)](#-strict-administrator-rbac--permissions)
[![Mobile Ready](https://img.shields.io/badge/Mobile-Responsive%20%26%20Touch%20Ready-success.svg)](#-mobile-responsiveness--touch-support)
[![Export Formats](https://img.shields.io/badge/Export-PDF%20%7C%20DOC%20%7C%20XML%20%7C%20HTML%20%7C%20MD%20%7C%20CSV%20%7C%20PPT-orange.svg)](#-multi-format-document-export)
[![Tests Passing](https://img.shields.io/badge/Tests-100%25%20Passing%20%289%2F9%29-brightgreen.svg)](#-concurrency--benchmark-results)

An enterprise-grade, distributed real-time collaborative workspace combining **Notion-style rich-text block editing**, **Figma-style infinite whiteboard diagramming**, **Excel-style collaborative spreadsheets**, and **PowerPoint-style presentation slides**. Multiple collaborators edit simultaneously across all four modalities, observe each other's live colored cursors and peer cell selections, drag sticky notes across devices, run spreadsheet formulas, present slide decks in fullscreen, export to 7 industry formats, and experience conflict-free synchronization powered by Yjs CRDTs.

---

### 🌐 Live Production Deployments

* **Frontend Web Application (Vercel):** [https://real-time-collaborative-workspace-n-five.vercel.app/](https://real-time-collaborative-workspace-n-five.vercel.app/)
* **Backend API & WebSocket Gateway (Render):** [https://syncspace-backend-v89m.onrender.com](https://syncspace-backend-v89m.onrender.com)
* **Default Deployed Workspace:** **Nexvia Technologies** (`ws_nexvia_tech`)

---

## 📋 Assessment Alignment & Requirements Met

| Requirement / Guideline | Implementation in SyncSpace | Verification Location |
|---|---|---|
| **1. CRDT Conflict Resolution** | Yjs sequence CRDT with doubly-linked items, state vector diffing (`y-protocols/sync`), and mathematical commutativity. | `backend/src/crdt/`, `backend/tests/convergence.test.js` |
| **2. Auth, Workspaces & Pages** | Prisma ORM with users, multi-workspace switcher, recursive parent-child document tree, blank workspace onboarding, and workspace deletion. | `backend/prisma/schema.prisma`, `backend/src/db/seed.js`, `frontend/src/components/Sidebar.jsx` |
| **3. Rich-Text Editor (TipTap/ProseMirror)** | TipTap WYSIWYG block editor with headings, tables, task lists, code blocks, quote blocks, and Yjs collaboration plugin. | `frontend/src/components/DocumentEditor.jsx` |
| **4. Spreadsheet Modality (Excel)** | Real-time CRDT cell editing (`yDoc.getMap('sheet_cells')`), formula engine (`=SUM`, `=AVG`, `=COUNT`, arithmetic), peer cell selection awareness, and CSV export. | `frontend/src/components/CollaborativeSpreadsheet.jsx` |
| **5. Slide Deck Modality (PowerPoint)** | Real-time synced presentation slides (`yDoc.getMap('slides_data')`), 5 themes, 5 slide layouts, speaker notes, fullscreen Presenter Mode (`F5`), and printable export. | `frontend/src/components/CollaborativeSlides.jsx` |
| **6. WebSocket Server (y-websocket)** | Standalone WebSocket server on port `1234` plus Express API on port `5001` with binary sync message handling. | `backend/src/server.js`, `backend/src/crdt/persistence.js` |
| **7. Presence: Colored Cursors & Avatars** | Real-time presence via `y-protocols/awareness`: colored carets, name tags, live selections, peer grid highlights, and canvas mouse/touch tracking. | `frontend/src/components/CollaborativeHeader.jsx`, `frontend/src/components/CollaborativeCanvas.jsx` |
| **8. Strict Administrator RBAC** | Only Administrators can assign `Edit`, `Comment`, or `View` permissions, invite new members, or remove members with safe document ownership reassignment. | `backend/src/server.js`, `frontend/src/components/PermissionsModal.jsx`, `frontend/src/components/Sidebar.jsx` |
| **9. Redis Multi-Instance Scaling** | Redis Pub/Sub cluster bus (`collab:doc:{id}`) with origin attribution for horizontal WebSocket scaling across instances. | `backend/src/redis/redisBus.js`, `backend/src/crdt/persistence.js` |
| **10. 4-Way Workplace Modalities** | Instant seamless toggle between Notion Document, Figma Canvas, Excel Spreadsheet, and PowerPoint Slides. | `frontend/src/app/page.jsx`, `frontend/src/components/CollaborativeHeader.jsx` |
| **11. Multi-Format Document Export** | 1-Click client-side export to **PDF**, Word (**DOC**), **XML**, **HTML**, Markdown (**MD**), Excel Spreadsheet (**CSV**), and PowerPoint (**PPT/PDF**). | `frontend/src/utils/exportDocument.js`, `frontend/src/components/CollaborativeHeader.jsx` |
| **12. Bidirectional Credentials Sync** | Automatic two-way synchronization between disk (`credentials/*.json`) and the database (`prisma.user`) on startup and request. | `backend/src/utils/credentialsSync.js`, `credentials/`, `CREDENTIALS.md` |
| **13. Page & Modality State Retention** | Seamless rehydration of active workspace, active document, active modality, and user persona across page refreshes (`F5`). | `frontend/src/app/page.jsx` |
| **14. Mobile Responsiveness & Touch** | Slide-out navigation drawer, backdrop dismiss, adaptive compact header, single-row ribbon toolbar, and touch drag gestures for canvas notes. | `frontend/src/components/Sidebar.jsx`, `frontend/src/components/CollaborativeHeader.jsx`, `frontend/src/components/CollaborativeCanvas.jsx` |
| **15. Gutenberg & Wikipedia Stress Testing** | 50 concurrent virtual peers benchmarked under heavy typing load with Project Gutenberg & Wikipedia corpora (1,700+ ops/sec). | `backend/tests/stress.test.js`, `TEST_REPORT.md` |

---

## 🎨 Four Collaborative Workplace Modalities

Users can switch between four distinct real-time productivity modalities in any document via the header mode switcher:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [📝 Document (Notion)]  [🎨 Canvas (Figma)]  [📊 Spreadsheet (Excel)]  [📽️ Slides (PowerPoint)] │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. 📝 Document Editor (Notion-Style)
- **Engine:** TipTap & ProseMirror backed by `y-prosemirror`.
- **Features:** Headings (H1–H3), interactive tables, task checklists, block quotes, formatted code blocks.
- **Collaboration:** Real-time character-by-character synchronization, remote collaborator carets with names and colors, and threaded text-anchor comments.

### 2. 🎨 Infinite Whiteboard Canvas (Figma-Style)
- **Engine:** Scalable 2D coordinate system synced via `yDoc.getMap('canvas_notes')`.
- **Features:** Multi-color sticky notes (Yellow, Blue, Green, Pink, Purple), spatial dragging, and note deletion.
- **Collaboration:** Live remote cursor tracking with collaborator names and colored pointers; full touch drag support on mobile devices.

### 3. 📊 Collaborative Spreadsheet (Excel-Style)
- **Engine:** CRDT cell matrix synced via `yDoc.getMap('sheet_cells')`.
- **Features:** 
  - Dynamic rows and columns (A–Z) with cell formatting (Bold, Italic, Left/Center/Right alignment).
  - Number formats: Currency (`$`) and Percentage (`%`).
  - **Live Formula Engine:** Evaluates `=SUM(A1:B5)`, `=AVG(...)`, `=COUNT(...)`, and arithmetic expressions in real time.
  - Optional pre-seeded Financial Model template button.
- **Collaboration:** Live peer cell selection awareness (see which cell teammates are editing in real time).
- **Export:** 1-Click export to standard CSV.

### 4. 📽️ Presentation Slides (PowerPoint-Style)
- **Engine:** Slide deck data model synced via `yDoc.getMap('slides_data')`.
- **Features:**
  - 5 Themes: **Modern Dark**, **Minimal Light**, **Ocean Blue**, **Sunset Rose**, and **Forest Emerald**.
  - 5 Slide Layouts: **Title Slide**, **Bullet Points**, **Key Metric & KPI**, **Comparison Split**, and **Quote & Callout**.
  - Integrated Speaker Notes panel for meeting prep.
  - **Fullscreen Presenter Mode (`F5`)**: Distraction-free presentation view with keyboard navigation (Arrow keys, Spacebar, Escape).
- **Export:** 1-Click 16:9 printable presentation export.

---

## 🛡️ Strict Administrator RBAC & Permissions

SyncSpace enforces rigorous Role-Based Access Control (RBAC) at both the frontend interface and backend API levels:

1. **Permission Assignment (`Can Edit`, `Can Comment`, `Can View`):**
   - **Administrators Only:** Only users with `role: 'ADMIN'` can assign or change document permissions.
   - Non-admins see read-only locked status badges (`🔒 Can Edit`, etc.) with informative tooltips.
   - Backend endpoint `POST /api/documents/:id/permissions` strictly verifies `requesterId` has `ADMIN` role.
2. **Member Invitation:**
   - The `+ Add New Member` modal button and registration form are restricted to Administrators.
   - Sidebar displays *View Workspace Members* in read-only mode for non-admin users.
3. **Member Removal with Safety Guarantees:**
   - Admins can remove members directly from the Permissions Modal.
   - **Data Integrity & Foreign-Key Safety:** When a member is removed, all documents, sticky notes, and snapshots they created are automatically reassigned to the active Administrator so no workspace data is orphaned.
   - Safeguard protects against removing the last administrator or self-removal.
   - Removed members are instantly purged from the SQLite database and disk credentials (`users.json`, `Member.json`, `Viewer.json`).

---

## 🔄 Bidirectional Credentials Synchronization

SyncSpace provides automatic two-way synchronization between disk credential files and the runtime database:

- **Disk-to-Database Sync:** When any file in [`credentials/`](credentials/) ([`Admin.json`](credentials/Admin.json), [`Member.json`](credentials/Member.json), [`Viewer.json`](credentials/Viewer.json), [`users.json`](credentials/users.json)) is manually edited on disk, the backend automatically detects changes on server boot and on every `/api/auth/users` request, updating `prisma.user` in real time.
- **Database-to-Disk Sync:** Creating or deleting members through the web application immediately writes down to disk files.
- **Reconciled Master Index:** `credentials/users.json` stays continuously consolidated with role-specific JSON files.

---

## ⚡ Page State & Modality Retention on Refresh

When pressing Refresh (`F5`) or reopening the workspace:
- **Active Workspace Retained:** The app remains in your currently active workspace instead of jumping to the first workspace.
- **Active Document Retained:** Keeps you on the exact document, spreadsheet, presentation, or whiteboard you were editing.
- **Active Modality Retained:** Preserves your view mode (**Spreadsheet**, **Presentation Slides**, **Document Editor**, or **Whiteboard Canvas**).
- **Active User Persona Retained:** Remembers your chosen collaborator persona across reloads.
- **Dual-Layer Persistence:** Driven by browser `localStorage` and URL parameters (`?ws=...&doc=...&mode=...`) allowing seamless bookmarking and sharing.

---

## 🛠️ Required Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS, Lucide React, TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-cursor`, `@tiptap/extension-table`, `@tiptap/extension-task-list`)
- **Real-Time Collaboration Engine:** Yjs (v13), `y-websocket` (v2), `y-protocols` (sync & awareness), `lib0`
- **Backend API & WebSockets:** Node.js (v22+), Express.js (ES Modules), `ws` WebSocket Server
- **Database & ORM:** PostgreSQL 16 (production) with automatic zero-config portable SQLite fallback via **Prisma ORM** (v5.22)
- **Distributed Cache & Cluster Bus:** Redis 7 (`ioredis`) with automatic in-memory EventEmitter fallback for local dev
- **Orchestration:** Docker & Docker Compose (`docker-compose.yml`)

---

## 🚀 Quick Start Guide

### Option A: Zero-Config Local Development (Recommended)

SyncSpace includes automated database generation, auto-seeding, and in-memory Redis fallbacks so you can test all real-time features out-of-the-box without manual database or daemon configuration.

```bash
# 1. Install dependencies for backend and frontend
npm run install:all

# 2. Seed the database with demo users, workspaces, and collaborative documents
npm run seed

# 3. Start the Backend API & WebSocket Collaboration Server (Ports 5001 & 1234)
npm run dev:backend
```

In a second terminal window, start the Next.js frontend:

```bash
# 4. Start Next.js Frontend (Port 3000)
npm run dev:frontend
```

Visit **`http://localhost:3000`** in your browser. Open multiple browser tabs (or incognito windows) to test live typing, colored cursor presence, spreadsheet calculations, slide decks, canvas dragging, and comments in real time!

---

### Option B: Docker Multi-Container Stack (PostgreSQL 16 + Redis 7)

To run the full production containerized stack:

```bash
docker-compose up --build
```

This starts:
- `syncspace-postgres`: PostgreSQL 16 database container on port `5432`
- `syncspace-redis`: Redis 7 alpine cluster on port `6379`
- `syncspace-backend`: WebSocket & CRDT API on ports `5001` & `1234`
- `syncspace-frontend`: Next.js Web App on port `3000`

---

## 🏢 Workspace Lifecycle & Admin Governance

SyncSpace provides enterprise workspace organization:
- **Admin-Only Workspace Creation & Deletion:** Strict Role-Based Access Control ensures that only users with the `ADMIN` role can create new workspaces (`+ Create New Workspace`) or delete workspaces. Non-admin members see disabled indicators with clear tooltips.
- **Quick Delete Workspace Controls:** Administrators can delete the active workspace via the quick-action trash icon (**🗑️**) in the sidebar header or directly beside each workspace in the switcher dropdown.
- **Default Deployed Workspace ("Nexvia Technologies"):** Comes pre-seeded with 4 matching collaborative modalities:
  1. 📝 *Nexvia Technologies Product & Engineering Handbook* (Notion-style Document)
  2. 🎨 *Nexvia Technologies System Architecture & Whiteboard* (Figma-style Canvas with sticky notes)
  3. 📊 *Nexvia Technologies Financial Model & Budget* (Excel-style Spreadsheet with reactive formulas)
  4. 📽️ *Nexvia Technologies Company Pitch Deck* (PowerPoint-style Presentation Slides with Presenter Mode)
- **Automatic Two-Way File Sync:** Workspace metadata (name, description, admin name, icon) is automatically persisted in [`credentials/Workspace.json`](credentials/Workspace.json).
- **Zero Demo Data in New Workspaces:** Creating a new workspace initializes a clean canvas without dummy records, presenting quick-start templates (Blank Document, Blank Spreadsheet, Blank Presentation, Blank Whiteboard).
- **Hierarchical Document Tree:** Create nested sub-documents under any parent page with expandable tree views.

---

## 📱 Mobile Responsiveness & Touch Support

SyncSpace is engineered to deliver a native app experience on mobile smartphones, tablets, and desktop monitors:

- **Mobile Navigation Drawer**: On screens `< 768px`, the sidebar smoothly slides out as an overlay drawer with a backdrop. Tapping any document or outside the drawer auto-dismisses it.
- **Adaptive Header Controls**: The top navigation bar dynamically adjusts for compact screens, with a mobile hamburger menu button, abbreviated mode switches (**Doc**, **Canvas**, **Excel**, **Slides**), and icon-only action pills.
- **Single-Row Formatting Toolbar**: Formatting controls scroll smoothly on a horizontal ribbon with invisible scrollbars (`.no-scrollbar`), preventing multi-row height jumps.
- **Word-Wrap Safeguards**: ProseMirror styling uses `break-words` and `min-w-0` to eliminate single-character column collapses on narrow viewports.
- **Touch Drag for Figma Canvas**: Sticky notes on the 2D whiteboard canvas listen to `onTouchStart`, `onTouchMove`, `onTouchEnd`, and `onTouchCancel` events for fluid dragging on iPhones, Android phones, and iPads.
- **Stacking Context Isolation**: Header dropdown menus use isolated z-index stacking (`isolate`, `relative z-30`) so sticky spreadsheet headers never bleed through navigation menus.
- **Mobile Comments Overlay**: The comments side-panel functions as a full slide-over drawer with backdrop dismiss on mobile viewports.

---

## 📤 Multi-Format Document Export

Collaborators can export their live documents at any time from the **Export** menu in the top header:

1. **PDF Document (`.pdf`)**: Formatted with print media queries (`@media print`), clean margins, and professional typography.
2. **Microsoft Word (`.doc`)**: Structured Office XML/HTML format with proper namespace declarations for native opening in MS Word and Google Docs.
3. **XML Document (`.xml`)**: Comprehensive data interchange schema containing document ID, metadata timestamps, author attribution, TipTap JSON tree, and raw text.
4. **HTML Webpage (`.html`)**: Self-contained semantic HTML5 document with embedded styling.
5. **Markdown (`.md`)**: Clean plain-text formatting ideal for developer documentation and notes.
6. **Excel Spreadsheet (`.csv`)**: Clean CSV export of active spreadsheet grid values.
7. **PowerPoint Deck (`.pdf`)**: Formatted 16:9 presentation print export for slides.

---

## 👥 Demo Personas & Credentials System

The system provides active collaborative personas. Use the **Active Collaborator Switcher** at the bottom-left of the sidebar to instantly switch personas:

| Persona | Name & Role | Email / Password | Color Badge | Default Permissions | Key Capabilities |
|---|---|---|---|---|---|
| 🔵 **Md Mushraf Ali** | Lead Architect (`ADMIN`) | `mushraf@gmail.com` / `mushraf8520` | `#3b82f6` (Sapphire) | `OWNER` / `EDIT` | Full document editing, spreadsheet formulas, slide decks, canvas notes, snapshot rollback, create/delete workspaces, member add/remove |
| 🟢 **Shahid / Bob Smith** | Full-Stack Engineer (`MEMBER`) | `bob@syncspace.io` / `Password@123` | `#10b981` (Emerald) | `EDIT` | Real-time block editing, spreadsheet calculation, slide design, threaded comments |
| 🟣 **Md Ali** | Quality Engineer (`MEMBER`) | `ali@gmail.com` / `Password@123` | `#10b981` (Emerald) | `EDIT` | Collaborative document editing, spreadsheet calculations, presentation design |
| 🔵 **Saif Khan** | Collaborative Member (`MEMBER`) | `saif@gmail.com` / `Password@123` | `#3b82f6` (Sapphire) | `EDIT` | Multi-user concurrency testing, canvas sticky notes, presentation design |

### Live User Creation & Credentials Persistence

When a new member is added via the **Permissions Modal** or the persona dropdown:
- The user is saved to the SQLite/PostgreSQL database.
- The credentials and profile are automatically synchronized to disk in the [`credentials/`](credentials/) directory:
  - [`credentials/Workspace.json`](credentials/Workspace.json) — Master index of workspaces, descriptions, and admin owners.
  - [`credentials/users.json`](credentials/users.json) — Master index of all registered workspace users.
  - [`credentials/Admin.json`](credentials/Admin.json) — Platform Admin credentials.
  - [`credentials/Member.json`](credentials/Member.json) — Standard collaborative members.
  - [`credentials/Viewer.json`](credentials/Viewer.json) — Read-only reviewer accounts.
- See [`CREDENTIALS.md`](CREDENTIALS.md) for full login information.

---

## ⚡ Concurrency & Benchmark Results

We benchmarked SyncSpace using a dedicated concurrency suite (`backend/tests/stress.test.js`) simulating **50 simultaneous collaborators** actively typing literature extracts from **Project Gutenberg** (*Alice in Wonderland*) and **Wikipedia**:

```
⚡ ================================================================
⚡ SyncSpace Concurrency & Stress Benchmark (50 Virtual Peers)
⚡ Benchmark Data: Project Gutenberg & Wikipedia Article Extracts
⚡ ================================================================

👥 Concurrent Virtual Peers:      50
📝 Total Operations Executed:     1,000 edits
⏱️ Total Execution Time:          580 ms
⚡ Throughput:                    1,724.1 ops/sec
⚡ Latency p50 (Median):          0.09 ms
⚡ Latency p95:                   0.28 ms
⚡ Latency p99:                   0.65 ms (Sub-millisecond!)
📄 Converged Document Size:       37,800 characters
🔐 Cryptographic Hash:            9f52999f898e64ba4945caef...
🎯 State Vector Convergence:      100.0% SUCCESSFUL
==============================================================
```

Run the tests yourself at any time:
```bash
# Run CRDT Unit & Convergence Tests (9/9 passing)
npm run test

# Run 50-Peer High-Concurrency Stress Benchmark
npm run test:stress
```

---

## 📂 Repository File Structure

```
FS-02/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma ORM schema (Users, Workspaces, Docs, Comments, Snapshots)
│   │   └── dev.db              # Portable persistent SQLite database
│   ├── src/
│   │   ├── crdt/
│   │   │   └── persistence.js  # Binary Yjs state snapshot & debounced DB persistence
│   │   ├── db/
│   │   │   ├── prisma.js       # Prisma client singleton
│   │   │   └── seed.js         # Pre-seeded workspaces, docs, comments, snapshots
│   │   ├── redis/
│   │   │   └── redisBus.js     # Redis Pub/Sub multi-instance scaling with memory fallback
│   │   ├── utils/
│   │   │   └── credentialsSync.js # Two-way disk-to-database credentials synchronization
│   │   └── server.js           # Express API + y-websocket real-time CRDT server
│   ├── tests/
│   │   ├── convergence.test.js # CRDT commutativity & state vector diff tests
│   │   └── stress.test.js      # 50-peer Gutenberg/Wikipedia concurrency benchmark
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css     # Tailwind styling + TipTap & collaborative cursor styles
│   │   │   ├── layout.jsx      # Root HTML layout, viewport settings & fonts
│   │   │   └── page.jsx        # Main collaborative workspace container & state retention
│   │   ├── components/
│   │   │   ├── CollaborativeCanvas.jsx      # Figma-style 2D sticky canvas with touch support
│   │   │   ├── CollaborativeHeader.jsx      # 4-Way mode switcher, presence avatars, export
│   │   │   ├── CollaborativeSlides.jsx      # PowerPoint-style presentations with Presenter Mode
│   │   │   ├── CollaborativeSpreadsheet.jsx # Excel-style spreadsheet with live formula engine
│   │   │   ├── CommentsDrawer.jsx           # Threaded comments drawer with text anchor & mobile overlay
│   │   │   ├── DocumentEditor.jsx           # TipTap block editor with horizontal scroll ribbon
│   │   │   ├── PermissionsModal.jsx         # Granular access control & new member creation
│   │   │   ├── Sidebar.jsx                  # Responsive drawer, workspace switcher & doc hierarchy
│   │   │   └── VersionHistoryModal.jsx      # Revision snapshots & 1-click restore
│   │   └── utils/
│   │       └── exportDocument.js            # Multi-format exporter (PDF, DOC, XML, HTML, MD, CSV, PPT)
│   ├── Dockerfile
│   ├── next.config.mjs
│   ├── tailwind.config.cjs
│   └── package.json
├── credentials/
│   ├── Admin.json              # Auto-synced Admin accounts
│   ├── Member.json             # Auto-synced Member accounts
│   ├── Viewer.json             # Auto-synced Viewer accounts
│   └── users.json              # Master credentials database
├── API_DOCUMENTATION.md        # Complete REST API & WebSocket wire protocol specs
├── ARCHITECTURE.md             # In-depth distributed architecture & CRDT mathematical model
├── CREDENTIALS.md              # Demo user accounts & credentials guide
├── DEPLOYMENT.md               # Production deployment guide (Docker, AWS, Railway, Vercel)
├── docker-compose.yml          # Postgres + Redis + Web + Backend orchestrator
├── PRESENTATION.md             # 10-Minute Slide Deck & Speaker Script
├── README.md                   # Project overview, requirements alignment & quickstart
├── REFLECTIONS.md              # Engineering reflections from each domain owner
└── TEST_REPORT.md              # Comprehensive test suites and benchmark charts
```

---

## 📄 Deliverables Verification Checklist

- [x] **Working demo:** 4-Way Modalities: Notion block editor, Figma whiteboard canvas, Excel spreadsheet, PowerPoint slides.
- [x] **Strict Administrator RBAC:** Admin-only permission assignment, member invitation, and member deletion with document reassignment.
- [x] **Bidirectional Credentials Sync:** Automatic two-way synchronization between `credentials/*.json` on disk and the database.
- [x] **Page & Modality Retention:** Full state restoration on browser refresh (`F5`) via `URLSearchParams` and `localStorage`.
- [x] **Mobile & Touch Support:** Responsive drawer navigation, adaptive compact header, touch-enabled canvas notes.
- [x] **Spreadsheet Formula Engine:** Real-time `=SUM`, `=AVG`, `=COUNT`, arithmetic, and peer cell selection awareness.
- [x] **PowerPoint Presentation Mode:** 5 themes, 5 slide layouts, speaker notes, fullscreen Presenter Mode (`F5`).
- [x] **Workspace Lifecycle:** Multi-workspace switcher, clean zero-demo-data creation, safe cascade deletion.
- [x] **Multi-Format Document Exporter:** 1-Click export to PDF, Word DOC, XML, HTML, Markdown, CSV, and Presentation.
- [x] **GitHub repository ready:** Clean commits, `.gitignore`, modular architecture, and full setup instructions.
- [x] **Architecture diagram & API docs:** [ARCHITECTURE.md](ARCHITECTURE.md) and [API_DOCUMENTATION.md](API_DOCUMENTATION.md).
- [x] **Credentials & User Guide:** [CREDENTIALS.md](CREDENTIALS.md).
- [x] **Test results & performance numbers:** [TEST_REPORT.md](TEST_REPORT.md) (1,724 ops/sec, p50=0.09ms, 100% convergence).
- [x] **10-minute final presentation:** [PRESENTATION.md](PRESENTATION.md) with slide deck layout and verbatim speaker script.
- [x] **Individual reflection:** [REFLECTIONS.md](REFLECTIONS.md) covering CRDT math, real-time infrastructure, and collaborative UX.
