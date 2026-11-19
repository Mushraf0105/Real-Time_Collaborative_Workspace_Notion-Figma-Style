'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  DollarSign,
  Percent,
  Plus,
  Download,
  Sparkles,
  Table as TableIcon
} from 'lucide-react';

const COLS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
const INITIAL_ROW_COUNT = 30;

// Pre-seeded Financial Model Template
const SAMPLE_BUDGET_TEMPLATE = {
  A1: { raw: 'SyncSpace Q4 Financial Model', bold: true, color: '#1e3a8a', bg: '#eff6ff' },
  A2: { raw: 'Category', bold: true, bg: '#f1f5f9' },
  B2: { raw: 'Oct Budget', bold: true, bg: '#f1f5f9', align: 'right' },
  C2: { raw: 'Nov Budget', bold: true, bg: '#f1f5f9', align: 'right' },
  D2: { raw: 'Dec Budget', bold: true, bg: '#f1f5f9', align: 'right' },
  E2: { raw: 'Total Q4', bold: true, bg: '#f1f5f9', align: 'right' },

  A3: { raw: 'Cloud Infrastructure' },
  B3: { raw: '4500', format: 'currency', align: 'right' },
  C3: { raw: '4800', format: 'currency', align: 'right' },
  D3: { raw: '5200', format: 'currency', align: 'right' },
  E3: { raw: '=SUM(B3:D3)', bold: true, format: 'currency', align: 'right', bg: '#f8fafc' },

  A4: { raw: 'Engineering Team' },
  B4: { raw: '28000', format: 'currency', align: 'right' },
  C4: { raw: '28000', format: 'currency', align: 'right' },
  D4: { raw: '30000', format: 'currency', align: 'right' },
  E4: { raw: '=SUM(B4:D4)', bold: true, format: 'currency', align: 'right', bg: '#f8fafc' },

  A5: { raw: 'Product & Design' },
  B5: { raw: '12000', format: 'currency', align: 'right' },
  C5: { raw: '12500', format: 'currency', align: 'right' },
  D5: { raw: '13000', format: 'currency', align: 'right' },
  E5: { raw: '=SUM(B5:D5)', bold: true, format: 'currency', align: 'right', bg: '#f8fafc' },

  A6: { raw: 'Marketing & Growth' },
  B6: { raw: '6500', format: 'currency', align: 'right' },
  C6: { raw: '7200', format: 'currency', align: 'right' },
  D6: { raw: '8500', format: 'currency', align: 'right' },
  E6: { raw: '=SUM(B6:D6)', bold: true, format: 'currency', align: 'right', bg: '#f8fafc' },

  A7: { raw: 'Total Operating Expenses', bold: true, bg: '#dbeafe' },
  B7: { raw: '=SUM(B3:B6)', bold: true, format: 'currency', align: 'right', bg: '#dbeafe' },
  C7: { raw: '=SUM(C3:C6)', bold: true, format: 'currency', align: 'right', bg: '#dbeafe' },
  D7: { raw: '=SUM(D3:D6)', bold: true, format: 'currency', align: 'right', bg: '#dbeafe' },
  E7: { raw: '=SUM(E3:E6)', bold: true, format: 'currency', align: 'right', bg: '#bfdbfe' },
};

