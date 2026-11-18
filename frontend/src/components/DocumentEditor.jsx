'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table as TableIcon,
  MessageSquarePlus,
  Lock
} from 'lucide-react';

export default function DocumentEditor({
  yDoc,
  provider,
  currentUser,
  userPermission,
  onCommentSelection,
  onEditorReady,
}) {
  const isReadOnly = userPermission === 'VIEW' || userPermission === 'COMMENT';

  const editor = useEditor(
    {
      editable: !isReadOnly,
      extensions: [
        StarterKit.configure({
          history: false, // Yjs handles history through CRDT state vectors
        }),
        Collaboration.configure({
          document: yDoc,
        }),
        CollaborationCursor.configure({
          provider: provider,
          user: {
            name: currentUser?.name || 'Anonymous Peer',
            color: currentUser?.color || '#3b82f6',
          },
        }),
        Placeholder.configure({
          placeholder: 'Type "/" for commands or start typing your collaborative document...',
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      editorProps: {
        attributes: {
          class: 'prose prose-slate max-w-none focus:outline-none min-h-[400px] sm:min-h-[600px] px-2 sm:px-6 py-2 sm:py-6 break-words min-w-0',
        },
      },
    },
    [yDoc, provider]
  );

  // Pass editor instance to parent for export & inspection
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Update awareness when current user changes
  useEffect(() => {
    if (provider && provider.awareness && currentUser) {
      provider.awareness.setLocalStateField('user', {
        name: currentUser.name,
        color: currentUser.color,
        id: currentUser.id,
      });
    }
  }, [provider, currentUser]);

  // Update editable mode when permissions change
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly);
    }
  }, [editor, isReadOnly]);

  const handleAddCommentFromSelection = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (selectedText && selectedText.trim().length > 0) {
      onCommentSelection(selectedText, { from, to });
    } else {
      onCommentSelection('Document Section', null);
    }
  };

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
        Connecting to collaborative Yjs document...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
      {/* Read-Only Warning Banner */}
      {isReadOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-xs font-medium text-amber-800">
          <Lock size={13} className="text-amber-600" />
          <span>
            {userPermission === 'VIEW'
              ? 'Viewing Mode (Read-Only) — You do not have edit permissions on this document.'
              : 'Commenter Mode — You can highlight text to add comments, but document editing is restricted.'}
          </span>
        </div>
      )}

      {/* Formatting Toolbar */}
      {!isReadOnly && (
        <div className="border-b border-slate-200 px-2 sm:px-6 py-1.5 sm:py-2 flex items-center gap-1 bg-slate-50/70 select-none overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-slate-200 shrink-0 transition-colors ${
              editor.isActive('bold') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-slate-200 shrink-0 transition-colors ${
              editor.isActive('italic') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded hover:bg-slate-200 shrink-0 transition-colors ${
              editor.isActive('code') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Inline Code"
          >
            <Code size={15} />
          </button>

          <span className="w-px h-5 bg-slate-300 mx-0.5 sm:mx-1 shrink-0" />

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-slate-200 shrink-0 transition-colors ${
              editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Heading 1"
          >
            <Heading1 size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-slate-200 shrink-0 transition-colors ${
              editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Heading 2"
          >
            <Heading2 size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-slate-200 shrink-0 transition-colors ${
              editor.isActive('heading', { level: 3 }) ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Heading 3"
          >
            <Heading3 size={15} />
          </button>

          <span className="w-px h-5 bg-slate-300 mx-0.5 sm:mx-1 shrink-0" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-slate-200 shrink-0 transition-colors ${
              editor.isActive('bulletList') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Bullet List"
          >
            <List size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-slate-200 shrink-0 transition-colors ${
              editor.isActive('orderedList') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Numbered List"
          >
            <ListOrdered size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded hover:bg-slate-200 shrink-0 transition-colors ${
              editor.isActive('taskList') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Task List"
          >
            <CheckSquare size={15} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded hover:bg-slate-200 shrink-0 transition-colors ${
              editor.isActive('blockquote') ? 'bg-slate-200 text-blue-600' : 'text-slate-600'
            }`}
            title="Blockquote"
          >
            <Quote size={15} />
          </button>

          <span className="w-px h-5 bg-slate-300 mx-0.5 sm:mx-1 shrink-0" />

          <button
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 shrink-0 transition-colors"
            title="Insert Table (3x3)"
          >
            <TableIcon size={15} />
          </button>

          <span className="w-px h-5 bg-slate-300 mx-0.5 sm:mx-1 shrink-0" />

          {/* Add Comment to Selected Text */}
          <button
            onClick={handleAddCommentFromSelection}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold shrink-0 transition-colors ml-2 sm:ml-auto"
            title="Comment on Selection"
          >
            <MessageSquarePlus size={14} />
            <span>Comment</span>
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto p-2 sm:px-4 sm:py-8 flex justify-center min-w-0">
        <div className="w-full max-w-4xl bg-white min-h-[500px] sm:min-h-[700px] shadow-xs rounded-xl border border-slate-100 p-3 sm:p-6 md:p-8 min-w-0">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

