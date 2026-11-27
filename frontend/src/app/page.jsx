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
  Palette,
  Home,
  Plus,
  Trash2,
  Folder,
  ArrowRight,
  Shield,
  Sparkles,
  Menu,
  X
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

const getApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://syncspace-backend-v89m.onrender.com/api';
  }
  return 'http://localhost:5001/api';
};

const getWsUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'wss://syncspace-backend-v89m.onrender.com';
  }
  return 'ws://localhost:1234';
};

export default function WorkspacePage() {
  const API_BASE = getApiBase();
  const WS_URL = getWsUrl();

  // State: Core data
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeEditor, setActiveEditor] = useState(null);

  // State: Workspace creation modal
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsIcon, setWsIcon] = useState('🏢');
  const [wsDesc, setWsDesc] = useState('');
  const [isCreatingWs, setIsCreatingWs] = useState(false);

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
      if (wsId) {
        localStorage.setItem('syncspace_active_workspace_id', wsId);
      } else {
        localStorage.removeItem('syncspace_active_workspace_id');
      }
      if (docId) {
        localStorage.setItem('syncspace_active_document_id', docId);
      } else {
        localStorage.removeItem('syncspace_active_document_id');
      }
      if (mode && wsId) {
        localStorage.setItem('syncspace_active_mode', mode);
      } else {
        localStorage.removeItem('syncspace_active_mode');
      }

      // Keep URL search params in sync for seamless refresh & bookmarking
      const url = new URL(window.location.href);
      if (wsId) {
        url.searchParams.set('ws', wsId);
      } else {
        url.searchParams.delete('ws');
      }
      if (docId) url.searchParams.set('doc', docId);
      else url.searchParams.delete('doc');
      if (mode && wsId) url.searchParams.set('mode', mode);
      else url.searchParams.delete('mode');

      window.history.replaceState(null, '', url.pathname + (url.search || ''));
    } catch (e) {}
  };

  const handleGoHome = () => {
    setCurrentWorkspace(null);
    setCurrentDocument(null);
    setDocuments([]);
    updateNavigationState(null, null, null);
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
        const urlWsId = urlParams?.get('ws');
        const urlDocId = urlParams?.get('doc');
        const urlMode = urlParams?.get('mode');
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

        // ONLY load workspace if URL has explicit ?ws= param!
        // This ensures visiting "/" directly displays the Home Page / Workspace Selection Hub!
        // When refreshed inside a workspace (URL has ?ws=...), it stays right where it was refreshed!
        if (urlWsId && wsData.length > 0) {
          const foundWs = wsData.find((w) => w.id === urlWsId);
          if (foundWs) {
            setCurrentWorkspace(foundWs);
            await loadDocuments(foundWs.id, urlDocId, urlMode);
          } else {
            handleGoHome();
          }
        } else {
          // Fresh launch on "/" -> Show Home Page / Workspace Hub!
          handleGoHome();
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
    if (currentUser?.role !== 'ADMIN') {
      alert('Only Administrators can create workspaces.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          icon: icon || '📁',
          description: description?.trim() || '',
          ownerId: currentUser?.id,
          requesterId: currentUser?.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to create workspace');
        return;
      }
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
    if (currentUser?.role !== 'ADMIN') {
      alert('Only Administrators can delete workspaces.');
      return;
    }
    if (workspaces.length <= 1) {
      alert('Cannot delete the only remaining workspace.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}?requesterId=${currentUser?.id}`, {
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
        onGoHome={handleGoHome}
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
        {!currentWorkspace ? (
          /* ========================================================================= */
          /* HOME PAGE / WORKSPACE SELECTION HUB (Shown on initial visit & Home nav)    */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gradient-to-b from-slate-50 to-white select-none">
            {/* Top Navigation Bar of Home Page */}
            <header className="h-16 px-6 border-b border-slate-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                >
                  <Menu size={20} />
                </button>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  ⚡
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-800 leading-tight">SyncSpace Workspace Hub</h1>
                  <p className="text-[11px] text-slate-500">Real-Time Team Collaboration Suite</p>
                </div>
              </div>

              {/* User Switcher / Persona in Home Header */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200/80">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                    style={{ backgroundColor: currentUser?.color || '#3b82f6' }}
                  >
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{currentUser?.name || 'Collaborator'}</span>
                    {currentUser?.role === 'ADMIN' ? (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-0.5">
                        <Shield size={10} /> Admin
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                        Member
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick User Switch Dropdown */}
                <div className="relative group">
                  <button className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer">
                    Switch Persona ▾
                  </button>
                  <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 min-w-[210px]">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Select Collaborator
                    </div>
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSwitchUser(u)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          currentUser?.id === u.id ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: u.color }} />
                          <span className="truncate">{u.name}</span>
                        </div>
                        {u.role === 'ADMIN' && <span className="text-[10px] text-blue-600 font-bold shrink-0">Admin</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </header>

            {/* Hero & Workspace Selector Section */}
            <div className="max-w-6xl w-full mx-auto px-6 py-8 space-y-10">
              {/* Hero Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-8 text-white shadow-xl">
                <div className="relative z-10 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-semibold mb-4 border border-white/20">
                    <Sparkles size={13} className="text-amber-300" />
                    <span>Multi-Agent Real-Time CRDT Architecture</span>
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight mb-2">
                    Welcome to SyncSpace
                  </h2>
                  <p className="text-sm text-blue-100 leading-relaxed max-w-xl">
                    Select a workspace below to collaborate in real-time across Documents, Figma Whiteboards, Excel Spreadsheets, and PowerPoint Slide Decks.
                  </p>
                </div>
              </div>

              {/* Workspaces Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Folder size={20} className="text-blue-600" />
                      <span>Available Workspaces</span>
                      <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {workspaces.length}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pick a workspace to open its documents, whiteboards, spreadsheets, and presentation decks.
                    </p>
                  </div>

                  {currentUser?.role === 'ADMIN' ? (
                    <button
                      onClick={() => {
                        setWsName('');
                        setWsDesc('');
                        setWsIcon('🏢');
                        setShowCreateWsModal(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Create New Workspace</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80">
                      <Shield size={13} className="text-slate-400" />
                      <span>Administrator authority required to create or delete workspaces</span>
                    </div>
                  )}
                </div>

                {/* Workspaces Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      className="group relative bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all flex flex-col justify-between p-5"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shrink-0">
                            {ws.icon || '🏢'}
                          </div>
                          {currentUser?.role === 'ADMIN' && workspaces.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  confirm(
                                    `Delete workspace "${ws.name}"? All documents, canvas objects, and data will be permanently removed.`
                                  )
                                ) {
                                  handleDeleteWorkspace(ws.id);
                                }
                              }}
                              className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete workspace (Admin only)"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <h4 className="font-bold text-base text-slate-800 group-hover:text-blue-600 transition-colors mb-1">
                          {ws.name}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                          {ws.description || 'Enterprise collaborative workspace for engineering, design, spreadsheets, and presentations.'}
                        </p>

                        {/* Modalities Available Pill */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                            📝 Docs
                          </span>
                          <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100">
                            🎨 Figma Canvas
                          </span>
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">
                            📊 Spreadsheets
                          </span>
                          <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-100">
                            📽️ Slides
                          </span>
                        </div>
                      </div>

                      {/* Enter Button */}
                      <button
                        onClick={() => handleSelectWorkspace(ws)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-slate-900 group-hover:bg-blue-600 text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <span>Enter Workspace</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  ))}

                  {/* Quick Create Card for Admin */}
                  {currentUser?.role === 'ADMIN' && (
                    <div
                      onClick={() => {
                        setWsName('');
                        setWsDesc('');
                        setWsIcon('🏢');
                        setShowCreateWsModal(true);
                      }}
                      className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/30 transition-all min-h-[220px]"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <Plus size={24} />
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 mb-1">Create Another Workspace</h4>
                      <p className="text-xs text-slate-400 max-w-[200px]">
                        Add an isolated workspace for a new department, team, or project.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Feature Modalities Showcase */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Collaborative Modalities in SyncSpace</h3>
                  <p className="text-xs text-slate-500">
                    Four specialized workspaces unified under one real-time multi-agent sync engine.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-3">
                      📝
                    </div>
                    <h5 className="font-bold text-xs text-slate-800 mb-1">Nexvia Documents</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Notion-style rich text with inline checklists, markdown syntax, slash commands, and granular comments.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl mb-3">
                      🎨
                    </div>
                    <h5 className="font-bold text-xs text-slate-800 mb-1">Nexvia Whiteboard</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Figma-style multiplayer infinite canvas with vector pens, shapes, sticky notes, and live cursor awareness.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-3">
                      📊
                    </div>
                    <h5 className="font-bold text-xs text-slate-800 mb-1">Nexvia Spreadsheets</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Excel-style collaborative grid with live formula evaluation (=SUM, =AVERAGE), formatting, and CSV export.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl mb-3">
                      📽️
                    </div>
                    <h5 className="font-bold text-xs text-slate-800 mb-1">Nexvia Pitch Deck</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      PowerPoint-style slides with layout customization, speaker notes, live presenter view, and full-screen display.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentDocument ? (
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
          /* ========================================================================= */
          /* EMPTY WORKSPACE ONBOARDING (Workspace selected, but 0 documents yet)       */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col h-full bg-slate-50/50">
            {/* Top Workspace Header Bar */}
            <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                >
                  <Menu size={18} />
                </button>
                <button
                  onClick={handleGoHome}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <Home size={14} />
                  <span>All Workspaces</span>
                </button>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <span>{currentWorkspace.icon || '🏢'}</span>
                  <span>{currentWorkspace.name}</span>
                </span>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-3xl mb-4">
                {currentWorkspace?.icon || '📁'}
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">
                {currentWorkspace.name} is ready
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
          </div>
        )}
      </div>

      {/* Create Workspace Modal (Global) */}
      {showCreateWsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>🏢</span>
                <span>Create New Workspace</span>
              </h3>
              <button
                onClick={() => setShowCreateWsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!wsName.trim()) return;
                setIsCreatingWs(true);
                try {
                  await handleCreateWorkspace({
                    name: wsName.trim(),
                    icon: wsIcon,
                    description: wsDesc.trim(),
                  });
                  setShowCreateWsModal(false);
                } finally {
                  setIsCreatingWs(false);
                }
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  placeholder="e.g. Nexvia AI Lab"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 shadow-xs"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Choose Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {['🏢', '🚀', '💡', '⚡', '🎨', '📊', '🛠️', '🌐', '📈', '🔬'].map((ic) => (
                    <button
                      type="button"
                      key={ic}
                      onClick={() => setWsIcon(ic)}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer ${
                        wsIcon === ic
                          ? 'bg-blue-100 border-2 border-blue-500 scale-105'
                          : 'bg-slate-100 hover:bg-slate-200 border border-transparent'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Description
                </label>
                <textarea
                  value={wsDesc}
                  onChange={(e) => setWsDesc(e.target.value)}
                  placeholder="Brief purpose of this workspace..."
                  rows={3}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 shadow-xs resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateWsModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingWs || !wsName.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingWs ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

