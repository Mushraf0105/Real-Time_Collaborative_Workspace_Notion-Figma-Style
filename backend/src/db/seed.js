import { PrismaClient } from '@prisma/client';
import * as Y from 'yjs';
import { saveUserToCredentialsFiles } from '../utils/credentialsSync.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting SyncSpace database seeding...');

  // 1. Clear existing data
  await prisma.comment.deleteMany({});
  await prisma.documentSnapshot.deleteMany({});
  await prisma.documentPermission.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.workspaceMember.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Demo Personas
  const alice = await prisma.user.create({
    data: {
      id: 'usr_alice_01',
      name: 'Alice Cooper',
      email: 'alice@syncspace.io',
      password: 'Password@123',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      color: '#3b82f6', // Sapphire Blue
      role: 'ADMIN',
    },
  });

  const bob = await prisma.user.create({
    data: {
      id: 'usr_bob_02',
      name: 'Bob Smith',
      email: 'bob@syncspace.io',
      password: 'Password@123',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      color: '#10b981', // Emerald Green
      role: 'MEMBER',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      id: 'usr_charlie_03',
      name: 'Charlie Lee',
      email: 'charlie@syncspace.io',
      password: 'Password@123',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      color: '#f59e0b', // Amber Orange
      role: 'MEMBER',
    },
  });

  const diana = await prisma.user.create({
    data: {
      id: 'usr_diana_04',
      name: 'Diana Prince',
      email: 'diana@syncspace.io',
      password: 'Password@123',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      color: '#ec4899', // Rose Pink
      role: 'VIEWER',
    },
  });

  console.log('✅ Created 4 demo user personas');

  // Automatically sync with credentials files
  saveUserToCredentialsFiles(alice, 'Acme Innovation Lab');
  saveUserToCredentialsFiles(bob, 'Acme Innovation Lab');
  saveUserToCredentialsFiles(charlie, 'Acme Innovation Lab');
  saveUserToCredentialsFiles(diana, 'Acme Innovation Lab');

  // 3. Create Workspaces
  const acmeLab = await prisma.workspace.create({
    data: {
      id: 'ws_acme_lab',
      name: 'Acme Innovation Lab',
      slug: 'acme-lab',
      description: 'Cross-functional engineering and design collaborative hub.',
      icon: '🚀',
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'OWNER' },
          { userId: bob.id, role: 'ADMIN' },
          { userId: charlie.id, role: 'MEMBER' },
          { userId: diana.id, role: 'VIEWER' },
        ],
      },
    },
  });

  const engTeam = await prisma.workspace.create({
    data: {
      id: 'ws_eng_team',
      name: 'Core Systems & Infrastructure',
      slug: 'core-systems',
      description: 'Distributed systems, CRDT convergence research, and Redis clustering.',
      icon: '⚡',
      ownerId: bob.id,
      members: {
        create: [
          { userId: bob.id, role: 'OWNER' },
          { userId: alice.id, role: 'ADMIN' },
        ],
      },
    },
  });

  console.log('✅ Created 2 workspaces with granular RBAC');

  // 4. Initialize Yjs initial state for sample documents
  const doc1Yjs = new Y.Doc();
  const doc1Fragment = doc1Yjs.getXmlFragment('default');
  // Sample initial TipTap state representation
  const initialContentDoc1 = `
    <h1>🚀 Welcome to SyncSpace Collaborative Workspace</h1>
    <p>SyncSpace is a <strong>conflict-free real-time collaborative workspace</strong> built on top of <em>Yjs CRDT</em>, <em>WebSockets</em>, <em>Next.js</em>, and <em>Redis Pub/Sub</em>.</p>
    <h2>✨ Key Features</h2>
    <ul>
      <li><strong>Real-Time Rich Text Editing:</strong> Sub-5ms synchronized typing powered by Yjs state vectors.</li>
      <li><strong>Live Colored Presence:</strong> See peer cursors, current selections, and active user badges.</li>
      <li><strong>Figma-Style Canvas:</strong> Switch to the interactive infinite canvas for sticky notes and visual diagramming.</li>
      <li><strong>Threaded Comments & Permissions:</strong> Highlight text or click canvas objects to start discussion threads.</li>
      <li><strong>Version History & Revert:</strong> View snapshot history and rollback document states with 1 click.</li>
    </ul>
    <h2>⚡ How CRDTs Ensure Zero Merge Conflicts</h2>
    <blockquote>"Conflict-Free Replicated Data Types (CRDTs) mathematically guarantee strong eventual consistency across distributed clients without requiring centralized locking or operational transform re-ordering."</blockquote>
  `.trim();

  const binaryDoc1 = Buffer.from(Y.encodeStateAsUpdate(doc1Yjs));

  // 5. Create Documents
  const doc1 = await prisma.document.create({
    data: {
      id: 'doc_welcome_01',
      workspaceId: acmeLab.id,
      title: 'Welcome to SyncSpace',
      icon: '🚀',
      content: initialContentDoc1,
      yjsState: binaryDoc1,
      createdBy: alice.id,
      canvasData: JSON.stringify([
        { id: 'note-1', type: 'sticky', x: 80, y: 100, text: '💡 Kickoff Sprint: Validate CRDT latency benchmark < 15ms across browsers', color: '#fef08a' },
        { id: 'note-2', type: 'sticky', x: 340, y: 100, text: '🎨 Figma-style infinite canvas synced over Y.Map', color: '#fed7aa' },
        { id: 'note-3', type: 'sticky', x: 600, y: 100, text: '🛡️ Redis Pub/Sub cluster handles multi-instance scaling', color: '#bbf7d0' },
      ]),
    },
  });

  const doc2 = await prisma.document.create({
    data: {
      id: 'doc_rfc_crdt_02',
      workspaceId: acmeLab.id,
      parentId: doc1.id,
      title: 'RFC-104: CRDT Synchronization & Redis Cluster Protocol',
      icon: '📜',
      content: `
        <h1>RFC-104: CRDT Synchronization & Redis Cluster Protocol</h1>
        <p><strong>Status:</strong> Approved | <strong>Author:</strong> Alice Cooper | <strong>Target:</strong> v1.2</p>
        <hr />
        <h3>1. Motivation</h3>
        <p>Traditional Operational Transformation (OT) requires a central server to linearize all operations. Under high concurrent write loads or flaky WebSocket connections, OT suffers from desynchronization and lock contention. SyncSpace utilizes Yjs CRDTs (state-based and operation-based hybrid) to achieve determinism.</p>
        <h3>2. Multi-Instance Topology</h3>
        <p>Each WebSocket server instance handles client rooms. When a peer updates a document, the node publishes binary updates to <code>collab:doc:{id}</code> on Redis Pub/Sub, broadcasting instantaneously to all peer nodes.</p>
      `.trim(),
      createdBy: alice.id,
      canvasData: JSON.stringify([
        { id: 'rf-1', type: 'card', x: 100, y: 120, text: 'Client A (Browser 1) -> WS Server 1', color: '#e0e7ff' },
        { id: 'rf-2', type: 'card', x: 400, y: 120, text: 'Redis Pub/Sub Channel "collab:doc:xxx"', color: '#fbcfe8' },
        { id: 'rf-3', type: 'card', x: 700, y: 120, text: 'Client B (Browser 2) -> WS Server 2', color: '#e0e7ff' },
      ]),
    },
  });

  const doc3 = await prisma.document.create({
    data: {
      id: 'doc_canvas_board_03',
      workspaceId: acmeLab.id,
      title: 'Product Roadmap & Interactive Canvas',
      icon: '🎨',
      content: '<h1>Product Roadmap Canvas</h1><p>Use the Canvas tab above to collaborate on sticky notes, brainstorm sprints, and drag architecture blocks in real-time.</p>',
      createdBy: charlie.id,
      canvasData: JSON.stringify([
        { id: 'stick-1', type: 'sticky', x: 120, y: 80, text: 'Feature: Document Revision Timeline & Rollback', color: '#fef08a' },
        { id: 'stick-2', type: 'sticky', x: 380, y: 80, text: 'Feature: Live Cursor Presence with custom colored avatars', color: '#fed7aa' },
        { id: 'stick-3', type: 'sticky', x: 640, y: 80, text: 'Feature: Granular Permission Gates (View, Comment, Edit)', color: '#bae6fd' },
        { id: 'stick-4', type: 'sticky', x: 120, y: 280, text: 'Benchmarking: 50 Concurrent Peers Gutenberg typing test', color: '#fbcfe8' },
      ]),
    },
  });

  console.log('✅ Created 3 collaborative documents with Canvas sticky notes');

  // 6. Create Granular Document Permissions
  await prisma.documentPermission.createMany({
    data: [
      { documentId: doc1.id, userId: alice.id, role: 'EDIT' },
      { documentId: doc1.id, userId: bob.id, role: 'EDIT' },
      { documentId: doc1.id, userId: charlie.id, role: 'COMMENT' },
      { documentId: doc1.id, userId: diana.id, role: 'VIEW' },
    ],
  });

  // 7. Create Comments
  await prisma.comment.createMany({
    data: [
      {
        id: 'comm_01',
        documentId: doc1.id,
        userId: bob.id,
        content: 'The TipTap integration with y-websocket feels super smooth! Tested with 10 concurrent tabs.',
        selectedText: 'sub-5ms synchronized typing',
        isResolved: false,
      },
      {
        id: 'comm_02',
        documentId: doc1.id,
        userId: charlie.id,
        content: 'Can we add support for embedded tables and code syntax highlighting in block mode?',
        selectedText: 'Key Features',
        isResolved: true,
      },
      {
        id: 'comm_03',
        documentId: doc1.id,
        userId: diana.id,
        content: 'Love the Figma-style sticky canvas toggle! Very intuitive for design reviews.',
        isResolved: false,
      },
    ],
  });

  // 8. Create Version History Snapshots
  await prisma.documentSnapshot.createMany({
    data: [
      {
        id: 'snap_v1_0',
        documentId: doc1.id,
        version: 1,
        title: 'v1.0 Initial Specification',
        description: 'Initial draft of SyncSpace overview and architecture',
        textContent: 'Initial draft with feature requirements and CRDT basics.',
        createdBy: alice.id,
        createdAt: new Date(Date.now() - 3600000 * 24 * 2), // 2 days ago
      },
      {
        id: 'snap_v1_1',
        documentId: doc1.id,
        version: 2,
        title: 'v1.1 Added Canvas & Redis Scaling Spec',
        description: 'Integrated infinite canvas model and multi-instance Redis bus',
        textContent: initialContentDoc1,
        createdBy: bob.id,
        createdAt: new Date(Date.now() - 3600000 * 6), // 6 hours ago
      },
    ],
  });

  console.log('✅ Seeded permissions, comments, and version snapshots');
  console.log('✨ SyncSpace seeding complete! Ready for evaluation.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

