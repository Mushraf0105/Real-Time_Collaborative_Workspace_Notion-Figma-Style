# SyncSpace — Real-Time Collaborative Workspace (Notion/Figma Style)

[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%2014%20%7C%20Yjs%20CRDT%20%7C%20WebSockets%20%7C%20PostgreSQL%20%7C%20Redis%20%7C%20Prisma-blue.svg)](#required-tech-stack)
[![CRDT Engine](https://img.shields.io/badge/CRDT-Yjs%20%28Commutative%29-purple.svg)](https://github.com/yjs/yjs)
[![Tailwind CSS](https://img.shields.io/badge/UI-Tailwind%20CSS-38bdf8.svg)](https://tailwindcss.com)
[![Tests Passing](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg)](#-test-results--benchmarks)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](LICENSE)

An enterprise-grade, distributed real-time collaborative workspace combining **Notion-style rich-text block editing** and **Figma-style infinite whiteboard canvas diagramming**. Multiple people edit the same document or canvas simultaneously, observe each other's live colored cursors, and never lose changes.

---

## 📋 Assessment Alignment & Requirements Met

| Requirement / Guideline | Implementation in SyncSpace | Verification Location |
|---|---|---|
| **1. CRDT Conflict Resolution** | Yjs sequence CRDT with doubly-linked items, state vector diffing (`y-protocols/sync`), and mathematical commutativity. | `backend/src/crdt/`, `backend/tests/convergence.test.js` |
| **2. Auth, Workspaces & Pages** | Prisma ORM with users, multi-workspace switcher, and recursive parent-child document tree. | `backend/prisma/schema.prisma`, `backend/src/db/seed.js`, `frontend/src/components/Sidebar.jsx` |
| **3. Rich-Text Editor (TipTap/ProseMirror)** | TipTap WYSIWYG block editor with headings, tables, task lists, code blocks, slash commands, and Yjs collaboration plugin. | `frontend/src/components/DocumentEditor.jsx` |
| **4. WebSocket Server (y-websocket)** | Standalone WebSocket server on port `1234` plus HTTP server on port `5001` with binary sync message handling. | `backend/src/server.js`, `backend/src/crdt/persistence.js` |
| **5. Presence: Colored Cursors & Avatars** | Real-time presence via `y-protocols/awareness`: colored carets, name tags, live selections, and canvas mouse pointer tracking. | `frontend/src/components/CollaborativeHeader.jsx`, `frontend/src/components/CollaborativeCanvas.jsx` |
| **6. Comments, Snapshots & Permissions** | Threaded comments on text selections, immutable version history snapshots with 1-click restore, and granular RBAC (`EDIT`, `COMMENT`, `VIEW`). | `backend/src/server.js`, `frontend/src/components/CommentsDrawer.jsx`, `frontend/src/components/VersionHistoryModal.jsx`, `frontend/src/components/PermissionsModal.jsx` |
| **7. Redis Multi-Instance Scaling** | Redis Pub/Sub cluster bus (`collab:doc:{id}`) with origin attribution for horizontal WebSocket scaling across servers. | `backend/src/redis/redisBus.js`, `backend/src/crdt/persistence.js` |
| **Dual Modality (Notion + Figma)** | Seamless toggle between structured document block editing and an infinite 2D sticky notes whiteboard canvas. | `frontend/src/app/page.jsx`, `frontend/src/components/CollaborativeCanvas.jsx` |
| **Gutenberg & Wikipedia Stress Testing** | 50 concurrent virtual peers benchmarked under heavy typing load with Project Gutenberg & Wikipedia corpora. | `backend/tests/stress.test.js`, `TEST_REPORT.md` |

---

## 🛠️ Required Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS, Lucide React, TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-cursor`)
- **Real-Time Collaboration Engine:** Yjs (v13), `y-websocket` (v2), `y-protocols` (sync & awareness), `lib0`
- **Backend API & WebSockets:** Node.js (v22+), Express.js (ES Modules), `ws` WebSocket Server
- **Database & ORM:** PostgreSQL 16 (production) with automatic zero-config portable SQLite fallback via **Prisma ORM** (v5.22)
- **Distributed Cache & Cluster Bus:** Redis 7 (`ioredis`) with automatic in-memory EventEmitter fallback for local dev
- **Orchestration:** Docker & Docker Compose (`docker-compose.yml`)

---

## 🚀 Quick Start Guide

### Option A: Zero-Config Local Development (Recommended)

SyncSpace includes automated database generation and in-memory Redis fallbacks so you can test all real-time features out-of-the-box without manual database or daemon configuration.

```bash
# 1. Install dependencies for backend and frontend
npm run install:all

# 2. Seed the database with demo users, workspaces, and collaborative documents
npm run seed

# 3. Start the Backend API & WebSocket Collaboration Server (Port 5001 & 1234)
npm run dev:backend
```

In a second terminal window, start the Next.js frontend:

```bash
npm run dev:frontend
```

Visit **`http://localhost:3000`** in your browser. Open multiple browser tabs (or incognito windows) to test live typing, colored cursor presence, canvas dragging, and comments in real time!

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

## 👥 Demo Personas & Credentials

The system comes pre-seeded with rich collaborative personas. Use the **Active Collaborator Switcher** at the bottom-left of the sidebar to instantly switch personas:

| Persona | Name & Role | Color Badge | Default Permissions | Key Capabilities |
|---|---|---|---|---|
| 🔵 **Alice Cooper** | Lead Architect (`ADMIN`) | `#3b82f6` (Sapphire) | `OWNER` / `EDIT` | Full document editing, snapshot rollback, canvas note creation |
| 🟢 **Bob Smith** | Frontend Engineer (`MEMBER`) | `#10b981` (Emerald) | `EDIT` | Collaborative typing, table edits, threaded comment creation |
| 🟡 **Charlie Lee** | Product Designer (`MEMBER`) | `#f59e0b` (Amber) | `EDIT` / `COMMENT` | Figma canvas design, sticky note organization, review notes |
| 🌸 **Diana Prince** | Executive Reviewer (`VIEWER`) | `#ec4899` (Rose) | `VIEW` (Read-Only) | Observes real-time changes with editor disabled |

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
⏱️ Total Execution Time:          1,257 ms
⚡ Throughput:                    795.5 ops/sec
⚡ Latency p50 (Median):          0.19 ms
⚡ Latency p95:                   0.39 ms
⚡ Latency p99:                   0.91 ms (Sub-millisecond!)
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
│   │   └── schema.prisma       # Prisma ORM schema (Users, Workspaces, Docs, Comments, Snapshots)
│   ├── src/
│   │   ├── crdt/
│   │   │   └── persistence.js  # Binary Yjs state snapshot & debounced DB persistence
│   │   ├── db/
│   │   │   ├── prisma.js       # Prisma client singleton
│   │   │   └── seed.js         # Pre-seeded workspaces, docs, comments, snapshots
│   │   ├── redis/
│   │   │   └── redisBus.js     # Redis Pub/Sub multi-instance scaling with memory fallback
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
│   │   │   ├── layout.jsx      # Root HTML layout & fonts
│   │   │   └── page.jsx        # Main collaborative workspace container
│   │   └── components/
│   │       ├── CollaborativeCanvas.jsx  # Figma-style 2D sticky canvas via Y.Map
│   │       ├── CollaborativeHeader.jsx  # Presence avatars, title, mode toggle
│   │       ├── CommentsDrawer.jsx       # Threaded comments drawer with text anchor
│   │       ├── DocumentEditor.jsx       # TipTap block editor with Yjs collaboration
│   │       ├── PermissionsModal.jsx     # Granular access control (Edit, Comment, View)
│   │       ├── Sidebar.jsx              # Workspace switcher & nested doc hierarchy
│   │       └── VersionHistoryModal.jsx  # Revision snapshots & 1-click restore
│   ├── Dockerfile
│   ├── next.config.mjs
│   ├── tailwind.config.cjs
│   └── package.json
├── API_DOCUMENTATION.md        # Complete REST API & WebSocket wire protocol specs
├── ARCHITECTURE.md             # In-depth distributed architecture & CRDT mathematical model
├── DEPLOYMENT.md               # Production deployment guide (Docker, AWS, Railway, Vercel)
├── docker-compose.yml          # Postgres + Redis + Web + Backend orchestrator
├── PRESENTATION.md             # 10-Minute Slide Deck & Speaker Script
├── README.md                   # Project overview, requirements alignment & quickstart
├── REFLECTIONS.md              # Engineering reflections from each domain owner
└── TEST_REPORT.md              # Comprehensive test suites and benchmark charts
```

---

## 📄 Deliverables Verification Checklist

- [x] **Working demo:** Dual-modality Notion block editor & Figma whiteboard canvas with live colored cursors.
- [x] **GitHub repository ready:** Clean commits, `.gitignore`, modular architecture, and full setup instructions.
- [x] **Architecture diagram & API docs:** [ARCHITECTURE.md](ARCHITECTURE.md) and [API_DOCUMENTATION.md](API_DOCUMENTATION.md).
- [x] **Test results & performance numbers:** [TEST_REPORT.md](TEST_REPORT.md) (795.5 ops/sec, p50=0.19ms, 100% convergence).
- [x] **10-minute final presentation:** [PRESENTATION.md](PRESENTATION.md) with slide deck layout and verbatim speaker script.
- [x] **Individual reflection:** [REFLECTIONS.md](REFLECTIONS.md) covering CRDT math, real-time infrastructure, and collaborative UX.

