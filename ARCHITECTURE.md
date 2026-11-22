# SyncSpace System Architecture & Technical Specification

SyncSpace is a distributed, real-time collaborative workspace suite combining **Notion-style structured block editing**, **Figma-style infinite visual canvas diagramming**, **Excel-style collaborative spreadsheets**, and **PowerPoint-style presentation slides**. This document details the architectural decisions, mathematical CRDT models, WebSocket protocol, Redis horizontal scaling topology, and database schemas.

---

## 1. High-Level Distributed Architecture

```mermaid
flowchart TD
    subgraph Clients["Client Browsers (Collaborators)"]
        ClientA["Browser A (Mushraf - Admin)"]
        ClientB["Browser B (Bob - Engineer)"]
        ClientC["Browser C (Test Collaborator)"]
    end

    subgraph Edge["Load Balancer / Reverse Proxy"]
        LB["Nginx / Cloudflare / Envoy"]
    end

    subgraph Cluster["WebSocket & CRDT Server Cluster"]
        WS1["WS Server Node 1 (Port 1234)"]
        WS2["WS Server Node 2 (Port 1235)"]
    end

    subgraph Bus["Distributed Message Bus"]
        Redis["Redis Pub/Sub Cluster<br/>Channel: collab:doc:{id}"]
    end

    subgraph Storage["Persistence & Relational Layer"]
        Prisma["Prisma ORM Engine"]
        Postgres["PostgreSQL / SQLite Storage<br/>• Users & Strict RBAC<br/>• Workspaces & Tree<br/>• Binary Yjs Snapshots<br/>• Comments & Revisions"]
        Creds["Disk Credentials Sync<br/>• Admin.json<br/>• Member.json<br/>• Viewer.json<br/>• users.json"]
    end

    ClientA -->|WebSocket y-protocol| WS1
    ClientB -->|WebSocket y-protocol| WS1
    ClientC -->|WebSocket y-protocol| WS2

    WS1 <-->|Publish / Subscribe| Redis
    WS2 <-->|Publish / Subscribe| Redis

    WS1 -->|Debounced Persistence| Prisma
    WS2 -->|Debounced Persistence| Prisma
    Prisma --> Postgres
    Prisma <-->|Two-Way Sync| Creds
```

---

## 2. Four Collaborative Workplace Modalities

SyncSpace provides four synchronized modalities powered by Yjs data structures:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [📝 Document (Notion)]  [🎨 Canvas (Figma)]  [📊 Spreadsheet (Excel)]  [📽️ Slides (PowerPoint)] │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Notion Document (`DocumentEditor.jsx`):**
   - **CRDT Structure:** Doubly-linked sequence item list via `y-prosemirror`.
   - **Features:** Headings, interactive tables, task lists, code blocks, quote blocks, remote carets.
2. **Figma Canvas (`CollaborativeCanvas.jsx`):**
   - **CRDT Structure:** Spatial key-value dictionary via `yDoc.getMap('canvas_notes')`.
   - **Features:** 2D coordinate sticky notes, touch drag support, live colored cursors.
3. **Excel Spreadsheet (`CollaborativeSpreadsheet.jsx`):**
   - **CRDT Structure:** Cell matrix dictionary via `yDoc.getMap('sheet_cells')`.
   - **Features:** Real-time formula engine (`=SUM`, `=AVG`, `=COUNT`, arithmetic), currency/percentage formatting, peer cell selection awareness, CSV export.
4. **PowerPoint Slides (`CollaborativeSlides.jsx`):**
   - **CRDT Structure:** Slide array dictionary via `yDoc.getMap('slides_data')`.
   - **Features:** 5 visual themes, 5 slide layouts, speaker notes, fullscreen Presenter Mode (`F5`), printable 16:9 export.

---

## 3. CRDT Foundations vs Operational Transformation (OT)

### 3.1 Why CRDTs over OT?
Traditional collaborative systems (e.g., Google Docs v1) rely on **Operational Transformation (OT)**. OT requires:
1. A **central authority** to establish a global operation sequence ($op_1, op_2, \dots$).
2. Transformation matrices ($T(op_A, op_B)$) that grow exponentially with operation complexity.
3. Network roundtrips before an operation is confirmed, creating typing latency and desync under flaky connections.

SyncSpace implements **Conflict-Free Replicated Data Types (CRDTs)** via **Yjs**:
- **Commutativity:** Operations can be received and applied in any order without changing the final document state:
  $$A \circ B = B \circ A$$
- **Associativity:** Grouping of operations does not affect the outcome:
  $$(A \circ B) \circ C = A \circ (B \circ C)$$
- **Idempotency:** Re-transmitting or duplicate delivery of the same update produces no change:
  $$A \circ A = A$$

### 3.2 Yjs Sequence CRDT Mechanics
Yjs represents a collaborative document as a doubly-linked list of **Items**:
$$\text{Item} = \langle \text{ID}, \text{Left}, \text{Right}, \text{Content}, \text{DeletedFlag} \rangle$$

- **Item ID:** Composed of a unique client identifier and a monotonic logical clock:
  $$\text{ID} = (\text{client\_id}, \text{clock})$$
- **Insertions:** When an item is inserted between item $L$ and item $R$, it records $L$ and $R$ as its immutable left and right origin pointers. Even if another peer inserts concurrently, the deterministic sorting of $(\text{clock}, \text{client\_id})$ guarantees identical ordering across all replicas.
- **Deletions & Garbage Collection:** Deletions do not shift character offsets. Instead, an item is marked with a **tombstone** ($\text{DeletedFlag} = \text{true}$), ensuring that concurrent insertions pointing to the deleted item remain valid.

