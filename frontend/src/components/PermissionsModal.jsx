'use client';

import React from 'react';
import {
  X,
  Shield,
  Check,
  User,
  Eye,
  MessageSquare,
  Edit3
} from 'lucide-react';

const ROLES = [
  {
    key: 'EDIT',
    label: 'Can Edit',
    desc: 'Full access to edit document text and canvas objects.',
    icon: Edit3,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    key: 'COMMENT',
    label: 'Can Comment',
    desc: 'Can read and add comments; text editing is disabled.',
    icon: MessageSquare,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  {
    key: 'VIEW',
    label: 'Can View',
    desc: 'Read-only access. Cannot edit or add comments.',
    icon: Eye,
    color: 'text-slate-700 bg-slate-50 border-slate-200',
  },
];

export default function PermissionsModal({
  isOpen,
  onClose,
  users,
  permissions,
  onUpdatePermission,
}) {
  if (!isOpen) return null;

  const getUserPermission = (userId) => {
    const perm = permissions.find((p) => p.userId === userId);
    return perm?.role || 'EDIT'; // default EDIT
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-blue-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-800">Document Access & Permissions</h3>
              <p className="text-[11px] text-slate-500">Manage granular roles (View, Comment, Edit)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Member Permissions List */}
        <div className="p-4 space-y-3">
          {users.map((u) => {
            const currentRole = getUserPermission(u.id);

            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                    style={{ backgroundColor: u.color || '#3b82f6' }}
                  >
                    {u.name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-xs text-slate-800 block truncate">{u.name}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{u.email}</span>
                  </div>
                </div>

                {/* Role Selector Dropdown */}
                <select
                  value={currentRole}
                  onChange={(e) => onUpdatePermission(u.id, e.target.value)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="EDIT">Can Edit (Full)</option>
                  <option value="COMMENT">Can Comment</option>
                  <option value="VIEW">Can View (Read-Only)</option>
                </select>
              </div>
            );
          })}
        </div>

        {/* Informative Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 space-y-1">
          <div className="font-bold text-slate-700">Access Matrix:</div>
          <div>• <strong>Edit:</strong> Can edit document blocks, type, and create canvas notes.</div>
          <div>• <strong>Comment:</strong> Can view content and submit comments on text highlights.</div>
          <div>• <strong>View:</strong> Strict read-only mode for evaluators or clients.</div>
        </div>
      </div>
    </div>
  );
}
