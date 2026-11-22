'use client';

import React, { useState } from 'react';
import {
  X,
  Shield,
  UserPlus,
  Lock,
  Trash2
} from 'lucide-react';

const PALETTE = [
  '#3b82f6', // Sapphire Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber Orange
  '#ec4899', // Rose Pink
  '#8b5cf6', // Violet Purple
  '#06b6d4', // Cyan
  '#f97316', // Bright Orange
];

export default function PermissionsModal({
  isOpen,
  onClose,
  users,
  permissions,
  currentUser,
  onUpdatePermission,
  onAddMember,
  onRemoveMember,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('EDIT');
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'ADMIN';

  const getUserPermission = (userId) => {
    const perm = permissions.find((p) => p.userId === userId);
    return perm?.role || 'EDIT'; // default EDIT
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Permission denied. Only Administrators can add new members.');
      return;
    }
    if (!newName.trim() || !newEmail.trim()) return;
    setLoading(true);
    try {
      if (onAddMember) {
        await onAddMember({
          name: newName.trim(),
          email: newEmail.trim(),
          role: newRole,
          color: selectedColor,
        });
      }
      setNewName('');
      setNewEmail('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
              <Shield size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-800">Team Members & Access Control</h3>
                {isAdmin ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    Admin Active
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                    <Lock size={10} /> View Only
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {isAdmin
                  ? 'You have Administrator authority to manage permissions, invite, and remove members.'
                  : 'Only Administrators can grant permissions (Edit/Comment/View) or add/remove members.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Bar: Member Count & Add Member Button */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            {users.length} Member{users.length === 1 ? '' : 's'} in workspace
          </span>
          {isAdmin ? (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              <UserPlus size={13} />
              <span>+ Add New Member</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-md">
              <Lock size={11} />
              <span>Admin required to add members</span>
            </div>
          )}
        </div>

        {/* Add Member Form Drawer (Admin Only) */}
        {isAdmin && showAddForm && (
          <form onSubmit={handleCreateMember} className="p-4 bg-blue-50/60 border-b border-blue-200 space-y-3">
            <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <UserPlus size={14} />
              Invite / Register New Collaborator
            </h4>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Full Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Sarah Connor"
                className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 shadow-xs"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. sarah@syncspace.io"
                className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 shadow-xs"
                required
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Initial Document Permission</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-500 font-medium"
                >
                  <option value="EDIT">Can Edit (Full Access)</option>
                  <option value="COMMENT">Can Comment</option>
                  <option value="VIEW">Can View (Read-Only)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cursor Color</label>
                <div className="flex items-center gap-1 mt-1">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-full border transition-transform ${
                        selectedColor === c ? 'scale-125 border-slate-900 ring-2 ring-blue-400' : 'border-white'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !newName.trim() || !newEmail.trim()}
                className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-md shadow-xs hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        )}

        {/* Member Permissions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {users.map((u) => {
            const currentRole = getUserPermission(u.id);
            const isUserAdminRole = u.role === 'ADMIN';
            const isSelf = u.id === currentUser?.id;

            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-colors"
              >
                {/* User Avatar & Details */}
                <div className="flex items-center gap-2.5 min-w-0 mr-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                    style={{ backgroundColor: u.color || '#3b82f6' }}
                  >
                    {u.name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-800 truncate">{u.name}</span>
                      {isSelf && (
                        <span className="text-[9px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.2 rounded">
                          You
                        </span>
                      )}
                      {isUserAdminRole && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">{u.email}</span>
                  </div>
                </div>

                {/* Right Actions: Role Selector & Remove Button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Role Selector: Interactive for Admin, Locked for non-Admin */}
                  {isAdmin ? (
                    <select
                      value={currentRole}
                      onChange={(e) => onUpdatePermission(u.id, e.target.value)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      title="Set document permission"
                    >
                      <option value="EDIT">Can Edit</option>
                      <option value="COMMENT">Can Comment</option>
                      <option value="VIEW">Can View</option>
                    </select>
                  ) : (
                    <div
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200"
                      title="Only Administrators can modify member permissions"
                    >
                      <Lock size={11} className="text-slate-400" />
                      <span>{currentRole === 'EDIT' ? 'Can Edit' : currentRole === 'COMMENT' ? 'Can Comment' : 'Can View'}</span>
                    </div>
                  )}

                  {/* Remove Member Button (Admin Only) */}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to remove ${u.name} from the workspace?`)) {
                          if (onRemoveMember) onRemoveMember(u.id);
                        }
                      }}
                      disabled={isSelf}
                      title={isSelf ? 'Cannot remove yourself' : `Remove ${u.name} from workspace`}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Informative Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 space-y-1">
          <div className="font-bold text-slate-700 flex items-center gap-1.5">
            <Shield size={12} className="text-blue-600" />
            <span>Administrator RBAC Security:</span>
          </div>
          <div>• <strong>Permissions:</strong> Only Admins can assign <em>Can Edit</em>, <em>Can Comment</em>, or <em>Can View</em>.</div>
          <div>• <strong>Membership:</strong> Only Admins can invite new team members or remove existing members.</div>
        </div>
      </div>
    </div>
  );
}
