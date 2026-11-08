import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import prisma from './db/prisma.js';
import { customPersistence } from './crdt/persistence.js';
import { redisBus } from './redis/redisBus.js';

dotenv.config();

const require = createRequire(import.meta.url);
const Y = require('yjs');
const { setupWSConnection, docs, setPersistence } = require('y-websocket/bin/utils');

// Configure custom persistence for CRDT state & Redis PubSub
setPersistence(customPersistence);

const app = express();
const PORT = process.env.PORT || 5001;
const WS_PORT = process.env.WS_PORT || 1234;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ----------------------------------------------------
// Health & System Telemetry Endpoint
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeCRDTDocuments: docs.size,
    redisClustering: redisBus.isRedisConnected ? 'connected' : 'in-memory-fallback',
  });
});

// ----------------------------------------------------
// Auth & Demo Personas Endpoints
// ----------------------------------------------------
app.get('/api/auth/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, avatar: true, color: true, role: true },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Auto-fallback: if demo user not found, fetch first user
      user = await prisma.user.findFirst();
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        color: user.color,
        role: user.role,
      },
      token: `demo-token-${user.id}`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ----------------------------------------------------
// Workspaces Endpoints
// ----------------------------------------------------
app.get('/api/workspaces', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_alice_01';
    const workspaces = await prisma.workspace.findMany({
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, color: true },
            },
          },
        },
      },
    });
    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

app.post('/api/workspaces', async (req, res) => {
  try {
    const { name, icon, description, ownerId } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        icon: icon || '📁',
        description,
        ownerId: ownerId || 'usr_alice_01',
        members: {
          create: [{ userId: ownerId || 'usr_alice_01', role: 'OWNER' }],
        },
      },
      include: {
        members: { include: { user: true } },
      },
    });
    res.status(201).json(workspace);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// ----------------------------------------------------
// Documents / Pages Endpoints
// ----------------------------------------------------
app.get('/api/workspaces/:workspaceId/documents', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const documents = await prisma.document.findMany({
      where: { workspaceId, isArchived: false },
      select: {
        id: true,
        workspaceId: true,
        parentId: true,
        title: true,
        icon: true,
        cover: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(documents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.get('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true, color: true },
        },
        permissions: true,
      },
    });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const { workspaceId, parentId, title, icon, createdBy } = req.body;
    const doc = await prisma.document.create({
      data: {
        workspaceId,
        parentId: parentId || null,
        title: title || 'Untitled Document',
        icon: icon || '📄',
        createdBy: createdBy || 'usr_alice_01',
        content: '<h1>Untitled Document</h1><p>Start collaborating in real-time...</p>',
        canvasData: JSON.stringify([]),
        permissions: {
          create: [
            { userId: createdBy || 'usr_alice_01', role: 'EDIT' },
          ],
        },
      },
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create document' });
  }
});

app.put('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, icon, content, canvasData } = req.body;
    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(icon !== undefined && { icon }),
        ...(content !== undefined && { content }),
        ...(canvasData !== undefined && { canvasData }),
        updatedAt: new Date(),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update document' });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.document.update({
      where: { id },
      data: { isArchived: true },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive document' });
  }
});

// ----------------------------------------------------
// Comments Endpoints
// ----------------------------------------------------
app.get('/api/documents/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await prisma.comment.findMany({
      where: { documentId: id },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, color: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/documents/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, content, selectedText, position } = req.body;
    const comment = await prisma.comment.create({
      data: {
        documentId: id,
        userId: userId || 'usr_alice_01',
        content,
        selectedText,
        position: typeof position === 'object' ? JSON.stringify(position) : position,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, color: true },
        },
      },
    });
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

app.patch('/api/comments/:commentId/resolve', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { isResolved } = req.body;
    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { isResolved: isResolved !== undefined ? isResolved : true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update comment status' });
  }
});

