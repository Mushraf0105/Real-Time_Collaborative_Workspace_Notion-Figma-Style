'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Presentation,
  Play,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Layout,
  Palette,
  Sparkles,
  Download,
  X,
  Quote,
  CheckCircle2
} from 'lucide-react';

const THEMES = [
  { id: 'slate', name: 'Modern Slate', bg: 'from-slate-900 to-slate-800', text: 'text-white', subtext: 'text-slate-300', accent: 'bg-blue-600', border: 'border-slate-700' },
  { id: 'ocean', name: 'Deep Ocean', bg: 'from-cyan-900 via-blue-900 to-slate-950', text: 'text-white', subtext: 'text-cyan-200', accent: 'bg-cyan-500', border: 'border-cyan-800' },
  { id: 'sunset', name: 'Sunset Glow', bg: 'from-purple-950 via-slate-900 to-rose-950', text: 'text-white', subtext: 'text-rose-200', accent: 'bg-rose-500', border: 'border-purple-800' },
  { id: 'forest', name: 'Emerald Forest', bg: 'from-emerald-950 via-slate-900 to-teal-950', text: 'text-white', subtext: 'text-emerald-200', accent: 'bg-emerald-500', border: 'border-emerald-800' },
  { id: 'light', name: 'Clean White', bg: 'from-slate-50 to-white', text: 'text-slate-900', subtext: 'text-slate-600', accent: 'bg-blue-600', border: 'border-slate-200' },
];

const SAMPLE_PITCH_DECK = [
  {
    id: 'slide-1',
    layout: 'title',
    theme: 'slate',
    title: 'SyncSpace 2.0',
    subtitle: 'The All-in-One Real-Time Collaborative Workspace',
    notes: 'Welcome stakeholders. Introduce vision of combining Notion, Figma, Excel, and PowerPoint in one unified real-time CRDT space.',
    bullets: ['Mathematical CRDT Convergence', 'Zero-Latency WebSocket Mesh', 'Unified Documents, Whiteboard, Sheets & Slides'],
    metric: '',
    metricLabel: '',
  },
  {
    id: 'slide-2',
    layout: 'bullets',
    theme: 'ocean',
    title: 'Key Product Pillars',
    subtitle: 'Four essential workplace workflows unified in one platform',
    notes: 'Cover the four core pillars: Notion Docs, Figma Canvas, Excel Spreadsheets, and PowerPoint Slides.',
    bullets: [
      'Notion-Style WYSIWYG block documents powered by TipTap and Yjs',
      'Figma-Style 2D infinite sticky note whiteboard with live cursors',
      'Excel-Style spreadsheet grid with real-time formula computation',
      'PowerPoint-Style presentation decks with presenter mode & export'
    ],
    metric: '',
    metricLabel: '',
  },
  {
    id: 'slide-3',
    layout: 'metric',
    theme: 'sunset',
    title: 'Benchmarked Performance',
    subtitle: 'Stress-tested with 50 concurrent virtual peers',
    notes: 'Highlight sub-millisecond p99 latency and 1,720+ operations per second throughput.',
    bullets: ['Sub-millisecond p50 and p99 latency', 'Automatic Redis Pub/Sub cluster scaling', '100% cryptographic state vector convergence'],
    metric: '1,724 ops/sec',
    metricLabel: 'Peer-to-Peer CRDT Throughput with Zero Conflicts',
  },
  {
    id: 'slide-4',
    layout: 'comparison',
    theme: 'forest',
    title: 'Unified Architecture vs Legacy Tools',
    subtitle: 'Why a single real-time CRDT engine outperforms fragmented toolchains',
    notes: 'Explain friction of switching between 4 different apps vs single unified document workspace.',
    bullets: [
      'Single Yjs state vector across all 4 modes',
      'Zero context switching between text, canvas, tables, and slides',
      'Unified version history, rollbacks, and team permission controls'
    ],
    metric: '',
    metricLabel: '',
  },
  {
    id: 'slide-5',
    layout: 'quote',
    theme: 'slate',
    title: 'Next-Generation Collaboration',
    subtitle: 'Designed for high-velocity distributed engineering teams',
    notes: 'Final closing remarks and opening for Q&A.',
    bullets: ['Alice Cooper — Lead Architect', 'SyncSpace Innovation Lab'],
    metric: '',
    metricLabel: '',
  },
];

