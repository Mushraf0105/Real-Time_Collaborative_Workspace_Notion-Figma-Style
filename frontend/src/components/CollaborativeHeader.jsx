'use client';

import React, { useState } from 'react';
import {
  FileText,
  Palette,
  FileSpreadsheet,
  Presentation,
  MessageSquare,
  History,
  Shield,
  Download,
  ChevronDown,
  Menu
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
  onExport,
  onToggleSidebar,
}) {
  const [exportOpen, setExportOpen] = useState(false);
  return (
    <header className="relative z-30 h-14 border-b border-slate-200 bg-white flex items-center justify-between px-2 sm:px-4 shrink-0 select-none gap-1.5 sm:gap-3">
      {/* Left: Mobile Hamburger, Document Icon & Title */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg shrink-0 transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>

        <span className="text-xl sm:text-2xl cursor-default shrink-0">{document?.icon || '📝'}</span>
        <input
          type="text"
          value={document?.title || ''}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder="Untitled Document"
          disabled={userPermission === 'VIEW'}
          className="w-24 sm:w-40 md:w-56 text-sm sm:text-base font-bold text-slate-800 bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 sm:px-1.5 py-0.5 truncate transition-all disabled:opacity-75"
        />
      </div>

      {/* Center: Notion Doc vs Figma Canvas vs Excel Spreadsheet vs PowerPoint Slides */}
      <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200/80 shadow-xs shrink-0 gap-0.5">
        <button
          onClick={() => setActiveMode('document')}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeMode === 'document'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Notion-style Document"
        >
          <FileText size={14} className="shrink-0" />
          <span className="hidden md:inline">Document (Notion)</span>
          <span className="md:hidden">Doc</span>
        </button>

        <button
          onClick={() => setActiveMode('canvas')}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeMode === 'canvas'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Figma-style Infinite Canvas"
        >
          <Palette size={14} className="shrink-0" />
          <span className="hidden md:inline">Canvas (Figma)</span>
          <span className="md:hidden">Canvas</span>
        </button>

        <button
          onClick={() => setActiveMode('spreadsheet')}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeMode === 'spreadsheet'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Excel-style Spreadsheet"
        >
          <FileSpreadsheet size={14} className="shrink-0 text-emerald-600" />
          <span className="hidden md:inline">Spreadsheet (Excel)</span>
          <span className="md:hidden">Excel</span>
        </button>

        <button
          onClick={() => setActiveMode('slides')}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeMode === 'slides'
              ? 'bg-white text-amber-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="PowerPoint-style Presentation Slides"
        >
          <Presentation size={14} className="shrink-0 text-amber-500" />
          <span className="hidden md:inline">Slides (PowerPoint)</span>
          <span className="md:hidden">Slides</span>
        </button>
      </div>

      {/* Right: Presence Avatars, Comments, History, and Permissions */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-2.5 shrink-0">
        {/* Real-Time Collaborators Presence Avatars */}
        <div className="hidden xs:flex sm:flex items-center -space-x-1.5 sm:-space-x-2 mr-0.5 sm:mr-1">
          {activeCollaborators.length === 0 ? (
            <div className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="hidden sm:inline">Solo</span>
            </div>
          ) : (
            activeCollaborators.slice(0, 3).map((peer, idx) => (
              <div
                key={peer.id || idx}
                title={`${peer.name} (${peer.email || 'Online'})`}
                style={{ borderColor: peer.color || '#3b82f6' }}
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 bg-white flex items-center justify-center font-bold text-white text-[10px] sm:text-xs shadow-xs relative group shrink-0"
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
          className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
            userPermission === 'EDIT'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : userPermission === 'COMMENT'
              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
          }`}
        >
          <Shield size={13} className="shrink-0" />
          <span className="hidden sm:inline">{userPermission || 'EDIT'}</span>
        </button>

        {/* Comments Drawer Button */}
        <button
          onClick={onOpenComments}
          title="Open Comments Thread"
          className="relative flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
        >
          <MessageSquare size={14} className="text-slate-500 shrink-0" />
          <span className="hidden md:inline">Comments</span>
          {commentsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-bold">
              {commentsCount}
            </span>
          )}
        </button>

        {/* Version History Button */}
        <button
          onClick={onOpenHistory}
          title="Version History & Snapshots"
          className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
        >
          <History size={14} className="text-slate-500 shrink-0" />
          <span className="hidden md:inline">History</span>
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            title="Export Document"
            className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors bg-white shadow-xs"
          >
            <Download size={14} className="text-slate-500 shrink-0" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown size={12} className="text-slate-400 shrink-0" />
          </button>

          {exportOpen && (
            <>
              {/* Transparent backdrop to close dropdown on click outside */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setExportOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5 animate-in fade-in duration-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Export As
              </div>

              <button
                onClick={() => {
                  if (onExport) onExport('pdf');
                  setExportOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
              >
                <span className="text-rose-600 font-bold text-[11px] w-7">PDF</span>
                <span>PDF Document (.pdf)</span>
              </button>

              <button
                onClick={() => {
                  if (onExport) onExport('word');
                  setExportOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
              >
                <span className="text-blue-600 font-bold text-[11px] w-7">DOC</span>
                <span>Word Document (.doc)</span>
              </button>

              <button
                onClick={() => {
                  if (onExport) onExport('xml');
                  setExportOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
              >
                <span className="text-emerald-600 font-bold text-[11px] w-7">XML</span>
                <span>XML Document (.xml)</span>
              </button>

              <button
                onClick={() => {
                  if (onExport) onExport('html');
                  setExportOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
              >
                <span className="text-amber-600 font-bold text-[11px] w-7">HTML</span>
                <span>HTML Webpage (.html)</span>
              </button>

              <button
                onClick={() => {
                  if (onExport) onExport('markdown');
                  setExportOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
              >
                <span className="text-purple-600 font-bold text-[11px] w-7">MD</span>
                <span>Markdown (.md)</span>
              </button>

              <button
                onClick={() => {
                  if (onExport) onExport('csv');
                  setExportOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
              >
                <span className="text-emerald-600 font-bold text-[11px] w-7">XLS</span>
                <span>Excel Spreadsheet (.csv)</span>
              </button>

              <button
                onClick={() => {
                  if (onExport) onExport('presentation');
                  setExportOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors text-left"
              >
                <span className="text-amber-600 font-bold text-[11px] w-7">PPT</span>
                <span>PowerPoint Deck (.pdf)</span>
              </button>
            </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

