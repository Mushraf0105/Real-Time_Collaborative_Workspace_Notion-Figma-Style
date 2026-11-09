'use client';

import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  CheckCircle2,
  CornerDownRight,
  Send,
  Quote
} from 'lucide-react';

export default function CommentsDrawer({
  isOpen,
  onClose,
  comments,
  onAddComment,
  onToggleResolve,
  currentUser,
  pendingSelection,
}) {
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState('open'); // 'open' | 'resolved'

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment({
      content: commentText.trim(),
      selectedText: pendingSelection?.text || null,
      position: pendingSelection?.position || null,
    });
    setCommentText('');
  };

  const filteredComments = comments.filter((c) =>
    activeTab === 'open' ? !c.isResolved : c.isResolved
  );

  return (
    <div className="w-80 h-full border-l border-slate-200 bg-white flex flex-col justify-between shadow-xl z-30 select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-blue-600" />
          <h3 className="font-bold text-sm text-slate-800">Comments & Reviews</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-4 pt-2 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('open')}
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === 'open'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Open ({comments.filter((c) => !c.isResolved).length})
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === 'resolved'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Resolved ({comments.filter((c) => c.isResolved).length})
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredComments.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            No {activeTab} comments. Highlight text and click "Comment" to start a discussion!
          </div>
        ) : (
          filteredComments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded-xl border text-xs transition-all ${
                comment.isResolved
                  ? 'bg-slate-50 border-slate-200 opacity-70'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              {/* Quoted Text if present */}
              {comment.selectedText && (
                <div className="mb-2 pl-2 border-l-2 border-blue-400 text-slate-500 italic bg-blue-50/50 py-1 pr-1 rounded-r text-[11px] truncate">
                  "{comment.selectedText}"
                </div>
              )}

              {/* Author & Header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[10px]"
                    style={{ backgroundColor: comment.author?.color || '#3b82f6' }}
                  >
                    {comment.author?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="font-bold text-slate-800">{comment.author?.name}</span>
                </div>
                <button
                  onClick={() => onToggleResolve(comment.id, !comment.isResolved)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    comment.isResolved
                      ? 'text-slate-500 hover:text-blue-600'
                      : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                  title={comment.isResolved ? 'Reopen Thread' : 'Mark as Resolved'}
                >
                  <CheckCircle2 size={12} />
                  <span>{comment.isResolved ? 'Reopen' : 'Resolve'}</span>
                </button>
              </div>

              {/* Content */}
              <p className="text-slate-700 leading-relaxed">{comment.content}</p>

              <div className="mt-2 text-[10px] text-slate-400">
                {new Date(comment.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Comment Input Box */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-slate-50/80">
        {pendingSelection && (
          <div className="mb-2 flex items-center justify-between bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg text-[11px] text-blue-700">
            <span className="truncate">Replying to: "{pendingSelection.text}"</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 shadow-xs"
          />
          <button
            type="submit"
            disabled={!commentText.trim()}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors shadow-xs"
          >
            <Send size={13} />
          </button>
        </div>
      </form>
    </div>
  );
}

