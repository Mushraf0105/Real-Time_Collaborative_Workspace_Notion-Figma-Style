# SyncSpace API & WebSocket Protocol Documentation

This document provides complete reference specifications for SyncSpace REST endpoints and the real-time WebSocket CRDT wire protocol.

---

## 📡 Base URLs & Endpoints

| Service | Protocol | Base URL | Purpose |
|---|---|---|---|
| **REST API Server** | HTTP / JSON | `http://localhost:5001/api` | Auth, Workspaces, Documents, Comments, Snapshots |
| **Real-Time CRDT Gateway** | WebSocket / Binary | `ws://localhost:1234` | Yjs document replication, awareness presence |
| **Next.js Web Client** | HTTP / HTML | `http://localhost:3000` | Full-stack interactive collaboration frontend |

---

## 1. REST API Reference

### 1.1 Health & Diagnostics
#### `GET /api/health`
Returns system operational telemetry, active in-memory document count, and Redis connection state.

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "timestamp": "2026-11-08T05:00:00.000Z",
  "uptime": 1420.5,
  "activeCRDTDocuments": 3,
  "redisClustering": "connected"
}
```

---

### 1.2 Authentication & Personas
#### `GET /api/auth/users`
Lists the pre-seeded evaluation personas for quick 1-click persona switching.

**Response `200 OK`:**
```json
[
  {
    "id": "usr_alice_01",
    "name": "Alice Cooper",
    "email": "alice@syncspace.io",
    "color": "#3b82f6",
    "role": "ADMIN"
  },
  {
    "id": "usr_bob_02",
    "name": "Bob Smith",
    "email": "bob@syncspace.io",
    "color": "#10b981",
    "role": "MEMBER"
  }
]
```

#### `POST /api/auth/login`
Authenticates a user and issues an authorization token.

**Request Body:**
```json
{
  "email": "alice@syncspace.io",
  "password": "Password@123"
}
```

**Response `200 OK`:**
```json
{
  "user": {
    "id": "usr_alice_01",
    "name": "Alice Cooper",
    "email": "alice@syncspace.io",
    "color": "#3b82f6",
    "role": "ADMIN"
  },
  "token": "demo-token-usr_alice_01"
}
```

---

### 1.3 Workspaces
#### `GET /api/workspaces`
Lists workspaces accessible to the authenticated user.

#### `POST /api/workspaces`
Creates a new workspace.

**Request Body:**
```json
{
  "name": "AI Systems Lab",
  "icon": "🤖",
  "description": "Collaborative research and engineering.",
  "ownerId": "usr_alice_01"
}
```

---

### 1.4 Documents & Nested Hierarchy
#### `GET /api/workspaces/:workspaceId/documents`
Retrieves all documents within a workspace, including parent/child relationships for recursive tree rendering.

**Response `200 OK`:**
```json
[
  {
    "id": "doc_welcome_01",
    "workspaceId": "ws_acme_lab",
    "parentId": null,
    "title": "Welcome to SyncSpace",
    "icon": "🚀",
    "createdAt": "2026-10-30T10:00:00.000Z"
  },
  {
    "id": "doc_rfc_crdt_02",
    "workspaceId": "ws_acme_lab",
    "parentId": "doc_welcome_01",
    "title": "RFC-104: CRDT Synchronization",
    "icon": "📜",
    "createdAt": "2026-10-31T14:30:00.000Z"
  }
]
```

#### `POST /api/documents`
Creates a new document or subpage.

**Request Body:**
```json
{
  "workspaceId": "ws_acme_lab",
  "parentId": "doc_welcome_01",
  "title": "Sprint 4 Roadmap",
  "icon": "🎯",
  "createdBy": "usr_alice_01"
}
```

#### `GET /api/documents/:id`
Retrieves full metadata, content cache, and canvas data for a document.

#### `PUT /api/documents/:id`
Updates document title, icon, or content.

#### `DELETE /api/documents/:id`
Soft-archives a document (`isArchived = true`).

---

### 1.5 Comments & Discussion Threads
#### `GET /api/documents/:id/comments`
Retrieves threaded discussion comments on a document.

**Response `200 OK`:**
```json
[
  {
    "id": "comm_01",
    "documentId": "doc_welcome_01",
    "content": "The TipTap integration with y-websocket feels super smooth!",
    "selectedText": "sub-5ms synchronized typing",
    "isResolved": false,
    "createdAt": "2026-11-01T12:00:00.000Z",
    "author": {
      "name": "Bob Smith",
      "color": "#10b981"
    }
  }
]
```

#### `POST /api/documents/:id/comments`
Adds a new comment.

**Request Body:**
```json
{
  "userId": "usr_bob_02",
  "content": "Please review this paragraph.",
  "selectedText": "Conflict-Free Replicated Data Types",
  "position": { "from": 120, "to": 155 }
}
```

#### `PATCH /api/comments/:commentId/resolve`
Toggles resolved/open status of a comment thread.

---

### 1.6 Version Snapshots & Rollback
#### `GET /api/documents/:id/snapshots`
Lists historical version snapshots in reverse chronological order.

#### `POST /api/documents/:id/snapshots`
Creates an immutable snapshot revision of the active document state.

**Request Body:**
```json
{
  "title": "v1.2 Post Design Review",
  "description": "Integrated sticky note diagram and adjusted headings",
  "createdBy": "usr_alice_01"
}
```

#### `POST /api/documents/:id/snapshots/:snapshotId/rollback`
Restores the document to the specified historical snapshot and broadcasts the rewound CRDT state vector to all active WebSocket clients.

---

### 1.7 Permissions & Access Control
#### `GET /api/documents/:id/permissions`
Lists user access levels on the document (`EDIT`, `COMMENT`, `VIEW`).

#### `POST /api/documents/:id/permissions`
Upserts a user's permission level.

**Request Body:**
```json
{
  "userId": "usr_diana_04",
  "role": "COMMENT"
}
```

---

## 2. WebSocket CRDT Protocol (`y-websocket`)

SyncSpace connects clients using binary WebSocket messages encoded with `lib0/encoding`.

### Message Type Framing

| Byte Code | Name | Payload Description |
|---|---|---|
| `0` | **`messageSync`** | Carries Yjs synchronization protocol frames (Step 1, Step 2, or incremental Update). |
| `1` | **`messageAwareness`** | Carries ephemeral user presence (cursor coordinates, selection, user identity). |
| `2` | **`messageAuth`** | Reserved for connection token verification. |

### Synchronization Sub-Messages
Inside `messageSync` (`0`), the second byte identifies the sync stage:
- **`0 (syncStep1)`:** Transmits client state vector. Server calculates delta and replies with `syncStep2`.
- **`1 (syncStep2)`:** Transmits binary update containing missing changes.
- **`2 (syncUpdate)`:** Broadcasts live incremental edits as keystrokes occur.

### Awareness Presence Schema
Awareness updates are encoded as VarUint client count + JSON state dictionaries:
```json
{
  "user": {
    "name": "Alice Cooper",
    "color": "#3b82f6",
    "id": "usr_alice_01"
  },
  "cursor": { "x": 380, "y": 210 },
  "canvasCursor": { "x": 640, "y": 320 }
}
```
Client heartbeats occur every 30 seconds to automatically prune disconnected peers.
