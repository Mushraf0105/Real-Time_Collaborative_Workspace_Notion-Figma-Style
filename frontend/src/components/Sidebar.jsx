'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Layers,
  UserCheck,
  X,
  FileText,
  FileSpreadsheet,
  Presentation,
  Palette,
  Shield
} from 'lucide-react';

export default function Sidebar({
  isOpen,
  onClose,
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  documents,
  currentDocument,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
  users,
  currentUser,
  onSwitchUser,
  wsConnected,
  onOpenAddMember,
}) {
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [newPageMenuOpen, setNewPageMenuOpen] = useState(false);
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsIcon, setWsIcon] = useState('🚀');
  const [wsDesc, setWsDesc] = useState('');
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [expandedDocs, setExpandedDocs] = useState({});

  const toggleExpand = (docId, e) => {
    e.stopPropagation();
    setExpandedDocs((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  // Group documents into tree: root docs and child docs
  const rootDocs = documents.filter((d) => !d.parentId);
  const getChildren = (parentId) => documents.filter((d) => d.parentId === parentId);

  const renderDocTree = (doc, depth = 0) => {
    const children = getChildren(doc.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedDocs[doc.id] !== false; // default expanded
    const isSelected = currentDocument?.id === doc.id;

    return (
      <div key={doc.id} className="select-none">
        <div
          onClick={() => {
            onSelectDocument(doc);
            if (onClose) onClose();
          }}
          style={{ paddingLeft: `${12 + depth * 14}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg text-sm cursor-pointer transition-all ${
            isSelected
              ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(doc.id, e)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-3.5 inline-block" />
            )}
            <span className="text-base">{doc.icon || '📄'}</span>
            <span className="truncate">{doc.title || 'Untitled'}</span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateDocument(doc.id);
              }}
              title="Add subpage"
              className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-200"
            >
              <Plus size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Archive "${doc.title}"?`)) {
                  onDeleteDocument(doc.id);
                }
              }}
              title="Archive page"
              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {children.map((child) => renderDocTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 md:relative md:z-0 w-72 md:w-64 h-full bg-slate-50 md:bg-slate-50/80 border-r border-slate-200 flex flex-col justify-between shrink-0 select-none shadow-2xl md:shadow-none transition-transform duration-200 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Top Section */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Workspace Brand / Switcher */}
        <div className="p-3 border-b border-slate-200 relative flex items-center justify-between gap-1">
          <button
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="flex-1 min-w-0 flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                {currentWorkspace?.icon || '🚀'}
              </div>
              <div className="truncate">
                <h2 className="text-sm font-bold text-slate-800 truncate leading-tight">
                  {currentWorkspace?.name || 'SyncSpace Workspace'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">Real-Time Team Hub</p>
              </div>
            </div>
            <ChevronDown size={16} className="text-slate-400 shrink-0 ml-1" />
          </button>

          {/* Close Sidebar Button on Mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
            title="Close sidebar"
          >
            <X size={18} />
          </button>

          {/* Workspace Dropdown */}
          {workspaceMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setWorkspaceMenuOpen(false)}
              />
              <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Workspaces
              </div>
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => {
                    onSelectWorkspace(ws);
                    setWorkspaceMenuOpen(false);
                  }}
                  className={`group/ws w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
                    ws.id === currentWorkspace?.id
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{ws.icon || '📁'}</span>
                    <span className="truncate">{ws.name}</span>
                  </div>

                  {workspaces.length > 1 && onDeleteWorkspace && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Delete workspace "${ws.name}"? All its documents, spreadsheets, and slides will be permanently deleted.`
                          )
                        ) {
                          onDeleteWorkspace(ws.id);
                        }
                      }}
                      className="opacity-0 group-hover/ws:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200 transition-opacity shrink-0"
                      title={`Delete "${ws.name}" workspace`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}

              <div className="pt-1 mt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setWorkspaceMenuOpen(false);
                    setShowCreateWsModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Plus size={13} />
                  <span>+ Create New Workspace</span>
                </button>
              </div>
            </div>
            </>
          )}
        </div>

        {/* Documents Tree Header & Button */}
        <div className="px-3 pt-4 pb-2 flex items-center justify-between relative">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers size={13} />
            Documents & Workspace
          </span>
          <div className="relative">
            <button
              onClick={() => setNewPageMenuOpen(!newPageMenuOpen)}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors shadow-xs"
              title="Create a new document, spreadsheet, presentation, or whiteboard"
            >
              <Plus size={14} />
              <span>New</span>
              <ChevronDown size={11} className="text-blue-400" />
            </button>

            {/* New Document Type Dropdown */}
            {newPageMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNewPageMenuOpen(false)}
                />
                <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5 animate-in fade-in duration-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Create New
                </div>

                <button
                  onClick={() => {
                    onCreateDocument(null, { title: 'Untitled Document', icon: '📝', mode: 'document' });
                    setNewPageMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                >
                  <FileText size={14} className="text-blue-600 shrink-0" />
                  <span>Document (Notion)</span>
                </button>

                <button
                  onClick={() => {
                    onCreateDocument(null, { title: 'Q4 Financial Model', icon: '📊', mode: 'spreadsheet' });
                    setNewPageMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600 shrink-0" />
                  <span>Spreadsheet (Excel)</span>
                </button>

                <button
                  onClick={() => {
                    onCreateDocument(null, { title: 'Product Pitch Deck', icon: '📽️', mode: 'slides' });
                    setNewPageMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors text-left"
                >
                  <Presentation size={14} className="text-amber-500 shrink-0" />
                  <span>Presentation (PowerPoint)</span>
                </button>

                <button
                  onClick={() => {
                    onCreateDocument(null, { title: 'Sticky Whiteboard', icon: '🎨', mode: 'canvas' });
                    setNewPageMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left"
                >
                  <Palette size={14} className="text-purple-600 shrink-0" />
                  <span>Whiteboard (Figma)</span>
                </button>
              </div>
              </>
            )}
          </div>
        </div>

        {/* Documents Tree Scrollable Container */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {rootDocs.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-6">
              No documents yet. Create one!
            </div>
          ) : (
            rootDocs.map((doc) => renderDocTree(doc, 0))
          )}
        </div>
      </div>

      {/* Bottom Section: Active Persona & Sync Telemetry */}
      <div className="p-3 border-t border-slate-200 bg-white/60 space-y-3">
        {/* System Telemetry & Cluster Status */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200/60">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="font-medium">
              {wsConnected ? 'Live Yjs WS :1234' : 'Connecting...'}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
            Redis Bus Active
          </span>
        </div>

        {/* Demo Persona Switcher */}
        <div className="relative">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
            <UserCheck size={12} />
            Active Collaborator
          </div>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition-all text-left"
          >
            <div className="flex items-center gap-2 truncate">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                style={{ backgroundColor: currentUser?.color || '#3b82f6' }}
              >
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {currentUser?.name || 'Select User'}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  Role: {currentUser?.role || 'MEMBER'}
                </div>
              </div>
            </div>
            <ChevronDown size={14} className="text-slate-400 shrink-0" />
          </button>

          {/* Persona Menu Popup */}
          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Switch Assessment Persona
              </div>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    onSwitchUser(u);
                    setUserMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                    u.id === currentUser?.id
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: u.color }}
                  />
                  <div className="truncate">
                    <span className="font-semibold block">{u.name}</span>
                    <span className="text-[10px] text-slate-400 block">{u.email}</span>
                  </div>
                </button>
              ))}

              {currentUser?.role === 'ADMIN' ? (
                <div className="pt-1 mt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      if (onOpenAddMember) onOpenAddMember();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Plus size={13} />
                    <span>+ Add New Member</span>
                  </button>
                </div>
              ) : (
                <div className="pt-1 mt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      if (onOpenAddMember) onOpenAddMember();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <Shield size={12} className="text-slate-400" />
                    <span>View Workspace Members</span>
                  </button>
                </div>
              )}
            </div>
            </>
          )}
        </div>
      </div>

      {/* Create Workspace Modal */}
      {showCreateWsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{wsIcon}</span>
                <h3 className="font-bold text-sm text-slate-800">Create New Workspace</h3>
              </div>
              <button
                onClick={() => setShowCreateWsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
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
                  if (onCreateWorkspace) {
                    await onCreateWorkspace({
                      name: wsName.trim(),
                      icon: wsIcon,
                      description: wsDesc.trim(),
                    });
                  }
                  setWsName('');
                  setWsDesc('');
                  setShowCreateWsModal(false);
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsCreatingWs(false);
                }
              }}
              className="space-y-3"
            >
              {/* Icon Picker */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Workspace Icon
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['🚀', '💡', '⚡', '🏢', '🧪', '🎨', '📊', '🌐'].map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setWsIcon(emoji)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base border transition-all ${
                        wsIcon === emoji
                          ? 'border-blue-500 bg-blue-50 scale-110 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  placeholder="e.g. AI Research Lab, Product Squad..."
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={wsDesc}
                  onChange={(e) => setWsDesc(e.target.value)}
                  placeholder="e.g. Core team collaborative space..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateWsModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!wsName.trim() || isCreatingWs}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isCreatingWs ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}

