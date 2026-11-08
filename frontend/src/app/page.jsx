'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import Sidebar from '../components/Sidebar';
import CollaborativeHeader from '../components/CollaborativeHeader';
import DocumentEditor from '../components/DocumentEditor';
import CollaborativeCanvas from '../components/CollaborativeCanvas';
import CommentsDrawer from '../components/CommentsDrawer';
import VersionHistoryModal from '../components/VersionHistoryModal';
import PermissionsModal from '../components/PermissionsModal';

const API_BASE = 'http://localhost:5001/api';
const WS_URL = 'ws://localhost:1234';

export default function WorkspacePage() {
  // State: Core data
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // State: Workspace views & drawers
  const [activeMode, setActiveMode] = useState('document'); // 'document' | 'canvas'
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);

  // State: Document collaboration metadata
  const [comments, setComments] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [pendingSelection, setPendingSelection] = useState(null);

  // State: Real-time Presence & Connection
  const [wsConnected, setWsConnected] = useState(false);
  const [activeCollaborators, setActiveCollaborators] = useState([]);

  // Yjs document and WebSocket provider refs
  const [yDoc, setYDoc] = useState(null);
  const [provider, setProvider] = useState(null);

  // 1. Initial Load: Users, Workspaces, Initial Doc
  useEffect(() => {
    async function initWorkspace() {
      try {
        // Fetch users
        const usersRes = await fetch(`${API_BASE}/auth/users`);
        const usersData = await usersRes.json();
        setUsers(usersData);
        if (usersData.length > 0) {
          setCurrentUser(usersData[0]); // Default Alice Cooper
        }

        // Fetch workspaces
        const wsRes = await fetch(`${API_BASE}/workspaces`);
        const wsData = await wsRes.json();
        setWorkspaces(wsData);

        if (wsData.length > 0) {
          const defaultWs = wsData[0];
          setCurrentWorkspace(defaultWs);
          loadDocuments(defaultWs.id);
        }
      } catch (err) {
        console.error('Failed to load initial workspace data:', err);
      }
    }
    initWorkspace();
  }, []);

  // 2. Load Documents for a Workspace
  const loadDocuments = async (workspaceId) => {
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/documents`);
      const docs = await res.json();
      setDocuments(docs);
      if (docs.length > 0) {
        setCurrentDocument(docs[0]);
      } else {
        setCurrentDocument(null);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  // 3. Load Metadata (Comments, Snapshots, Permissions) when currentDocument changes
  useEffect(() => {
    if (!currentDocument) return;

    // Fetch comments
    fetch(`${API_BASE}/documents/${currentDocument.id}/comments`)
      .then((r) => r.json())
      .then(setComments)
      .catch(() => {});

    // Fetch snapshots
    fetch(`${API_BASE}/documents/${currentDocument.id}/snapshots`)
      .then((r) => r.json())
      .then(setSnapshots)
      .catch(() => {});

    // Fetch permissions
    fetch(`${API_BASE}/documents/${currentDocument.id}/permissions`)
      .then((r) => r.json())
      .then(setPermissions)
      .catch(() => {});
  }, [currentDocument?.id]);

  // 4. Setup Yjs & y-websocket Provider for currentDocument
  useEffect(() => {
    if (!currentDocument) return;

    const docId = currentDocument.id;
    const doc = new Y.Doc();
    const wsProvider = new WebsocketProvider(WS_URL, docId, doc);

    setYDoc(doc);
    setProvider(wsProvider);

    wsProvider.on('status', (event) => {
      setWsConnected(event.status === 'connected');
    });

    // Handle Awareness (Presence)
    const handleAwareness = () => {
      const states = wsProvider.awareness.getStates();
      const peers = [];
      states.forEach((state, clientID) => {
        if (state.user) {
          peers.push({
            clientID,
            ...state.user,
          });
        }
      });
      setActiveCollaborators(peers);
    };

    wsProvider.awareness.on('change', handleAwareness);

    // Broadcast current user profile
    if (currentUser) {
      wsProvider.awareness.setLocalStateField('user', {
        name: currentUser.name,
        color: currentUser.color,
        id: currentUser.id,
        role: currentUser.role,
      });
    }

    return () => {
      wsProvider.awareness.off('change', handleAwareness);
      wsProvider.disconnect();
      doc.destroy();
      setWsConnected(false);
    };
  }, [currentDocument?.id]);

  // Update awareness when currentUser switches
  useEffect(() => {
    if (provider && provider.awareness && currentUser) {
      provider.awareness.setLocalStateField('user', {
        name: currentUser.name,
        color: currentUser.color,
        id: currentUser.id,
        role: currentUser.role,
      });
    }
  }, [provider, currentUser]);

  // Compute Current User's permission on this document
  const userPermission = useMemo(() => {
    if (!currentUser || !permissions) return 'EDIT';
    const p = permissions.find((perm) => perm.userId === currentUser.id);
    return p?.role || 'EDIT';
  }, [currentUser, permissions]);

  // Handlers
  const handleSelectWorkspace = (ws) => {
    setCurrentWorkspace(ws);
    loadDocuments(ws.id);
  };

  const handleCreateDocument = async (parentId = null) => {
    if (!currentWorkspace) return;
    try {
      const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          parentId,
          title: 'Untitled Document',
          icon: '📄',
          createdBy: currentUser?.id,
        }),
      });
      const newDoc = await res.json();
      setDocuments((prev) => [...prev, newDoc]);
      setCurrentDocument(newDoc);
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await fetch(`${API_BASE}/documents/${docId}`, { method: 'DELETE' });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (currentDocument?.id === docId) {
        const remaining = documents.filter((d) => d.id !== docId);
        setCurrentDocument(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleUpdateTitle = async (newTitle) => {
    if (!currentDocument) return;
    setCurrentDocument((prev) => ({ ...prev, title: newTitle }));
    setDocuments((prev) =>
      prev.map((d) => (d.id === currentDocument.id ? { ...d, title: newTitle } : d))
    );
    try {
      await fetch(`${API_BASE}/documents/${currentDocument.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch (err) {}
  };

  const handleAddComment = async (data) => {
    if (!currentDocument) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${currentDocument.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          ...data,
        }),
      });
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setPendingSelection(null);
    } catch (err) {}
  };

  const handleToggleResolveComment = async (commentId, isResolved) => {
    try {
      await fetch(`${API_BASE}/comments/${commentId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved }),
      });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, isResolved } : c))
      );
    } catch (err) {}
  };

  const handleCreateSnapshot = async (data) => {
    if (!currentDocument) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${currentDocument.id}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdBy: currentUser?.id,
          ...data,
        }),
      });
      const snap = await res.json();
      setSnapshots((prev) => [snap, ...prev]);
    } catch (err) {}
  };

  const handleRollback = async (snapshotId) => {
    if (!currentDocument) return;
    try {
      await fetch(`${API_BASE}/documents/${currentDocument.id}/snapshots/${snapshotId}/rollback`, {
        method: 'POST',
      });
      alert('Document version successfully restored! CRDT state reloaded.');
      setHistoryOpen(false);
    } catch (err) {}
  };

  const handleUpdatePermission = async (userId, role) => {
    if (!currentDocument) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${currentDocument.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      const perm = await res.json();
      setPermissions((prev) => {
        const filtered = prev.filter((p) => p.userId !== userId);
        return [...filtered, perm];
      });
    } catch (err) {}
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* Sidebar: Workspaces & Document Tree */}
      <Sidebar
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        documents={documents}
        currentDocument={currentDocument}
        onSelectDocument={setCurrentDocument}
        onCreateDocument={handleCreateDocument}
        onDeleteDocument={handleDeleteDocument}
        users={users}
        currentUser={currentUser}
        onSwitchUser={setCurrentUser}
        wsConnected={wsConnected}
      />

      {/* Main Collaborative Workspace Canvas / Document Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {currentDocument ? (
          <>
            {/* Header with Title, Mode Switcher, Online Avatars, Actions */}
            <CollaborativeHeader
              document={currentDocument}
              activeMode={activeMode}
              setActiveMode={setActiveMode}
              activeCollaborators={activeCollaborators}
              onOpenComments={() => setCommentsOpen(!commentsOpen)}
              commentsCount={comments.filter((c) => !c.isResolved).length}
              onOpenHistory={() => setHistoryOpen(true)}
              onOpenPermissions={() => setPermissionsOpen(true)}
              userPermission={userPermission}
              onUpdateTitle={handleUpdateTitle}
            />

            {/* Content View: TipTap Document or Infinite Canvas */}
            <div className="flex-1 flex overflow-hidden relative">
              {activeMode === 'document' ? (
                yDoc && provider ? (
                  <DocumentEditor
                    key={`editor-${currentDocument.id}`}
                    yDoc={yDoc}
                    provider={provider}
                    currentUser={currentUser}
                    userPermission={userPermission}
                    onCommentSelection={(text, position) => {
                      setPendingSelection({ text, position });
                      setCommentsOpen(true);
                    }}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Connecting to CRDT provider...
                  </div>
                )
              ) : (
                <CollaborativeCanvas
                  key={`canvas-${currentDocument.id}`}
                  yDoc={yDoc}
                  provider={provider}
                  currentUser={currentUser}
                  userPermission={userPermission}
                  initialData={currentDocument.canvasData}
                />
              )}

              {/* Comments Side Drawer */}
              <CommentsDrawer
                isOpen={commentsOpen}
                onClose={() => setCommentsOpen(false)}
                comments={comments}
                onAddComment={handleAddComment}
                onToggleResolve={handleToggleResolveComment}
                currentUser={currentUser}
                pendingSelection={pendingSelection}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
            <span className="text-3xl">📁</span>
            <p className="text-sm font-semibold text-slate-600">No document selected</p>
            <button
              onClick={() => handleCreateDocument(null)}
              className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              + Create a new document
            </button>
          </div>
        )}
      </div>

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        snapshots={snapshots}
        onCreateSnapshot={handleCreateSnapshot}
        onRollback={handleRollback}
        currentUser={currentUser}
      />

      {/* Granular Permissions Modal */}
      <PermissionsModal
        isOpen={permissionsOpen}
        onClose={() => setPermissionsOpen(false)}
        users={users}
        permissions={permissions}
        onUpdatePermission={handleUpdatePermission}
      />
    </div>
  );
}