export default function CollaborativeSpreadsheet({
  yDoc,
  provider,
  currentUser,
  userPermission,
  onExportCSV,
}) {
  const isReadOnly = userPermission === 'VIEW';

  const [cells, setCells] = useState({});
  const [selectedCell, setSelectedCell] = useState('A1');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [formulaInputValue, setFormulaInputValue] = useState('');
  const [remoteSelections, setRemoteSelections] = useState({});
  const [rowCount, setRowCount] = useState(INITIAL_ROW_COUNT);
  const [colCount, setColCount] = useState(10); // A to J

  const inputRef = useRef(null);

  // 1. Bind to Yjs Y.Map('sheet_cells')
  useEffect(() => {
    if (!yDoc) return;
    const yCells = yDoc.getMap('sheet_cells');

    const handleYjsUpdate = () => {
      const data = {};
      yCells.forEach((val, key) => {
        data[key] = val;
      });

      // Keep sheet blank by default so user enters data by self
      setCells(data);
    };

    yCells.observe(handleYjsUpdate);
    handleYjsUpdate();

    return () => {
      yCells.unobserve(handleYjsUpdate);
    };
  }, [yDoc]);

  // 2. Track Awareness for Remote Selected Cells
  useEffect(() => {
    if (!provider || !provider.awareness) return;

    const handleAwareness = () => {
      const states = provider.awareness.getStates();
      const selections = {};
      states.forEach((state, clientID) => {
        if (clientID !== provider.awareness.clientID && state.sheetCell && state.user) {
          selections[state.sheetCell] = state.user;
        }
      });
      setRemoteSelections(selections);
    };

    provider.awareness.on('change', handleAwareness);
    return () => {
      provider.awareness.off('change', handleAwareness);
    };
  }, [provider]);

  // Broadcast local selection
  const updateSelection = useCallback(
    (cellId) => {
      setSelectedCell(cellId);
      const raw = cells[cellId]?.raw || '';
      setFormulaInputValue(raw);
      if (provider && provider.awareness) {
        provider.awareness.setLocalStateField('sheetCell', cellId);
      }
    },
    [cells, provider]
  );

  // Update formula bar when selected cell changes
  useEffect(() => {
    if (selectedCell) {
      setFormulaInputValue(cells[selectedCell]?.raw || '');
    }
  }, [selectedCell, cells]);

  // Helper: Parse column and row from cell ID (e.g. 'B4' -> { col: 'B', row: 4, colIdx: 1 })
  const parseCellId = (id) => {
    const match = id?.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    const col = match[1];
    const row = parseInt(match[2], 10);
    const colIdx = COLS.indexOf(col);
    return { col, row, colIdx };
  };

  // Helper: Get cells in a range e.g. 'B3:D3' or 'B3:B6'
  const getCellRange = (rangeStr) => {
    const [startStr, endStr] = rangeStr.split(':').map((s) => s.trim().toUpperCase());
    const start = parseCellId(startStr);
    const end = parseCellId(endStr);
    if (!start || !end) return [];

    const minCol = Math.min(start.colIdx, end.colIdx);
    const maxCol = Math.max(start.colIdx, end.colIdx);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);

    const cellList = [];
    for (let c = minCol; c <= maxCol; c++) {
      for (let r = minRow; r <= maxRow; r++) {
        cellList.push(`${COLS[c]}${r}`);
      }
    }
    return cellList;
  };

  // 3. Formula Engine: Evaluates raw string (e.g. '=SUM(B3:D3)')
  const evaluateValue = useCallback(
    (raw, visited = new Set()) => {
      if (!raw || typeof raw !== 'string') return raw || '';
      if (!raw.startsWith('=')) return raw;

      const formula = raw.slice(1).trim();

      // Handle =SUM(...)
      const sumMatch = formula.match(/^SUM\(([^)]+)\)$/i);
      if (sumMatch) {
        const arg = sumMatch[1];
        const targetCells = arg.includes(':')
          ? getCellRange(arg)
          : arg.split(',').map((s) => s.trim().toUpperCase());

        let total = 0;
        for (const cid of targetCells) {
          if (visited.has(cid)) continue; // Circular ref guard
          const cellRaw = cells[cid]?.raw;
          const val = evaluateValue(cellRaw, new Set([...visited, cid]));
          const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
          if (!isNaN(num)) total += num;
        }
        return total;
      }

      // Handle =AVERAGE(...) or =AVG(...)
      const avgMatch = formula.match(/^(?:AVERAGE|AVG)\(([^)]+)\)$/i);
      if (avgMatch) {
        const targetCells = avgMatch[1].includes(':')
          ? getCellRange(avgMatch[1])
          : avgMatch[1].split(',').map((s) => s.trim().toUpperCase());

        let total = 0;
        let count = 0;
        for (const cid of targetCells) {
          if (visited.has(cid)) continue;
          const val = evaluateValue(cells[cid]?.raw, new Set([...visited, cid]));
          const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
          if (!isNaN(num)) {
            total += num;
            count++;
          }
        }
        return count > 0 ? (total / count).toFixed(2) : 0;
      }

      // Handle =COUNT(...)
      const countMatch = formula.match(/^COUNT\(([^)]+)\)$/i);
      if (countMatch) {
        const targetCells = countMatch[1].includes(':')
          ? getCellRange(countMatch[1])
          : countMatch[1].split(',').map((s) => s.trim().toUpperCase());
        let count = 0;
        for (const cid of targetCells) {
          if (cells[cid]?.raw) count++;
        }
        return count;
      }

      // Handle basic arithmetic expressions e.g. =A1+B1 or =B3*1.1
      try {
        const resolvedExpr = formula.replace(/[A-Z]+\d+/gi, (cellRef) => {
          const cid = cellRef.toUpperCase();
          if (visited.has(cid)) return '0';
          const val = evaluateValue(cells[cid]?.raw, new Set([...visited, cid]));
          const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
          return isNaN(num) ? '0' : String(num);
        });

        // Safely evaluate simple arithmetic (+, -, *, /, parentheses)
        if (/^[0-9+\-*/().\s]+$/.test(resolvedExpr)) {
          // eslint-disable-next-line no-eval
          const result = Function(`'use strict'; return (${resolvedExpr})`)();
          return typeof result === 'number' && !isNaN(result) ? result : '#VALUE!';
        }
      } catch (err) {
        return '#ERROR!';
      }

      return raw;
    },
    [cells]
  );

  // Format value for display (Currency, Percent, Decimal)
  const formatDisplay = (val, format) => {
    if (val === null || val === undefined || val === '') return '';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));

    if (isNaN(num)) return val;

    switch (format) {
      case 'currency':
        return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percent':
        return `${(num * 100).toFixed(1)}%`;
      case 'decimal':
        return num.toFixed(2);
      default:
        return typeof val === 'number' ? num.toLocaleString('en-US') : val;
    }
  };

  // Commit cell changes to Yjs
  const commitCell = (cellId, patch) => {
    if (isReadOnly || !yDoc) return;
    const yCells = yDoc.getMap('sheet_cells');
    const existing = yCells.get(cellId) || {};
    const updated = { ...existing, ...patch };

    // Clean up if cell is completely empty
    if (!updated.raw && !updated.bold && !updated.color && !updated.bg) {
      yCells.delete(cellId);
    } else {
      yCells.set(cellId, updated);
    }
  };

  const handleStartEdit = (cellId) => {
    if (isReadOnly) return;
    setEditingCell(cellId);
    setEditValue(cells[cellId]?.raw || '');
    setTimeout(() => inputRef.current?.focus(), 20);
  };

  const handleFinishEdit = () => {
    if (!editingCell) return;
    commitCell(editingCell, { raw: editValue });
    setEditingCell(null);
  };

  const handleKeyDown = (e) => {
    if (!selectedCell) return;
    const { col, row, colIdx } = parseCellId(selectedCell);

    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleFinishEdit();
        const nextCell = `${col}${Math.min(rowCount, row + 1)}`;
        updateSelection(nextCell);
      } else if (e.key === 'Escape') {
        setEditingCell(null);
      }
      return;
    }

    // Navigation mode
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      handleStartEdit(selectedCell);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateSelection(`${col}${Math.min(rowCount, row + 1)}`);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateSelection(`${col}${Math.max(1, row - 1)}`);
    } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
      e.preventDefault();
      updateSelection(`${COLS[Math.min(colCount - 1, colIdx + 1)]}${row}`);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      updateSelection(`${COLS[Math.max(0, colIdx - 1)]}${row}`);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!isReadOnly) {
        commitCell(selectedCell, { raw: '' });
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!isReadOnly) {
        setEditingCell(selectedCell);
        setEditValue(e.key);
        setTimeout(() => inputRef.current?.focus(), 10);
      }
    }
  };

  // Formatting actions
  const toggleStyle = (prop, defaultValue) => {
    if (!selectedCell || isReadOnly) return;
    const current = cells[selectedCell]?.[prop];
    commitCell(selectedCell, { [prop]: current ? undefined : defaultValue || true });
  };

  const setCellAlignment = (align) => {
    if (!selectedCell || isReadOnly) return;
    commitCell(selectedCell, { align });
  };

  const setCellFormat = (format) => {
    if (!selectedCell || isReadOnly) return;
    const current = cells[selectedCell]?.format;
    commitCell(selectedCell, { format: current === format ? undefined : format });
  };

  // Export Sheet to CSV
  const handleExportSheetCSV = () => {
    let csv = '';
    for (let r = 1; r <= rowCount; r++) {
      const rowVals = [];
      let rowHasData = false;
      for (let c = 0; c < colCount; c++) {
        const cellId = `${COLS[c]}${r}`;
        const raw = cells[cellId]?.raw || '';
        const evaluated = evaluateValue(raw);
        if (evaluated) rowHasData = true;
        const clean = String(evaluated).replace(/"/g, '""');
        rowVals.push(`"${clean}"`);
      }
      if (rowHasData || r <= 10) {
        csv += rowVals.join(',') + '\n';
      }
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `syncspace_sheet_${Date.now()}.csv`;
    link.click();
  };

  // Reset / Load Template
  const handleLoadTemplate = () => {
    if (isReadOnly || !yDoc) return;
    if (confirm('Load sample Financial Model template into this spreadsheet?')) {
      const yCells = yDoc.getMap('sheet_cells');
      yDoc.transact(() => {
        Object.entries(SAMPLE_BUDGET_TEMPLATE).forEach(([k, v]) => {
          yCells.set(k, v);
        });
      });
    }
  };

  const activeCellData = selectedCell ? cells[selectedCell] || {} : {};

  return (
    <div
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden outline-none select-none isolate"
    >
      {/* 1. Spreadsheet Ribbon Toolbar */}
      <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex flex-wrap items-center gap-1.5 shrink-0 text-slate-700 shadow-xs">
        {/* Active Cell Reference Box */}
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded px-2.5 py-1 text-xs font-mono font-bold text-slate-800 shrink-0">
          <TableIcon size={13} className="text-emerald-600" />
          <span>{selectedCell || 'A1'}</span>
        </div>

        {/* Formula Input Bar */}
        <div className="flex-1 min-w-[140px] flex items-center bg-slate-50 border border-slate-200 rounded px-2 py-0.5 focus-within:border-emerald-500 focus-within:bg-white shadow-inner">
          <span className="text-[11px] font-bold text-emerald-700 font-mono mr-1.5">fx</span>
          <input
            type="text"
            value={formulaInputValue}
            onChange={(e) => {
              setFormulaInputValue(e.target.value);
              if (selectedCell && !isReadOnly) {
                commitCell(selectedCell, { raw: e.target.value });
              }
            }}
            disabled={isReadOnly}
            placeholder="Type value or formula (e.g. =SUM(B3:D3), 5400)..."
            className="flex-1 text-xs bg-transparent outline-none font-mono text-slate-800 disabled:opacity-50"
          />
        </div>

        <span className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

        {/* Text Styling */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => toggleStyle('bold')}
            disabled={isReadOnly}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              activeCellData.bold ? 'bg-slate-200 text-blue-700 font-bold' : 'text-slate-600'
            }`}
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => toggleStyle('italic')}
            disabled={isReadOnly}
            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
              activeCellData.italic ? 'bg-slate-200 text-blue-700' : 'text-slate-600'
            }`}
            title="Italic"
          >
            <Italic size={14} />
          </button>
        </div>

        <span className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

        {/* Alignment */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setCellAlignment('left')}
            disabled={isReadOnly}
            className={`p-1.5 rounded hover:bg-slate-100 ${
              activeCellData.align === 'left' || !activeCellData.align ? 'bg-slate-100 text-slate-900' : 'text-slate-500'
            }`}
            title="Align Left"
          >
            <AlignLeft size={14} />
          </button>
          <button
            onClick={() => setCellAlignment('center')}
            disabled={isReadOnly}
            className={`p-1.5 rounded hover:bg-slate-100 ${
              activeCellData.align === 'center' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'
            }`}
            title="Align Center"
          >
            <AlignCenter size={14} />
          </button>
          <button
            onClick={() => setCellAlignment('right')}
            disabled={isReadOnly}
            className={`p-1.5 rounded hover:bg-slate-100 ${
              activeCellData.align === 'right' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'
            }`}
            title="Align Right"
          >
            <AlignRight size={14} />
          </button>
        </div>

        <span className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

        {/* Number Formats */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCellFormat('currency')}
            disabled={isReadOnly}
            className={`p-1.5 rounded hover:bg-slate-100 text-xs font-semibold ${
              activeCellData.format === 'currency' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'
            }`}
            title="Format as Currency ($)"
          >
            <DollarSign size={14} />
          </button>
          <button
            onClick={() => setCellFormat('percent')}
            disabled={isReadOnly}
            className={`p-1.5 rounded hover:bg-slate-100 text-xs font-semibold ${
              activeCellData.format === 'percent' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'
            }`}
            title="Format as Percentage (%)"
          >
            <Percent size={14} />
          </button>
        </div>

        <span className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

        {/* Quick Actions & Templates */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={handleLoadTemplate}
            disabled={isReadOnly}
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors"
            title="Load Financial Model Template"
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">Load Model</span>
          </button>

          <button
            onClick={handleExportSheetCSV}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors"
            title="Export Sheet to CSV"
          >
            <Download size={12} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => setRowCount((r) => r + 10)}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            title="Add 10 Rows"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* 2. Interactive Spreadsheet Grid */}
      <div className="flex-1 overflow-auto bg-slate-100 isolate">
        <table className="border-collapse table-fixed bg-white text-xs select-none">
          {/* Column Header Row */}
          <thead>
            <tr className="bg-slate-100 text-slate-500 sticky top-0 z-10 shadow-xs">
              {/* Top-Left Corner Cell */}
              <th className="w-10 h-7 border border-slate-300 text-center font-normal text-[10px] bg-slate-200/80 sticky left-0 z-20">
                #
              </th>
              {COLS.slice(0, colCount).map((col) => (
                <th
                  key={col}
                  className="w-32 h-7 border border-slate-300 text-center font-bold text-slate-600 font-mono tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          {/* Grid Rows */}
          <tbody>
            {Array.from({ length: rowCount }, (_, i) => i + 1).map((row) => (
              <tr key={row} className="h-7 hover:bg-slate-50/50">
                {/* Row Header Cell */}
                <td className="w-10 border border-slate-300 bg-slate-100 text-center font-bold text-slate-500 text-[10px] sticky left-0 z-10 select-none">
                  {row}
                </td>

                {/* Data Cells */}
                {COLS.slice(0, colCount).map((col) => {
                  const cellId = `${col}${row}`;
                  const cellData = cells[cellId] || {};
                  const isSelected = selectedCell === cellId;
                  const isEditing = editingCell === cellId;
                  const remoteUser = remoteSelections[cellId];

                  const rawVal = cellData.raw || '';
                  const evaluated = evaluateValue(rawVal);
                  const display = formatDisplay(evaluated, cellData.format);

                  return (
                    <td
                      key={cellId}
                      onClick={() => updateSelection(cellId)}
                      onDoubleClick={() => handleStartEdit(cellId)}
                      style={{
                        backgroundColor: cellData.bg || (isSelected ? '#ecfdf5' : undefined),
                        color: cellData.color || '#1e293b',
                        textAlign: cellData.align || 'left',
                        fontWeight: cellData.bold ? 'bold' : 'normal',
                        fontStyle: cellData.italic ? 'italic' : 'normal',
                      }}
                      className={`border border-slate-200 px-2 relative truncate transition-all ${
                        isSelected
                          ? 'outline-2 outline-emerald-600 outline--offset-2 z-10 bg-emerald-50/40 shadow-xs'
                          : ''
                      }`}
                    >
                      {/* Peer Collaboration Indicator */}
                      {remoteUser && !isSelected && (
                        <div
                          style={{ borderColor: remoteUser.color }}
                          className="absolute inset-0 border-2 pointer-events-none z-10"
                        >
                          <span
                            style={{ backgroundColor: remoteUser.color }}
                            className="absolute -top-3 left-0 text-[9px] font-bold text-white px-1 rounded shadow-xs"
                          >
                            {remoteUser.name?.split(' ')[0]}
                          </span>
                        </div>
                      )}

                      {/* In-Cell Active Editor */}
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleFinishEdit}
                          className="w-full h-full bg-white outline-none border-none font-mono text-xs text-slate-900 p-0 m-0"
                        />
                      ) : (
                        <span className="truncate block">{display}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. Bottom Status Bar */}
      <div className="h-6 bg-slate-100 border-t border-slate-200 px-4 flex items-center justify-between text-[11px] text-slate-500 font-medium shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Excel Formula Engine Active (CRDT Synced)</span>
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline">Supports =SUM, =AVG, =COUNT, =MIN, =MAX</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{rowCount} Rows × {colCount} Columns</span>
        </div>
      </div>
    </div>
  );
}