// ----------------------------------------------------
// Version History & Snapshots Endpoints
// ----------------------------------------------------
app.get('/api/documents/:id/snapshots', async (req, res) => {
  try {
    const { id } = req.params;
    const snapshots = await prisma.documentSnapshot.findMany({
      where: { documentId: id },
      include: {
        creator: {
          select: { id: true, name: true, avatar: true, color: true },
        },
      },
      orderBy: { version: 'desc' },
    });
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

app.post('/api/documents/:id/snapshots', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, createdBy } = req.body;

    const count = await prisma.documentSnapshot.count({ where: { documentId: id } });
    const doc = await prisma.document.findUnique({ where: { id } });

    // Grab current in-memory Yjs binary state or DB state
    let yjsState = doc?.yjsState;
    if (docs.has(id)) {
      yjsState = Buffer.from(Y.encodeStateAsUpdate(docs.get(id)));
    }

    const snapshot = await prisma.documentSnapshot.create({
      data: {
        documentId: id,
        version: count + 1,
        title: title || `Version ${count + 1}`,
        description,
        textContent: doc?.content || '',
        yjsState: yjsState || null,
        createdBy: createdBy || 'usr_alice_01',
      },
      include: {
        creator: {
          select: { id: true, name: true, avatar: true, color: true },
        },
      },
    });
    res.status(201).json(snapshot);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

app.post('/api/documents/:id/snapshots/:snapshotId/rollback', async (req, res) => {
  try {
    const { id, snapshotId } = req.params;
    const snapshot = await prisma.documentSnapshot.findUnique({
      where: { id: snapshotId },
    });
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    // 1. Update DB state
    await prisma.document.update({
      where: { id },
      data: {
        content: snapshot.textContent,
        yjsState: snapshot.yjsState,
        updatedAt: new Date(),
      },
    });

    // 2. If doc is active in memory, apply snapshot update to revert state and broadcast to peers
    if (docs.has(id) && snapshot.yjsState) {
      const activeDoc = docs.get(id);
      try {
        Y.applyUpdate(activeDoc, new Uint8Array(snapshot.yjsState), 'rollback');
        // Publish to Redis so all other instances roll back too
        redisBus.publishUpdate(`collab:doc:${id}`, {
          docName: id,
          update: Buffer.from(snapshot.yjsState).toString('base64'),
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error('Error applying rollback update to active Y.Doc:', e);
      }
    }

    res.json({ success: true, message: `Rolled back to ${snapshot.title}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rollback snapshot' });
  }
});

// ----------------------------------------------------
// Permissions Endpoints
// ----------------------------------------------------
app.get('/api/documents/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params;
    const permissions = await prisma.documentPermission.findMany({
      where: { documentId: id },
    });
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

app.post('/api/documents/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;
    const permission = await prisma.documentPermission.upsert({
      where: {
        documentId_userId: { documentId: id, userId },
      },
      update: { role },
      create: { documentId: id, userId, role },
    });
    res.json(permission);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

// ----------------------------------------------------
// Server Startup & WebSocket Binding
// ----------------------------------------------------
const server = http.createServer(app);

// Primary WebSocket Server on separate port (1234) for standard y-websocket client compatibility
const standaloneWss = new WebSocketServer({ port: WS_PORT });
standaloneWss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});

// Also attach upgrade listener to HTTP server (port 5001) for /ws or flexible proxy setups
server.on('upgrade', (request, socket, head) => {
  // Pass to standaloneWss handleUpgrade
  standaloneWss.handleUpgrade(request, socket, head, (ws) => {
    standaloneWss.emit('connection', ws, request);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 [SyncSpace API] Server running on http://localhost:${PORT}`);
  console.log(`📡 [SyncSpace WS] Real-Time CRDT WebSocket server running on ws://localhost:${WS_PORT}`);
  console.log(`⚡ [SyncSpace Clustering] Redis PubSub bus initialized (${redisBus.isRedisConnected ? 'Redis Connected' : 'In-Memory Fallback'})`);
});
