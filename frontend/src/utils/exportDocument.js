/**
 * SyncSpace Document Export Utility
 * Supports PDF, Microsoft Word (.doc), XML, HTML, and Markdown formats.
 */

function sanitizeFilename(title) {
  return (title || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'document';
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.toString().replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 1. Export as PDF (opens printable preview / native Save As PDF)
 */
export function exportToPDF(title, htmlContent) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export to PDF');
    return;
  }

  const printDocument = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${escapeXml(title)}</title>
      <style>
        @page {
          margin: 20mm;
          size: A4 portrait;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          line-height: 1.6;
          margin: 0;
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 { font-size: 26pt; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 0; margin-bottom: 16px; color: #0f172a; }
        h2 { font-size: 18pt; font-weight: 700; margin-top: 24px; margin-bottom: 10px; color: #1e293b; }
        h3 { font-size: 14pt; font-weight: 600; margin-top: 18px; margin-bottom: 8px; color: #334155; }
        p { margin: 8px 0; font-size: 11pt; color: #334155; }
        blockquote {
          border-left: 4px solid #3b82f6;
          padding: 8px 16px;
          margin: 16px 0;
          background-color: #f8fafc;
          color: #475569;
          font-style: italic;
          border-radius: 0 4px 4px 0;
        }
        pre {
          background-color: #0f172a;
          color: #f8fafc;
          padding: 14px;
          border-radius: 6px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 10pt;
          overflow-x: auto;
          margin: 14px 0;
        }
        code {
          background-color: #f1f5f9;
          color: #e11d48;
          padding: 2px 5px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 10pt;
        }
        pre code { background: transparent; color: inherit; padding: 0; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          page-break-inside: avoid;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          text-align: left;
          font-size: 10pt;
        }
        th { background-color: #f1f5f9; font-weight: 700; }
        ul, ol { padding-left: 24px; margin: 8px 0; }
        li { margin: 4px 0; }
        .footer-note {
          margin-top: 40px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          font-size: 9pt;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      <div class="footer-note">
        <span>Exported from SyncSpace Collaborative Workspace</span>
        <span>${new Date().toLocaleDateString()}</span>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printDocument);
  printWindow.document.close();
}

/**
 * 2. Export as Microsoft Word Document (.doc / .docx compatible)
 */
export function exportToWord(title, htmlContent) {
  const docHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${escapeXml(title)}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #333333; }
        h1 { font-size: 24pt; color: #1e3a8a; border-bottom: 1.5pt solid #3b82f6; padding-bottom: 6pt; }
        h2 { font-size: 16pt; color: #1e40af; margin-top: 14pt; }
        h3 { font-size: 13pt; color: #1d4ed8; margin-top: 10pt; }
        p { margin: 6pt 0; }
        blockquote { border-left: 3pt solid #3b82f6; padding-left: 10pt; margin: 10pt 0; color: #475569; font-style: italic; background-color: #f8fafc; }
        table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
        th, td { border: 1pt solid #cbd5e1; padding: 6pt 8pt; text-align: left; }
        th { background-color: #f1f5f9; font-weight: bold; }
        pre, code { font-family: Consolas, monospace; background-color: #f1f5f9; color: #b91c1c; }
        pre { padding: 8pt; background-color: #0f172a; color: #f8fafc; }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', docHtml], {
    type: 'application/msword;charset=utf-8',
  });
  triggerDownload(blob, `${sanitizeFilename(title)}.doc`);
}

/**
 * 3. Export as Structured XML Document (.xml)
 */
export function exportToXML(title, documentMeta, jsonDoc, textContent) {
  const sanitize = (val) => escapeXml(val || '');

  // Recursively convert ProseMirror JSON tree to XML tags
  function jsonToXml(node) {
    if (!node) return '';
    const nodeType = node.type || 'unknown';

    if (node.text) {
      let text = escapeXml(node.text);
      if (node.marks) {
        node.marks.forEach((mark) => {
          text = `<${mark.type}>${text}</${mark.type}>`;
        });
      }
      return text;
    }

    let innerContent = '';
    if (node.content && Array.isArray(node.content)) {
      innerContent = node.content.map(jsonToXml).join('');
    }

    const attrs = node.attrs
      ? Object.entries(node.attrs)
          .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
          .join('')
      : '';

    return `<${nodeType}${attrs}>${innerContent}</${nodeType}>`;
  }

  const contentXml = jsonDoc && jsonDoc.content ? jsonDoc.content.map(jsonToXml).join('\n    ') : '';

  const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<syncspace-document version="1.0" xmlns="http://syncspace.io/schema/v1">
  <metadata>
    <id>${sanitize(documentMeta?.id)}</id>
    <title>${sanitize(title)}</title>
    <icon>${sanitize(documentMeta?.icon || '📝')}</icon>
    <workspaceId>${sanitize(documentMeta?.workspaceId)}</workspaceId>
    <authorId>${sanitize(documentMeta?.createdBy)}</authorId>
    <exportedAt>${new Date().toISOString()}</exportedAt>
    <lastModified>${sanitize(documentMeta?.updatedAt || new Date().toISOString())}</lastModified>
  </metadata>

  <document-body>
    ${contentXml || `<text>${escapeXml(textContent)}</text>`}
  </document-body>

  <raw-text-content><![CDATA[${textContent || ''}]]></raw-text-content>
</syncspace-document>
`;

  const blob = new Blob([xmlString], {
    type: 'application/xml;charset=utf-8',
  });
  triggerDownload(blob, `${sanitizeFilename(title)}.xml`);
}

/**
 * 4. Export as Clean HTML Document (.html)
 */
export function exportToHTML(title, htmlContent) {
  const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeXml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #0f172a;
    }
    h1 { font-size: 2.25rem; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h2 { font-size: 1.6rem; font-weight: 700; margin-top: 24px; }
    h3 { font-size: 1.25rem; font-weight: 600; margin-top: 20px; }
    blockquote { border-left: 4px solid #3b82f6; padding: 8px 16px; margin: 16px 0; background: #f8fafc; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; }
    pre { background: #0f172a; color: #f8fafc; padding: 14px; border-radius: 6px; overflow-x: auto; }
    code { background: #f1f5f9; color: #e11d48; padding: 2px 6px; border-radius: 4px; }
    pre code { background: transparent; color: inherit; padding: 0; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

  const blob = new Blob([standaloneHtml], {
    type: 'text/html;charset=utf-8',
  });
  triggerDownload(blob, `${sanitizeFilename(title)}.html`);
}

/**
 * 5. Export as Markdown Document (.md)
 */
export function exportToMarkdown(title, textContent) {
  const mdContent = `# ${title}\n\n${textContent || ''}\n`;
  const blob = new Blob([mdContent], {
    type: 'text/markdown;charset=utf-8',
  });
  triggerDownload(blob, `${sanitizeFilename(title)}.md`);
}

/**
 * 6. Export Spreadsheet as CSV (.csv)
 */
export function exportSheetToCSV(title, cells = {}) {
  const COLS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  let csv = '';
  for (let r = 1; r <= 50; r++) {
    const rowVals = [];
    let hasData = false;
    for (let c = 0; c < 15; c++) {
      const cid = `${COLS[c]}${r}`;
      const raw = cells[cid]?.raw || '';
      if (raw) hasData = true;
      const clean = String(raw).replace(/"/g, '""');
      rowVals.push(`"${clean}"`);
    }
    if (hasData || r <= 10) {
      csv += rowVals.join(',') + '\n';
    }
  }

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });
  triggerDownload(blob, `${sanitizeFilename(title)}_sheet.csv`);
}

/**
 * 7. Export Slides Presentation as Printable Presentation Deck
 */
export function exportSlidesToPresentation(title, slides = []) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export Presentation');
    return;
  }

  const slidesHtml = (slides || [])
    .map(
      (s, idx) => `
    <div class="slide">
      <div class="slide-header">
        <span>${escapeXml(title)}</span>
        <span>Slide ${idx + 1} of ${slides.length}</span>
      </div>
      <h1 class="slide-title">${escapeXml(s.title || 'Untitled')}</h1>
      ${s.subtitle ? `<h3 class="slide-sub">${escapeXml(s.subtitle)}</h3>` : ''}
      ${s.metric ? `<div class="slide-metric">${escapeXml(s.metric)}<div class="slide-metric-lbl">${escapeXml(s.metricLabel || '')}</div></div>` : ''}
      ${
        s.bullets && s.bullets.length > 0
          ? `<ul class="slide-bullets">${s.bullets.map((b) => `<li>${escapeXml(b)}</li>`).join('')}</ul>`
          : ''
      }
    </div>
  `
    )
    .join('');

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeXml(title)} — Presentation</title>
      <style>
        @page { size: landscape; margin: 15mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #ffffff; color: #0f172a; }
        .slide { page-break-after: always; padding: 40px; border: 1.5pt solid #cbd5e1; border-radius: 12px; margin-bottom: 24px; min-height: 480px; display: flex; flex-direction: column; justify-content: center; }
        .slide-header { display: flex; justify-content: space-between; font-size: 10pt; color: #94a3b8; font-weight: bold; margin-bottom: 24px; text-transform: uppercase; }
        .slide-title { font-size: 32pt; font-weight: 800; color: #1e3a8a; margin: 0 0 12px 0; }
        .slide-sub { font-size: 16pt; font-weight: 500; color: #475569; margin: 0 0 24px 0; }
        .slide-metric { font-size: 52pt; font-weight: 900; color: #d97706; margin: 20px 0; }
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
}
