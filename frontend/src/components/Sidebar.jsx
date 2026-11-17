'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Layers,
  UserCheck
} from 'lucide-react';

export default function Sidebar({
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
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
          onClick={() => onSelectDocument(doc)}
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
    <aside className="w-64 h-full bg-slate-50/80 border-r border-slate-200 flex flex-col justify-between shrink-0 select-none">
      {/* Top Section */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Workspace Brand / Switcher */}
        <div className="p-3 border-b border-slate-200 relative">
          <button
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-200/70 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {currentWorkspace?.icon || '🚀'}
              </div>
              <div className="truncate">
                <h2 className="text-sm font-bold text-slate-800 truncate leading-tight">
                  {currentWorkspace?.name || 'SyncSpace Workspace'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">Real-Time Team Hub</p>
              </div>
            </div>
            <ChevronDown size={16} className="text-slate-400 shrink-0" />
          </button>

          {/* Workspace Dropdown */}
          {workspaceMenuOpen && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Workspaces
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    onSelectWorkspace(ws);
                    setWorkspaceMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors ${
                    ws.id === currentWorkspace?.id
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{ws.icon || '📁'}</span>
                  <span className="truncate">{ws.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Documents Tree Header & Button */}
        <div className="px-3 pt-4 pb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers size={13} />
            Documents & Canvas
          </span>
          <button
            onClick={() => onCreateDocument(null)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
          >
            <Plus size={14} />
            New Page
          </button>
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
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