export default function CollaborativeSlides({
  yDoc,
  provider,
  currentUser,
  userPermission,
  onExportSlides,
}) {
  const isReadOnly = userPermission === 'VIEW';

  const [slides, setSlides] = useState([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [remotePresenters, setRemotePresenters] = useState({});

  // 1. Bind to Yjs Y.Map('slides_data')
  useEffect(() => {
    if (!yDoc) return;
    const ySlides = yDoc.getMap('slides_data');

    const handleYjsUpdate = () => {
      const stored = ySlides.get('deck');
      if (Array.isArray(stored) && stored.length > 0) {
        setSlides(stored);
      } else {
        // Start with a clean, blank slide so user enters data by self
        const initialBlankDeck = [
          {
            id: `slide-1`,
            layout: 'title',
            theme: 'slate',
            title: '',
            subtitle: '',
            notes: '',
            bullets: [],
            metric: '',
            metricLabel: '',
          },
        ];
        yDoc.transact(() => {
          ySlides.set('deck', initialBlankDeck);
        });
      }
    };

    ySlides.observe(handleYjsUpdate);
    handleYjsUpdate();

    return () => {
      ySlides.unobserve(handleYjsUpdate);
    };
  }, [yDoc]);

  // 2. Track Presentation Awareness
  useEffect(() => {
    if (!provider || !provider.awareness) return;

    const handleAwareness = () => {
      const states = provider.awareness.getStates();
      const peers = {};
      states.forEach((state, clientID) => {
        if (clientID !== provider.awareness.clientID && state.slideIndex !== undefined && state.user) {
          peers[clientID] = {
            index: state.slideIndex,
            user: state.user,
          };
        }
      });
      setRemotePresenters(peers);
    };

    provider.awareness.on('change', handleAwareness);
    return () => {
      provider.awareness.off('change', handleAwareness);
    };
  }, [provider]);

  // Broadcast current slide index
  useEffect(() => {
    if (provider && provider.awareness) {
      provider.awareness.setLocalStateField('slideIndex', activeSlideIndex);
    }
  }, [activeSlideIndex, provider]);

  // Commit updated slides array to Yjs
  const commitSlides = useCallback(
    (newSlides) => {
      if (isReadOnly || !yDoc) return;
      setSlides(newSlides);
      const ySlides = yDoc.getMap('slides_data');
      yDoc.transact(() => {
        ySlides.set('deck', newSlides);
      });
    },
    [isReadOnly, yDoc]
  );

  // Update current slide property
  const updateCurrentSlide = (patch) => {
    if (isReadOnly || slides.length === 0) return;
    const updated = slides.map((s, idx) => (idx === activeSlideIndex ? { ...s, ...patch } : s));
    commitSlides(updated);
  };

  // Slide Deck Actions
  const handleAddSlide = () => {
    if (isReadOnly) return;
    const newSlide = {
      id: `slide-${Date.now()}`,
      layout: 'bullets',
      theme: 'slate',
      title: 'New Slide Title',
      subtitle: 'Add a supporting takeaway or description...',
      notes: '',
      bullets: ['Key takeaway point 1', 'Key takeaway point 2', 'Key takeaway point 3'],
      metric: '',
      metricLabel: '',
    };
    const updated = [...slides, newSlide];
    commitSlides(updated);
    setActiveSlideIndex(updated.length - 1);
  };

  const handleDuplicateSlide = (idx) => {
    if (isReadOnly) return;
    const target = slides[idx];
    const copy = { ...target, id: `slide-${Date.now()}`, title: `${target.title} (Copy)` };
    const updated = [...slides.slice(0, idx + 1), copy, ...slides.slice(idx + 1)];
    commitSlides(updated);
    setActiveSlideIndex(idx + 1);
  };

  const handleDeleteSlide = (idx) => {
    if (isReadOnly || slides.length <= 1) return;
    const updated = slides.filter((_, i) => i !== idx);
    commitSlides(updated);
    setActiveSlideIndex(Math.max(0, idx - 1));
  };

  // Keyboard Navigation in Presenter Mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPresenting) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setActiveSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        setIsPresenting(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresenting, slides.length]);

  const activeSlide = slides[activeSlideIndex] || slides[0] || {};
  const currentTheme = THEMES.find((t) => t.id === activeSlide.theme) || THEMES[0];

  // Printable presentation export
  const handlePrintExport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const slidesHtml = slides
      .map(
        (s, idx) => `
      <div class="slide-page">
        <div class="slide-num">Slide ${idx + 1} of ${slides.length}</div>
        <h1 class="slide-title">${s.title}</h1>
        <h3 class="slide-sub">${s.subtitle || ''}</h3>
        ${
          s.metric
            ? `<div class="slide-metric">${s.metric}<div class="slide-metric-lbl">${s.metricLabel || ''}</div></div>`
            : ''
        }
        <ul class="slide-bullets">
          ${(s.bullets || []).map((b) => `<li>${b}</li>`).join('')}
        </ul>
      </div>
    `
      )
      .join('');

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SyncSpace Slides Presentation</title>
        <style>
          @page { size: landscape; margin: 15mm; }
          body { font-family: -apple-system, Arial, sans-serif; margin: 0; color: #0f172a; }
          .slide-page { page-break-after: always; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; min-height: 500px; display: flex; flex-direction: column; justify-content: center; }
          .slide-num { font-size: 11pt; color: #94a3b8; font-weight: bold; margin-bottom: 20px; }
          .slide-title { font-size: 32pt; font-weight: 800; margin: 0 0 10px 0; color: #1e3a8a; }
          .slide-sub { font-size: 16pt; font-weight: 500; color: #475569; margin: 0 0 30px 0; }
          .slide-metric { font-size: 48pt; font-weight: 900; color: #2563eb; margin: 20px 0; }
          .slide-metric-lbl { font-size: 14pt; color: #64748b; font-weight: 600; margin-top: 6px; }
          .slide-bullets { font-size: 16pt; line-height: 1.8; color: #334155; }
        </style>
      </head>
      <body>
        ${slidesHtml}
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 select-none overflow-hidden">
      {/* 1. Top Presentation Toolbar */}
      <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-2 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          <Presentation size={18} className="text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            PowerPoint Deck
          </span>
          <span className="text-xs text-slate-400">
            ({slides.length} Slide{slides.length === 1 ? '' : 's'})
          </span>
        </div>

        {/* Layout & Theme Selectors */}
        <div className="flex items-center gap-2">
          {/* Layout Picker */}
          <div className="flex items-center gap-1 bg-slate-700/80 rounded-lg p-1">
            <Layout size={13} className="text-slate-400 ml-1" />
            <select
              value={activeSlide.layout || 'bullets'}
              onChange={(e) => updateCurrentSlide({ layout: e.target.value })}
              disabled={isReadOnly}
              className="bg-transparent text-xs text-white font-medium outline-none cursor-pointer pr-1"
            >
              <option value="title" className="bg-slate-800">Title Slide</option>
              <option value="bullets" className="bg-slate-800">Bullet Points</option>
              <option value="metric" className="bg-slate-800">Big Metric</option>
              <option value="comparison" className="bg-slate-800">Comparison</option>
              <option value="quote" className="bg-slate-800">Quote / Callout</option>
            </select>
          </div>

          {/* Theme Picker */}
          <div className="flex items-center gap-1 bg-slate-700/80 rounded-lg p-1">
            <Palette size={13} className="text-slate-400 ml-1" />
            <select
              value={activeSlide.theme || 'slate'}
              onChange={(e) => updateCurrentSlide({ theme: e.target.value })}
              disabled={isReadOnly}
              className="bg-transparent text-xs text-white font-medium outline-none cursor-pointer pr-1"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-800">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <span className="w-px h-5 bg-slate-700 mx-1 hidden sm:block" />

          {/* Present Slideshow Button */}
          <button
            onClick={() => setIsPresenting(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
            title="Start Fullscreen Presentation (F5)"
          >
            <Play size={13} fill="currentColor" />
            <span>Present</span>
          </button>

          {/* Load Sample Template */}
          <button
            onClick={() => {
              if (confirm('Load sample pitch deck template?')) {
                commitSlides(SAMPLE_PITCH_DECK);
              }
            }}
            disabled={isReadOnly}
            className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1.5 rounded-lg transition-colors"
            title="Load sample presentation pitch deck"
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">Load Template</span>
          </button>

          {/* Export Presentation */}
          <button
            onClick={handlePrintExport}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold transition-colors"
            title="Print / Save Slides Presentation to PDF"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* 2. Main Work Area: Left Thumbnails + Right Slide Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Thumbnails Strip */}
        <div className="w-44 sm:w-56 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
          {/* Thumbnails List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {slides.map((slide, idx) => {
              const isSelected = idx === activeSlideIndex;
              const theme = THEMES.find((t) => t.id === slide.theme) || THEMES[0];
              return (
                <div
                  key={slide.id || idx}
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`group relative rounded-xl p-2 cursor-pointer transition-all border-2 ${
                    isSelected
                      ? 'border-amber-400 bg-slate-800/80 shadow-lg'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  {/* Slide Mini Header */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold">Slide {idx + 1}</span>
                    <span className="uppercase text-[9px] text-slate-500">{slide.layout}</span>
                  </div>

                  {/* Thumbnail Preview Box */}
                  <div
                    className={`w-full aspect-video rounded-lg bg-gradient-to-br ${theme.bg} p-2 flex flex-col justify-center items-center text-center overflow-hidden border ${theme.border}`}
                  >
                    <span className="text-[10px] font-bold text-white truncate max-w-full">
                      {slide.title || 'Untitled'}
                    </span>
                    <span className="text-[8px] text-slate-400 truncate max-w-full">
                      {slide.subtitle || ''}
                    </span>
                  </div>

                  {/* Duplicate / Delete Slide Controls on Hover */}
                  {!isReadOnly && (
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-slate-900/90 rounded px-1 py-0.5 shadow transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSlide(idx);
                        }}
                        title="Duplicate Slide"
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Copy size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlide(idx);
                        }}
                        title="Delete Slide"
                        className="p-1 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Slide Button */}
          <div className="p-3 border-t border-slate-800">
            <button
              onClick={handleAddSlide}
              disabled={isReadOnly}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold transition-all disabled:opacity-50"
            >
              <Plus size={14} />
              <span>+ New Slide</span>
            </button>
          </div>
        </div>

        {/* Right Active Slide Stage */}
        <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
          {/* 16:9 Slide Canvas Frame */}
          <div
            className={`w-full max-w-4xl aspect-video rounded-2xl bg-gradient-to-br ${currentTheme.bg} border-2 ${currentTheme.border} shadow-2xl p-6 sm:p-12 flex flex-col justify-between relative overflow-hidden transition-all`}
          >
            {/* Top Badge & Slide Number */}
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${currentTheme.accent} text-white`}>
                SyncSpace Slide Deck
              </span>
              <span className="text-slate-400 font-mono">
                {activeSlideIndex + 1} / {slides.length}
              </span>
            </div>

            {/* Slide Layout Body */}
            <div className="flex-1 flex flex-col justify-center my-4">
              {/* 1. Title Slide Layout */}
              {activeSlide.layout === 'title' && (
                <div className="text-center space-y-4">
                  <input
                    type="text"
                    value={activeSlide.title || ''}
                    onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                    disabled={isReadOnly}
                    placeholder="Presentation Title"
                    className={`w-full text-center text-3xl sm:text-5xl font-extrabold bg-transparent border-none outline-none ${currentTheme.text} placeholder:text-slate-500`}
                  />
                  <input
                    type="text"
                    value={activeSlide.subtitle || ''}
                    onChange={(e) => updateCurrentSlide({ subtitle: e.target.value })}
                    disabled={isReadOnly}
                    placeholder="Subtitle or Presenter Name"
                    className={`w-full text-center text-base sm:text-xl font-medium bg-transparent border-none outline-none ${currentTheme.subtext} placeholder:text-slate-600`}
                  />
                </div>
              )}

              {/* 2. Bullets Layout */}
              {activeSlide.layout === 'bullets' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={activeSlide.title || ''}
                    onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                    disabled={isReadOnly}
                    placeholder="Slide Heading"
                    className={`w-full text-2xl sm:text-4xl font-extrabold bg-transparent border-none outline-none ${currentTheme.text} placeholder:text-slate-500`}
                  />
                  <input
                    type="text"
                    value={activeSlide.subtitle || ''}
                    onChange={(e) => updateCurrentSlide({ subtitle: e.target.value })}
                    disabled={isReadOnly}
                    placeholder="Key thesis statement..."
                    className={`w-full text-sm sm:text-base font-medium bg-transparent border-none outline-none ${currentTheme.subtext} mb-4`}
                  />

                  {/* Bullet Items */}
                  <div className="grid grid-cols-1 gap-2.5 pt-2">
                    {(activeSlide.bullets || []).map((bullet, bIdx) => (
                      <div
                        key={bIdx}
                        className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3"
                      >
                        <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                        <input
                          type="text"
                          value={bullet}
                          onChange={(e) => {
                            const newBullets = [...(activeSlide.bullets || [])];
                            newBullets[bIdx] = e.target.value;
                            updateCurrentSlide({ bullets: newBullets });
                          }}
                          disabled={isReadOnly}
                          className={`flex-1 text-sm sm:text-base bg-transparent border-none outline-none ${currentTheme.text}`}
                        />
                      </div>
                    ))}
                    {!isReadOnly && (
                      <button
                        onClick={() => {
                          const newBullets = [...(activeSlide.bullets || []), 'New key point'];
                          updateCurrentSlide({ bullets: newBullets });
                        }}
                        className="text-xs font-semibold text-amber-400 hover:text-amber-300 text-left pt-1"
                      >
                        + Add Bullet Point
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Metric Layout */}
              {activeSlide.layout === 'metric' && (
                <div className="text-center space-y-4">
                  <input
                    type="text"
                    value={activeSlide.title || ''}
                    onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                    disabled={isReadOnly}
                    placeholder="Slide Title"
                    className={`w-full text-center text-2xl sm:text-3xl font-extrabold bg-transparent border-none outline-none ${currentTheme.text}`}
                  />
                  {/* Big Number */}
                  <div className="py-2">
                    <input
                      type="text"
                      value={activeSlide.metric || '1,724 ops/sec'}
                      onChange={(e) => updateCurrentSlide({ metric: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full text-center text-5xl sm:text-7xl font-black bg-transparent border-none outline-none text-amber-400 drop-shadow-md"
                    />
                    <input
                      type="text"
                      value={activeSlide.metricLabel || 'High-Concurrency CRDT Throughput'}
                      onChange={(e) => updateCurrentSlide({ metricLabel: e.target.value })}
                      disabled={isReadOnly}
                      className={`w-full text-center text-sm sm:text-lg font-bold bg-transparent border-none outline-none ${currentTheme.subtext} mt-2`}
                    />
                  </div>
                </div>
              )}

              {/* 4. Comparison Layout */}
              {activeSlide.layout === 'comparison' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={activeSlide.title || ''}
                    onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                    disabled={isReadOnly}
                    className={`w-full text-2xl sm:text-3xl font-extrabold bg-transparent border-none outline-none ${currentTheme.text}`}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <h4 className="font-bold text-amber-400 text-sm mb-2">SyncSpace Hybrid</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Single document model unifying Notion rich text, Figma canvas, Excel spreadsheets, and PowerPoint slide decks with mathematical CRDT synchronization.
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <h4 className="font-bold text-slate-400 text-sm mb-2">Fragmented Tools</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Separate subscriptions, isolated permissions, high context switching, and frequent sync conflicts across disconnected apps.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Quote Layout */}
              {activeSlide.layout === 'quote' && (
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                  <Quote size={36} className="text-amber-400 mx-auto opacity-70" />
                  <textarea
                    value={activeSlide.title || ''}
                    onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                    disabled={isReadOnly}
                    rows={2}
                    className={`w-full text-center text-xl sm:text-3xl font-bold italic bg-transparent border-none outline-none resize-none ${currentTheme.text}`}
                  />
                  <input
                    type="text"
                    value={activeSlide.subtitle || ''}
                    onChange={(e) => updateCurrentSlide({ subtitle: e.target.value })}
                    disabled={isReadOnly}
                    className={`w-full text-center text-xs sm:text-sm font-semibold bg-transparent border-none outline-none ${currentTheme.subtext}`}
                  />
                </div>
              )}
            </div>

            {/* Slide Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10 pt-3">
              <span>SyncSpace Presentation Engine</span>
              <span>Press <strong>Present</strong> to launch slideshow</span>
            </div>
          </div>

          {/* Slide Presenter Notes Box */}
          <div className="w-full max-w-4xl mt-4 bg-slate-900 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Speaker Notes (Private to Presenter)
            </span>
            <textarea
              value={activeSlide.notes || ''}
              onChange={(e) => updateCurrentSlide({ notes: e.target.value })}
              disabled={isReadOnly}
              placeholder="Add personal speaking cues, talking points, or reminders here..."
              rows={2}
              className="w-full text-xs text-slate-300 bg-transparent border-none outline-none resize-none placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* 3. Fullscreen Presentation Modal */}
      {isPresenting && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-6 sm:p-12 animate-in fade-in duration-200 select-none">
          {/* Top Bar with Exit */}
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-white">Live Presentation Mode</span>
            </div>
            <button
              onClick={() => setIsPresenting(false)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5"
            >
              <X size={16} />
              <span>Exit (Esc)</span>
            </button>
          </div>

          {/* Slide Centered Stage */}
          <div className="flex-1 flex items-center justify-center my-4">
            <div
              className={`w-full max-w-5xl aspect-video rounded-3xl bg-gradient-to-br ${currentTheme.bg} border border-white/10 shadow-2xl p-8 sm:p-16 flex flex-col justify-between`}
            >
              <div className="text-right text-xs font-mono text-slate-400">
                {activeSlideIndex + 1} / {slides.length}
              </div>

              <div className="flex-1 flex flex-col justify-center">
                {activeSlide.layout === 'metric' ? (
                  <div className="text-center space-y-4">
                    <h2 className={`text-3xl sm:text-4xl font-extrabold ${currentTheme.text}`}>
                      {activeSlide.title}
                    </h2>
                    <div className="text-6xl sm:text-8xl font-black text-amber-400">
                      {activeSlide.metric}
                    </div>
                    <p className={`text-lg sm:text-xl font-bold ${currentTheme.subtext}`}>
                      {activeSlide.metricLabel}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h1 className={`text-4xl sm:text-6xl font-black ${currentTheme.text}`}>
                      {activeSlide.title}
                    </h1>
                    {activeSlide.subtitle && (
                      <p className={`text-xl sm:text-2xl font-medium ${currentTheme.subtext}`}>
                        {activeSlide.subtitle}
                      </p>
                    )}
                    {activeSlide.bullets && activeSlide.bullets.length > 0 && (
                      <ul className="space-y-3 pt-4">
                        {activeSlide.bullets.map((b, i) => (
                          <li key={i} className="flex items-center gap-3 text-lg sm:text-xl text-slate-200">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500 text-center">
                Use Left / Right arrow keys to navigate slides
              </div>
            </div>
          </div>

          {/* Bottom Presenter Controls */}
          <div className="flex items-center justify-between text-white text-xs max-w-5xl mx-auto w-full">
            <button
              onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
              disabled={activeSlideIndex === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <span className="font-mono font-bold text-sm">
              Slide {activeSlideIndex + 1} of {slides.length}
            </span>

            <button
              onClick={() => setActiveSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
              disabled={activeSlideIndex === slides.length - 1}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
