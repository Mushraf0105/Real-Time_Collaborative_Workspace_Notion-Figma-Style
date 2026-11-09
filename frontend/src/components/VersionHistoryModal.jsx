'use client';

import React, { useState } from 'react';
import {
  X,
  History,
  RotateCcw,
  Plus,
  Calendar,
  User,
  CheckCircle2,
  FileClock
} from 'lucide-react';

export default function VersionHistoryModal({
  isOpen,
  onClose,
  snapshots,
  onCreateSnapshot,
  onRollback,
  currentUser,
}) {
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateSnapshot({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
    });
    setNewTitle('');
    setNewDescription('');
    setShowCreateForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History size={18} className="text-blue-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-800">Document Version History</h3>
              <p className="text-[11px] text-slate-500">Immutable snapshot revisions & rollback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Snapshot Action Bar */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-600">
            {snapshots.length} Snapshot{snapshots.length === 1 ? '' : 's'} recorded
          </span>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Plus size={13} />
            <span>Create Snapshot</span>
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <form onSubmit={handleCreate} className="p-4 border-b border-slate-200 bg-blue-50/50 space-y-2">
            <h4 className="text-xs font-bold text-blue-900">Create New Version Snapshot</h4>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Version title (e.g. v1.2 Post Design Review)"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 shadow-xs"
              required
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional summary of changes..."
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 shadow-xs"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-md shadow-xs hover:bg-blue-700"
              >
                Save Snapshot
              </button>
            </div>
          </form>
        )}

        {/* Timeline of Snapshots */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {snapshots.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No snapshots saved yet. Click "Create Snapshot" above to save the current version!
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs flex items-center justify-between"
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[10px] font-bold">
                      v{snap.version}
                    </span>
                    <h5 className="font-bold text-xs text-slate-800">{snap.title}</h5>
                  </div>
                  {snap.description && (
                    <p className="text-[11px] text-slate-600">{snap.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1">
                      <User size={11} />
                      {snap.creator?.name || 'Collaborator'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(snap.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Rollback Button */}
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Rollback to "${snap.title}"? Current document content will be rewound to this state.`
                      )
                    ) {
                      onRollback(snap.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors shrink-0"
                  title="Restore this version"
                >
                  <RotateCcw size={13} />
                  <span>Restore</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