### 3.3 State Vector Sync Protocol (`y-protocols/sync`)
Instead of transmitting the entire document on every keystroke, SyncSpace utilizes a **2-Step State Vector Handshake**:

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client Browser
    participant Server as WebSocket Server
    participant Redis as Redis Pub/Sub

    Note over Client,Server: Step 1: Handshake & Missing Update Discovery
    Client->>Server: SyncStep1 (Client State Vector: [Client1: 140, Client2: 80])
    Server->>Client: SyncStep2 (Diff Updates missing from Client)
    Server->>Client: SyncStep1 (Server State Vector)
    Client->>Server: SyncStep2 (Diff Updates missing from Server)

    Note over Client,Server: Step 2: Live Incremental Edits & Redis Broadcast
    Client->>Server: SyncUpdate (Incremental keystroke binary chunk)
    Server->>Redis: Publish to 'collab:doc:xxx' (Base64 binary update)
    Redis-->>Server: Broadcast to peer instances
    Server-->>Client: Real-Time SyncUpdate broadcast
```

---

## 4. Real-Time Presence & Awareness Protocol

Collaborative awareness (colored cursors, live selections, peer grid highlights, and active user avatars) operates over the binary `y-protocols/awareness` channel:
1. **Local State Broadcast:** Each client periodically broadcasts an awareness dictionary:
   ```json
   {
     "user": {
       "id": "usr_mushraf_01",
       "name": "Md Mushraf Ali",
       "color": "#3b82f6",
       "role": "ADMIN"
     },
     "cursor": { "x": 420, "y": 180 },
     "selectedCell": "B4"
   }
   ```
2. **Ephemeral Nature:** Unlike document CRDT updates, awareness states are **ephemeral** and not persisted to disk. If a client disconnects, a heartbeat timeout (30 seconds) automatically prunes the user from the active collaborator list.

---

## 5. Multi-Instance Horizontal Scaling with Redis Pub/Sub

To scale across multiple WebSocket server instances without session affinity or sticky load-balancing bottlenecks:
1. **Channel Namespacing:** Every document has a dedicated Redis channel:
   $$\text{Channel} = \text{"collab:doc:"} + \text{documentId}$$
2. **Loop Prevention:** When a server instance applies an update received from Redis, it tags the update origin as `'redis'`. The local document update handler checks:
   $$\text{if } (\text{origin} \neq \text{'redis'} \land \text{origin} \neq \text{'database-init'}) \implies \text{publishToRedis()}$$
   This completely prevents infinite pub/sub echo storms.
3. **Graceful Zero-Config Fallback:** If Redis is temporarily offline, the `RedisSyncBus` automatically downgrades to an in-memory Node.js `EventEmitter`, allowing zero-friction local development without requiring external daemons.

---

## 6. Strict Administrator RBAC & Safe Ownership Reassignment

SyncSpace implements enterprise Role-Based Access Control:

1. **Role Enforcement:**
   - Only `ADMIN` can assign `EDIT`, `COMMENT`, or `VIEW` permissions.
   - Only `ADMIN` can invite new team members or remove existing members.
   - Non-admins see read-only status pills and cannot trigger administrative mutations.
2. **Safe Ownership Reassignment on Removal:**
   - When a user is removed, any documents, sticky notes, or historical snapshots created by that user are safely reassigned to the active Administrator before the user is deleted from the database.
   - This guarantees that no documents are orphaned and zero database foreign-key constraint violations can occur.
3. **Bidirectional Disk Credentials Sync:**
   - Changes made directly to `credentials/*.json` on disk are automatically parsed and reconciled into `prisma.user` on server startup and on every user list query.

---

## 7. Database Schema & Entity-Relationship Model

```mermaid
erDiagram
    User ||--o{ WorkspaceMember : "belongs to"
    Workspace ||--o{ WorkspaceMember : "has members"
    Workspace ||--o{ Document : "contains"
    User ||--o{ Document : "authors"
    Document ||--o{ Document : "parent/child tree"
    Document ||--o{ DocumentPermission : "governs"
    Document ||--o{ Comment : "has comments"
    User ||--o{ Comment : "writes"
    Document ||--o{ DocumentSnapshot : "snapshots"
    User ||--o{ DocumentSnapshot : "saves"

    User {
        string id PK
        string name
        string email UK
        string password
        string color
        string role
        datetime createdAt
    }

    Workspace {
        string id PK
        string name
        string slug UK
        string icon
        string ownerId
        datetime createdAt
    }

    WorkspaceMember {
        string id PK
        string workspaceId FK
        string userId FK
        string role
    }

    Document {
        string id PK
        string workspaceId FK
        string parentId FK
        string title
        string icon
        string content
        bytes yjsState
        string canvasData
        boolean isArchived
        string createdBy FK
        datetime updatedAt
    }

    DocumentPermission {
        string id PK
        string documentId FK
        string userId FK
        string role
    }

    Comment {
        string id PK
        string documentId FK
        string userId FK
        string content
        string selectedText
        boolean isResolved
        datetime createdAt
    }

    DocumentSnapshot {
        string id PK
        string documentId FK
        int version
        string title
        string description
        bytes yjsState
        string createdBy FK
        datetime createdAt
    }
```
