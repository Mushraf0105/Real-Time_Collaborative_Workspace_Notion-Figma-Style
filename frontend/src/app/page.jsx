'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import Sidebar from '../components/Sidebar';
import CollaborativeHeader from '../components/CollaborativeHeader';
import DocumentEditor from '../components/DocumentEditor';
import CollaborativeCanvas from '../components/CollaborativeCanvas';
import CollaborativeSpreadsheet from '../components/CollaborativeSpreadsheet';
import CollaborativeSlides from '../components/CollaborativeSlides';
import CommentsDrawer from '../components/CommentsDrawer';
import VersionHistoryModal from '../components/VersionHistoryModal';
import PermissionsModal from '../components/PermissionsModal';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Palette
} from 'lucide-react';
import {
  exportToPDF,
  exportToWord,
  exportToXML,
  exportToHTML,
  exportToMarkdown,
  exportSheetToCSV,
  exportSlidesToPresentation,
} from '../utils/exportDocument';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:1234';

export default function WorkspacePage() {
  // State: Core data
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeEditor, setActiveEditor] = useState(null);

  // State: Workspace views & drawers
  const [activeMode, setActiveMode] = useState('document'); // 'document' | 'canvas'
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Helper: Persist navigation location in URL query params & localStorage
  const updateNavigationState = (wsId, docId, mode) => {
    if (typeof window === 'undefined') return;
    try {
      if (wsId) localStorage.setItem('syncspace_active_workspace_id', wsId);
      if (docId) {
        localStorage.setItem('syncspace_active_document_id', docId);
      } else {
        localStorage.removeItem('syncspace_active_document_id');
      }
      if (mode) localStorage.setItem('syncspace_active_mode', mode);

      // Keep URL search params in sync for seamless refresh & bookmarking
      const url = new URL(window.location.href);
      if (wsId) url.searchParams.set('ws', wsId);
      if (docId) url.searchParams.set('doc', docId);
      else url.searchParams.delete('doc');
      if (mode) url.searchParams.set('mode', mode);
      window.history.replaceState(null, '', url.pathname + url.search);
    } catch (e) {}
  };

  const handleSwitchUser = (user) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined' && user?.id) {
      localStorage.setItem('syncspace_active_user_id', user.id);
    }
  };

  const handleModeChange = (mode) => {
    setActiveMode(mode);
    updateNavigationState(currentWorkspace?.id, currentDocument?.id, mode);
  };

  // 1. Initial Load: Users, Workspaces, and Restore Active Document/Mode on Refresh
  useEffect(() => {
    async function initWorkspace() {
      try {
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const savedWsId = urlParams?.get('ws') || (typeof window !== 'undefined' ? localStorage.getItem('syncspace_active_workspace_id') : null);
        const savedDocId = urlParams?.get('doc') || (typeof window !== 'undefined' ? localStorage.getItem('syncspace_active_document_id') : null);
        const savedMode = urlParams?.get('mode') || (typeof window !== 'undefined' ? localStorage.getItem('syncspace_active_mode') : null);
        const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('syncspace_active_user_id') : null;

        // Fetch users
        const usersRes = await fetch(`${API_BASE}/auth/users`);
        const usersData = await usersRes.json();
        setUsers(usersData);
        if (usersData.length > 0) {
          const matchedUser = savedUserId ? usersData.find((u) => u.id === savedUserId) : null;
          setCurrentUser(matchedUser || usersData[0]);
        }

        // Fetch workspaces
        const wsRes = await fetch(`${API_BASE}/workspaces`);
        const wsData = await wsRes.json();
        setWorkspaces(wsData);

        if (wsData.length > 0) {
          let targetWs = wsData[0];
          if (savedWsId) {
            const foundWs = wsData.find((w) => w.id === savedWsId);
            if (foundWs) targetWs = foundWs;
          }
          setCurrentWorkspace(targetWs);
          await loadDocuments(targetWs.id, savedDocId, savedMode);
        }
      } catch (err) {
        console.error('Failed to load initial workspace data:', err);
      }
    }
    initWorkspace();
  }, []);

  // 2. Load Documents for a Workspace & Retain Page / Modality
  const loadDocuments = async (workspaceId, preferredDocId = null, preferredMode = null) => {
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/documents`);
      const docs = await res.json();
      setDocuments(docs);

      let targetDocId = preferredDocId;
      if (!targetDocId && typeof window !== 'undefined') {
        targetDocId = localStorage.getItem('syncspace_active_document_id');
      }

      let selectedDoc = null;
      if (targetDocId && docs.length > 0) {
        selectedDoc = docs.find((d) => d.id === targetDocId) || docs[0];
      } else if (docs.length > 0) {
        selectedDoc = docs[0];
      }

      setCurrentDocument(selectedDoc);

      // Determine active modality (Spreadsheet, Slides, Canvas, or Doc)
      let targetMode = preferredMode;
      if (!targetMode && typeof window !== 'undefined') {
        targetMode = localStorage.getItem('syncspace_active_mode');
      }

      if (!targetMode || !['document', 'canvas', 'spreadsheet', 'slides'].includes(targetMode)) {
        if (selectedDoc?.icon === '📊') targetMode = 'spreadsheet';
        else if (selectedDoc?.icon === '📽️') targetMode = 'slides';
        else if (selectedDoc?.icon === '🎨') targetMode = 'canvas';
        else targetMode = 'document';
      }

      setActiveMode(targetMode);
      updateNavigationState(workspaceId, selectedDoc?.id, targetMode);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  // 3. Load Metadata (Comments, Snapshots, Permissions) when currentDocument changes
  useEffect(() => {
    if (!currentDocument) {
      setComments([]);
      setSnapshots([]);
      setPermissions([]);
      return;
    }

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
    updateNavigationState(ws.id, null, activeMode);
  };

  const handleCreateWorkspace = async ({ name, icon, description }) => {
    try {
      const res = await fetch(`${API_BASE}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          icon: icon || '📁',
          description: description?.trim() || '',
          ownerId: currentUser?.id,
        }),
      });
      const newWs = await res.json();
      setWorkspaces((prev) => [...prev, newWs]);
      setCurrentWorkspace(newWs);

      // Start the new workspace completely clean with 0 documents (no demo data)
      setDocuments([]);
      setCurrentDocument(null);
      updateNavigationState(newWs.id, null, 'document');
      return newWs;
    } catch (err) {
      console.error('Failed to create workspace:', err);
    }
  };

  const handleDeleteWorkspace = async (workspaceId) => {
    if (workspaces.length <= 1) {
      alert('Cannot delete the only remaining workspace.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Failed to delete workspace');
        return;
      }
      const remaining = workspaces.filter((w) => w.id !== workspaceId);
      setWorkspaces(remaining);
      if (currentWorkspace?.id === workspaceId) {
        const nextWs = remaining.length > 0 ? remaining[0] : null;
        setCurrentWorkspace(nextWs);
        if (nextWs) {
          loadDocuments(nextWs.id);
          updateNavigationState(nextWs.id, null, 'document');
        } else {
          setDocuments([]);
          setCurrentDocument(null);
          updateNavigationState(null, null, 'document');
        }
      }
    } catch (err) {
      console.error('Failed to delete workspace:', err);
    }
  };

  const handleSelectDocument = (doc) => {
    setCurrentDocument(doc);
    let nextMode = 'document';
    if (doc?.icon === '📊') {
      nextMode = 'spreadsheet';
    } else if (doc?.icon === '📽️') {
      nextMode = 'slides';
    } else if (doc?.icon === '🎨') {
      nextMode = 'canvas';
    }
    setActiveMode(nextMode);
    updateNavigationState(currentWorkspace?.id, doc?.id, nextMode);
  };

  const handleCreateDocument = async (parentId = null, template = null) => {
    if (!currentWorkspace) return;
    try {
      const title = template?.title || 'Untitled Document';
      const icon = template?.icon || '📝';
      const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          parentId,
          title,
          icon,
          createdBy: currentUser?.id,
        }),
      });
      const newDoc = await res.json();
      setDocuments((prev) => [...prev, newDoc]);
      setCurrentDocument(newDoc);
      const nextMode = template?.mode || (newDoc.icon === '📊' ? 'spreadsheet' : newDoc.icon === '📽️' ? 'slides' : newDoc.icon === '🎨' ? 'canvas' : 'document');
      setActiveMode(nextMode);
      updateNavigationState(currentWorkspace.id, newDoc.id, nextMode);
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await fetch(`${API_BASE}/documents/${docId}`, { method: 'DELETE' });
      const remaining = documents.filter((d) => d.id !== docId);
      setDocuments(remaining);
      if (currentDocument?.id === docId) {
        const nextDoc = remaining.length > 0 ? remaining[0] : null;
        setCurrentDocument(nextDoc);
        let nextMode = 'document';
        if (nextDoc?.icon === '📊') nextMode = 'spreadsheet';
        else if (nextDoc?.icon === '📽️') nextMode = 'slides';
        else if (nextDoc?.icon === '🎨') nextMode = 'canvas';
        setActiveMode(nextMode);
        updateNavigationState(currentWorkspace?.id, nextDoc?.id, nextMode);
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
    if (currentUser?.role !== 'ADMIN') {
      alert('Permission denied. Only Administrators can grant or change document permissions.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/documents/${currentDocument.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, requesterId: currentUser?.id }),
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Failed to update permission');
        return;
      }
      const perm = await res.json();
      setPermissions((prev) => {
        const filtered = prev.filter((p) => p.userId !== userId);
        return [...filtered, perm];
      });
    } catch (err) {
      console.error('Failed to update permission:', err);
    }
  };

  const handleAddMember = async ({ name, email, role, color }) => {
    if (currentUser?.role !== 'ADMIN') {
      alert('Permission denied. Only Administrators can add new members.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          color,
          workspaceId: currentWorkspace?.id,
          requesterId: currentUser?.id,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Failed to add member');
        return;
      }
      const newUser = await res.json();
      setUsers((prev) => [...prev.filter((u) => u.id !== newUser.id), newUser]);
      if (currentDocument) {
        await handleUpdatePermission(newUser.id, role || 'EDIT');
      }
      return newUser;
    } catch (err) {
      console.error('Failed to create member:', err);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (currentUser?.role !== 'ADMIN') {
      alert('Permission denied. Only Administrators can remove members.');
      return;
    }
    if (userId === currentUser?.id) {
      alert('You cannot remove yourself from the workspace.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/users/${userId}?requesterId=${currentUser?.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Failed to remove member');
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setPermissions((prev) => prev.filter((p) => p.userId !== userId));
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleExport = (format) => {
    if (!currentDocument) return;
    const title = currentDocument.title || 'Untitled Document';
    const htmlContent = activeEditor?.getHTML() || currentDocument.content || `<h1>${title}</h1>`;
    const textContent = activeEditor?.getText() || currentDocument.content || title;
    const jsonContent = activeEditor?.getJSON() || null;

    switch (format) {
      case 'pdf':
        exportToPDF(title, htmlContent);
        break;
      case 'word':
        exportToWord(title, htmlContent);
        break;
      case 'xml':
        exportToXML(title, currentDocument, jsonContent, textContent);
        break;
      case 'html':
        exportToHTML(title, htmlContent);
        break;
      case 'markdown':
        exportToMarkdown(title, textContent);
        break;
      case 'csv': {
        const sheetCells = yDoc?.getMap('sheet_cells');
        const cellsObj = {};
        sheetCells?.forEach((v, k) => {
          cellsObj[k] = v;
        });
        exportSheetToCSV(title, cellsObj);
        break;
      }
      case 'presentation': {
        const slidesMap = yDoc?.getMap('slides_data');
        const deck = slidesMap?.get('deck') || [];
        exportSlidesToPresentation(title, deck);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white relative">
      {/* Mobile Backdrop for Sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar: Workspaces & Document Tree */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        documents={documents}
        currentDocument={currentDocument}
        onSelectDocument={handleSelectDocument}
        onCreateDocument={handleCreateDocument}
        onDeleteDocument={handleDeleteDocument}
        users={users}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        wsConnected={wsConnected}
        onOpenAddMember={() => setPermissionsOpen(true)}
      />

      {/* Main Collaborative Workspace Canvas / Document Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {currentDocument ? (
          <>
            {/* Header with Title, Mode Switcher, Online Avatars, Actions */}
            <CollaborativeHeader
              document={currentDocument}
              activeMode={activeMode}
              setActiveMode={handleModeChange}
              activeCollaborators={activeCollaborators}
              onOpenComments={() => setCommentsOpen(!commentsOpen)}
              commentsCount={comments.filter((c) => !c.isResolved).length}
              onOpenHistory={() => setHistoryOpen(true)}
              onOpenPermissions={() => setPermissionsOpen(true)}
              userPermission={userPermission}
              onUpdateTitle={handleUpdateTitle}
              onExport={handleExport}
              onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            />

            {/* Content View: TipTap Document, Infinite Canvas, Excel Spreadsheet, or PowerPoint Slides */}
            <div className="flex-1 flex overflow-hidden relative isolate">
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
                    onEditorReady={setActiveEditor}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Connecting to CRDT provider...
                  </div>
                )
              ) : activeMode === 'canvas' ? (
                <CollaborativeCanvas
                  key={`canvas-${currentDocument.id}`}
                  yDoc={yDoc}
                  provider={provider}
                  currentUser={currentUser}
                  userPermission={userPermission}
                  initialData={currentDocument.canvasData}
                />
              ) : activeMode === 'spreadsheet' ? (
                <CollaborativeSpreadsheet
                  key={`sheet-${currentDocument.id}`}
                  yDoc={yDoc}
                  provider={provider}
                  currentUser={currentUser}
                  userPermission={userPermission}
                  onExportCSV={() => handleExport('csv')}
                />
              ) : (
                <CollaborativeSlides
                  key={`slides-${currentDocument.id}`}
                  yDoc={yDoc}
                  provider={provider}
                  currentUser={currentUser}
                  userPermission={userPermission}
                  onExportSlides={() => handleExport('presentation')}
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
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-slate-50/50">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-3xl mb-4">
              {currentWorkspace?.icon || '📁'}
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">
              {currentWorkspace ? `${currentWorkspace.name} is ready` : 'No workspace selected'}
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mb-6">
              This workspace is completely clean. Choose a format to start entering your own data:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl w-full">
              <button
                onClick={() => handleCreateDocument(null, { title: 'Untitled Document', icon: '📝', mode: 'document' })}
                className="flex flex-col items-center p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all group text-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <FileText size={20} />
                </div>
                <span className="text-xs font-bold text-slate-800">Blank Document</span>
                <span className="text-[10px] text-slate-400">Notion-style</span>
              </button>

              <button
                onClick={() => handleCreateDocument(null, { title: 'Untitled Spreadsheet', icon: '📊', mode: 'spreadsheet' })}
                className="flex flex-col items-center p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all group text-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={20} />
                </div>
                <span className="text-xs font-bold text-slate-800">Blank Spreadsheet</span>
                <span className="text-[10px] text-slate-400">Excel-style</span>
              </button>

              <button
                onClick={() => handleCreateDocument(null, { title: 'Untitled Presentation', icon: '📽️', mode: 'slides' })}
                className="flex flex-col items-center p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all group text-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Presentation size={20} />
                </div>
                <span className="text-xs font-bold text-slate-800">Blank Presentation</span>
                <span className="text-[10px] text-slate-400">PowerPoint-style</span>
              </button>

              <button
                onClick={() => handleCreateDocument(null, { title: 'Untitled Whiteboard', icon: '🎨', mode: 'canvas' })}
                className="flex flex-col items-center p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all group text-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Palette size={20} />
                </div>
                <span className="text-xs font-bold text-slate-800">Blank Whiteboard</span>
                <span className="text-[10px] text-slate-400">Figma-style</span>
              </button>
            </div>
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
      />

      {/* Granular Permissions Modal */}
      <PermissionsModal
        isOpen={permissionsOpen}
        onClose={() => setPermissionsOpen(false)}
        users={users}
        permissions={permissions}
        currentUser={currentUser}
        onUpdatePermission={handleUpdatePermission}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
      />
    </div>
  );
}

