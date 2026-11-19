'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Move,
  MousePointer2
} from 'lucide-react';

const COLORS = [
  { label: 'Yellow', bg: '#fef08a', border: '#fde047', text: '#854d0e' },
  { label: 'Peach', bg: '#fed7aa', border: '#fdba74', text: '#9a3412' },
  { label: 'Sky', bg: '#bae6fd', border: '#7dd3fc', text: '#0369a1' },
  { label: 'Pink', bg: '#fbcfe8', border: '#f472b6', text: '#9d174d' },
  { label: 'Mint', bg: '#bbf7d0', border: '#86efac', text: '#166534' },
];

export default function CollaborativeCanvas({
  yDoc,
  provider,
  currentUser,
  userPermission,
  initialData,
}) {
  const containerRef = useRef(null);
  const [notes, setNotes] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [draggingNoteId, setDraggingNoteId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const isReadOnly = userPermission === 'VIEW';

  // 1. Bind Notes to Yjs Y.Map for CRDT Sync
  useEffect(() => {
    if (!yDoc) return;
    const yCanvas = yDoc.getMap('canvas_items');

    const updateNotesFromYjs = () => {
      const items = [];
      yCanvas.forEach((value, key) => {
        items.push({ id: key, ...value });
      });

      if (items.length === 0 && initialData) {
        try {
          const parsed = typeof initialData === 'string' ? JSON.parse(initialData) : initialData;
          if (Array.isArray(parsed) && parsed.length > 0) {
            yDoc.transact(() => {
              parsed.forEach((item) => {
                yCanvas.set(item.id, {
                  text: item.text,
                  x: item.x,
                  y: item.y,
                  color: item.color || '#fef08a',
                  type: item.type || 'sticky',
                  author: currentUser?.name || 'Peer',
                });
              });
            });
            return;
          }
        } catch (e) {}
      }

      setNotes(items);
    };

    yCanvas.observe(updateNotesFromYjs);
    updateNotesFromYjs();

    return () => {
      yCanvas.unobserve(updateNotesFromYjs);
    };
  }, [yDoc, initialData]);

  // 2. Track Real-Time Cursor Presence on Canvas
  useEffect(() => {
    if (!provider || !provider.awareness) return;

    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const cursors = {};
      states.forEach((state, clientID) => {
        if (clientID !== provider.awareness.clientID && state.canvasCursor && state.user) {
          cursors[clientID] = {
            ...state.canvasCursor,
            user: state.user,
          };
        }
      });
      setRemoteCursors(cursors);
    };

    provider.awareness.on('change', handleAwarenessChange);
    return () => {
      provider.awareness.off('change', handleAwarenessChange);
    };
  }, [provider]);

  // Pointer movement on canvas broadcasts coordinates to peers
  const handlePointerMove = (clientX, clientY) => {
    if (!containerRef.current || !provider || !provider.awareness) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Broadcast live cursor
    provider.awareness.setLocalStateField('canvasCursor', { x, y });

    // Handle dragging note
    if (draggingNoteId && !isReadOnly) {
      const yCanvas = yDoc.getMap('canvas_items');
      const current = yCanvas.get(draggingNoteId);
      if (current) {
        yCanvas.set(draggingNoteId, {
          ...current,
          x: Math.max(10, x - dragOffset.x),
          y: Math.max(10, y - dragOffset.y),
        });
      }
    }
  };

  const handleMouseMove = (e) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    handlePointerMove(touch.clientX, touch.clientY);
  };

  const handleMouseUp = () => {
    setDraggingNoteId(null);
  };

  const handleStartDrag = (clientX, clientY, currentTarget, note) => {
    if (isReadOnly) return;
    setDraggingNoteId(note.id);
    const rect = currentTarget.getBoundingClientRect();
    setDragOffset({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  };

  const handleAddNote = (colorObj = COLORS[0]) => {
    if (isReadOnly || !yDoc) return;
    const yCanvas = yDoc.getMap('canvas_items');
    const newId = `note-${Date.now()}`;
    const newNote = {
      text: 'New collaborative sticky note. Type your thoughts here...',
      x: Math.floor(Math.random() * 300) + 100,
      y: Math.floor(Math.random() * 200) + 80,
      color: colorObj.bg,
      type: 'sticky',
      author: currentUser?.name || 'Anonymous',
    };
    yCanvas.set(newId, newNote);
  };

  const handleUpdateNoteText = (noteId, newText) => {
    if (isReadOnly || !yDoc) return;
    const yCanvas = yDoc.getMap('canvas_items');
    const current = yCanvas.get(noteId);
    if (current) {
      yCanvas.set(noteId, { ...current, text: newText });
    }
  };

  const handleDeleteNote = (noteId) => {
    if (isReadOnly || !yDoc) return;
    const yCanvas = yDoc.getMap('canvas_items');
    yCanvas.delete(noteId);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      onTouchCancel={handleMouseUp}
      className="flex-1 relative h-full w-full bg-slate-50 overflow-hidden select-none"
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Top Floating Toolbar */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-6 z-20 flex items-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-md p-1.5 sm:p-2 rounded-xl shadow-md border border-slate-200">
        <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase px-1 sm:px-2">
          <span className="hidden sm:inline">Figma Sticky Canvas</span>
          <span className="sm:hidden">Canvas</span>
        </span>
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c.label}
              onClick={() => handleAddNote(c)}
              disabled={isReadOnly}
              title={`Add ${c.label} Sticky Note`}
              style={{ backgroundColor: c.bg, borderColor: c.border }}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md border shadow-xs hover:scale-110 transition-transform flex items-center justify-center text-slate-700 disabled:opacity-50"
            >
              <Plus size={12} />
            </button>
          ))}
        </div>
      </div>

      {/* Render Peer Remote Cursors on Canvas */}
      {Object.entries(remoteCursors).map(([clientId, cursor]) => (
        <div
          key={clientId}
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            transition: 'transform 80ms ease-out',
          }}
          className="absolute top-0 left-0 pointer-events-none z-40 flex items-center gap-1"
        >
          <MousePointer2
            size={18}
            fill={cursor.user?.color || '#3b82f6'}
            stroke="#ffffff"
            strokeWidth={1.5}
            className="-rotate-45 drop-shadow-sm"
          />
          <span
            style={{ backgroundColor: cursor.user?.color || '#3b82f6' }}
            className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"
          >
            {cursor.user?.name || 'Peer'}
          </span>
        </div>
      ))}

      {/* Render Notes & Cards */}
      {notes.map((note) => (
        <div
          key={note.id}
          style={{
            left: `${note.x}px`,
            top: `${note.y}px`,
            backgroundColor: note.color || '#fef08a',
          }}
          className="absolute w-44 sm:w-56 min-h-[120px] sm:min-h-[140px] p-2.5 sm:p-3 rounded-xl shadow-lg border border-black/10 flex flex-col justify-between transition-shadow hover:shadow-xl cursor-default group"
        >
          {/* Note Drag Bar */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              handleStartDrag(e.clientX, e.clientY, e.currentTarget, note);
            }}
            onTouchStart={(e) => {
              if (e.touches && e.touches.length > 0) {
                e.stopPropagation();
                handleStartDrag(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget, note);
              }
            }}
            className="flex items-center justify-between pb-1 border-b border-black/10 cursor-move touch-none"
          >
            <div className="flex items-center gap-1 text-[11px] font-bold text-black/60 truncate">
              <Move size={11} />
              <span>{note.author || 'Sticky Note'}</span>
            </div>
            {!isReadOnly && (
              <button
                onClick={() => handleDeleteNote(note.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-black/40 hover:text-rose-600 rounded transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {/* Editable Text Area */}
          <textarea
            value={note.text || ''}
            onChange={(e) => handleUpdateNoteText(note.id, e.target.value)}
            disabled={isReadOnly}
            placeholder="Type note content..."
            className="w-full flex-1 bg-transparent border-none outline-none resize-none text-xs text-slate-800 leading-relaxed mt-2"
          />

          <div className="text-[9px] text-black/40 text-right pt-1 font-mono">
            Synced via Y.Map
          </div>
        </div>
      ))}
    </div>
  );
}

