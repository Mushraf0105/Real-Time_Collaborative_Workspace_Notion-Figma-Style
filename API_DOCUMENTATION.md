# SyncSpace API & WebSocket Protocol Documentation

This document provides complete reference specifications for SyncSpace REST endpoints and the real-time WebSocket CRDT wire protocol.

---

## 📡 Base URLs & Endpoints

| Service | Protocol | Base URL | Purpose |
|---|---|---|---|
| **REST API Server** | HTTP / JSON | `http://localhost:5001/api` | Auth, Workspaces, Documents, Comments, Snapshots, Permissions |
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
  "timestamp": "2026-11-20T12:00:00.000Z",
  "uptime": 1420.5,
  "activeCRDTDocuments": 3,
  "redisClustering": "connected"
}
```

---

### 1.2 Authentication, Personas & Member Management
#### `GET /api/auth/users`
Lists active workspace users for 1-click persona switching. Automatically performs a two-way synchronization from `credentials/*.json` to the database before returning data.

**Response `200 OK`:**
```json
[
  {
    "id": "usr_mushraf_01",
    "name": "Md Mushraf Ali",
    "email": "mushraf@gmail.com",
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
  "email": "mushraf@gmail.com",
  "password": "mushraf8520"
}
```

**Response `200 OK`:**
```json
{
  "user": {
    "id": "usr_mushraf_01",
    "name": "Md Mushraf Ali",
    "email": "mushraf@gmail.com",
    "color": "#3b82f6",
    "role": "ADMIN"
  },
  "token": "demo-token-usr_mushraf_01"
}
```

#### `POST /api/auth/users`
Registers a new team member and automatically saves their profile to `credentials/*.json`.
- **Security:** If `requesterId` is passed, strictly enforces that the requester must have the `ADMIN` role (`403 Forbidden` if non-admin).

**Request Body:**
```json
{
  "name": "Sarah Connor",
  "email": "sarah@syncspace.io",
  "role": "EDIT",
  "color": "#ec4899",
  "workspaceId": "ws_acme_lab",
  "requesterId": "usr_mushraf_01"
}
```

#### `DELETE /api/auth/users/:userId`
Removes a team member from the workspace and database.
- **Security:** Requires `requesterId` with `ADMIN` role.
- **Safety Guarantees:** 
  1. Prevents deletion of the only remaining Administrator.
  2. Prevents self-removal.
  3. Safely reassigns all documents and snapshots created by the user to the active Administrator so no data is lost.
  4. Cleans up workspace memberships and document permissions.
  5. Automatically purges the user from `credentials/*.json` on disk.

---

### 1.3 Workspaces
#### `GET /api/workspaces`
Lists workspaces accessible to the authenticated user with member details.

#### `POST /api/workspaces`
Creates a new workspace. Initializes clean without demo data so users can begin entering their own documents immediately.

**Request Body:**
```json
{
  "name": "Product Systems Lab",
  "icon": "🚀",
  "description": "Cross-functional collaborative workspace.",
  "ownerId": "usr_mushraf_01"
}
```

#### `DELETE /api/workspaces/:workspaceId`
Deletes a workspace and cascades cleanup to all nested documents, sticky notes, and permissions.
- **Safety:** Rejects deletion if only 1 workspace remains.

---

### 1.4 Documents & Nested Hierarchy
#### `GET /api/workspaces/:workspaceId/documents`
Retrieves all documents within a workspace, including parent/child relationships for recursive tree rendering.

#### `POST /api/documents`
Creates a new document, spreadsheet, slide deck, or whiteboard canvas page.

**Request Body:**
```json
{
  "workspaceId": "ws_acme_lab",
  "parentId": null,
  "title": "Q4 Financial Model",
  "icon": "📊",
  "createdBy": "usr_mushraf_01"
}
```

#### `GET /api/documents/:id`
Retrieves full metadata, content cache, and canvas data for a document.

#### `PUT /api/documents/:id`
Updates document title, icon, content, or canvas objects.

#### `DELETE /api/documents/:id`
Soft-archives a document (`isArchived = true`).

---

### 1.5 Comments & Discussion Threads
#### `GET /api/documents/:id/comments`
Retrieves threaded discussion comments on a document.

#### `POST /api/documents/:id/comments`
Adds a new comment anchored to a text selection range or canvas position.

**Request Body:**
```json
{
  "userId": "usr_bob_02",
  "content": "Please review this cell formula.",
  "selectedText": "=SUM(B3:D3)",
  "position": { "from": 12, "to": 24 }
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
  "title": "v2.0 Milestone Release",
  "description": "Completed spreadsheet formula audit and added presentation slides",
  "createdBy": "usr_mushraf_01"
}
```

#### `POST /api/documents/:id/snapshots/:snapshotId/rollback`
Restores the document to the specified historical snapshot and broadcasts the rewound CRDT state vector to all active WebSocket clients.

---

### 1.7 Permissions & Access Control (RBAC)
#### `GET /api/documents/:id/permissions`
Lists user access levels on the document (`EDIT`, `COMMENT`, `VIEW`).

#### `POST /api/documents/:id/permissions`
Upserts a user's permission level.
- **Security:** If `requesterId` is provided, enforces that only users with `ADMIN` role can adjust permissions (`403 Forbidden` if unauthorized).

**Request Body:**
```json
{
  "userId": "usr_bob_02",
  "role": "EDIT",
  "requesterId": "usr_mushraf_01"
}
```

---

## 2. WebSocket CRDT Protocol (`y-websocket`)

SyncSpace connects clients using binary WebSocket messages encoded with `lib0/encoding`.

### Message Type Framing

| Byte Code | Name | Payload Description |
|---|---|---|
| `0` | **`messageSync`** | Carries Yjs synchronization protocol frames (Step 1, Step 2, or incremental Update). |
| `1` | **`messageAwareness`** | Carries ephemeral user presence (cursor coordinates, selection, user identity, peer cell selections). |
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
    "name": "Md Mushraf Ali",
    "color": "#3b82f6",
    "id": "usr_mushraf_01"
  },
  "cursor": { "x": 380, "y": 210 },
  "canvasCursor": { "x": 640, "y": 320 },
  "selectedCell": "C4"
}
```
Client heartbeats occur every 30 seconds to automatically prune disconnected peers.
