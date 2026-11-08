'use client';

import React from 'react';
import {
  FileText,
  Palette,
  MessageSquare,
  History,
  Shield,
  Users,
  Share2,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function CollaborativeHeader({
  document,
  activeMode,
  setActiveMode,
  activeCollaborators,
  onOpenComments,
  commentsCount,
  onOpenHistory,
  onOpenPermissions,
  userPermission,
  onUpdateTitle,
}) {
  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 select-none z-10">
      {/* Left: Document Icon & Title */}
      <div className="flex items-center gap-3 min-w-0 max-w-md">
        <span className="text-2xl cursor-default">{document?.icon || '📝'}</span>
        <input
          type="text"
          value={document?.title || ''}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder="Untitled Document"
          disabled={userPermission === 'VIEW'}
          className="text-base font-bold text-slate-800 bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-400 rounded px-1.5 py-0.5 truncate transition-all disabled:opacity-75"
        />
      </div>

      {/* Center: Notion Mode vs Figma Canvas Mode Toggle */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-xs">
        <button
          onClick={() => setActiveMode('document')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeMode === 'document'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText size={14} />
          <span>Document (Notion)</span>
        </button>

        <button
          onClick={() => setActiveMode('canvas')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeMode === 'canvas'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Palette size={14} />
          <span>Canvas (Figma)</span>
        </button>
      </div>

      {/* Right: Presence Avatars, Comments, History, and Permissions */}
      <div className="flex items-center gap-3">
        {/* Real-Time Collaborators Presence Avatars */}
        <div className="flex items-center -space-x-2 mr-1">
          {activeCollaborators.length === 0 ? (
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Solo
            </div>
          ) : (
            activeCollaborators.map((peer, idx) => (
              <div
                key={peer.id || idx}
                title={`${peer.name} (${peer.email || 'Online'})`}
                style={{ borderColor: peer.color || '#3b82f6' }}
                className="w-8 h-8 rounded-full border-2 bg-white flex items-center justify-center font-bold text-white text-xs shadow-xs relative group"
              >
                <div
                  className="w-full h-full rounded-full flex items-center justify-center"
                  style={{ backgroundColor: peer.color || '#3b82f6' }}
                >
                  {peer.name?.charAt(0) || 'U'}
                </div>
                {/* Tooltip on hover */}
                <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[11px] font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none">
                  <span>{peer.name}</span>
                  <span className="text-[9px] text-slate-400">{peer.role || 'Active'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Permissions Pill Badge */}
        <button
          onClick={onOpenPermissions}
          title="Manage Document Permissions"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
            userPermission === 'EDIT'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : userPermission === 'COMMENT'
              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
          }`}
        >
          <Shield size={13} />
          <span>{userPermission || 'EDIT'}</span>
        </button>

        {/* Comments Drawer Button */}
        <button
          onClick={onOpenComments}
          title="Open Comments Thread"
          className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
        >
          <MessageSquare size={14} className="text-slate-500" />
          <span>Comments</span>
          {commentsCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-bold">
              {commentsCount}
            </span>
          )}
        </button>

        {/* Version History Button */}
        <button
          onClick={onOpenHistory}
          title="Version History & Snapshots"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
        >
          <History size={14} className="text-slate-500" />
          <span>History</span>
        </button>
      </div>
    </header>
  );
}
