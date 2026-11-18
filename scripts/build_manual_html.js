const fs = require('fs');
const path = require('path');

const arMdPath = 'C:\\Users\\amr\\.gemini\\antigravity-ide\\brain\\2c3e692a-69b6-4ca9-bf3a-2c4743e28fc4\\jinnworx_manual_arabic.md';
const enMdPath = 'C:\\Users\\amr\\.gemini\\antigravity-ide\\brain\\2c3e692a-69b6-4ca9-bf3a-2c4743e28fc4\\jinnworx_manual_english.md';

const arContent = fs.readFileSync(arMdPath, 'utf8');
const enContent = fs.readFileSync(enMdPath, 'utf8');

function simpleMdToHtml(md, isRtl) {
  let lines = md.split('\n');
  let html = [];
  let inTable = false;
  let tableHeaderDone = false;

  for (let line of lines) {
    line = line.trimEnd();

    // Headers
    if (line.startsWith('# ')) {
      html.push(`<h1 class="manual-h1">${line.slice(2)}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      html.push(`<h2 class="manual-h2">${line.slice(3)}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      html.push(`<h3 class="manual-h3">${line.slice(4)}</h3>`);
      continue;
    }
    if (line.startsWith('#### ')) {
      html.push(`<h4 class="manual-h4">${line.slice(5)}</h4>`);
      continue;
    }

    // Images
    const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2];
      // Convert to web path if possible
      let webSrc = src.replace(/\\/g, '/');
      const filename = path.basename(webSrc);
      webSrc = `/tutorials/screens/${filename}`;
      html.push(`
        <div class="manual-figure">
          <div class="manual-window">
            <div class="manual-window-bar">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
              <span class="manual-window-title">Jinn Worx ERP — ${alt}</span>
            </div>
            <img src="${webSrc}" alt="${alt}" class="manual-img" />
          </div>
          <figcaption class="manual-caption">📸 ${alt}</figcaption>
        </div>
      `);
      continue;
    }

    // Horizontal Rule
    if (line === '---') {
      html.push('<hr class="manual-hr" />');
      continue;
    }

    // Tables
    if (line.startsWith('|') && line.endsWith('|')) {
      if (line.includes('---')) {
        tableHeaderDone = true;
        continue;
      }
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (!inTable) {
        html.push('<div class="table-container"><table class="manual-table">');
        html.push('<thead><tr>' + cells.map(c => `<th>${formatInline(c)}</th>`).join('') + '</tr></thead><tbody>');
        inTable = true;
        tableHeaderDone = false;
      } else {
        html.push('<tr>' + cells.map(c => `<td>${formatInline(c)}</td>`).join('') + '</tr>');
      }
      continue;
    } else if (inTable) {
      html.push('</tbody></table></div>');
      inTable = false;
    }

    // Mermaid Diagrams
    if (line.startsWith('```mermaid') || line.startsWith('```')) {
      continue;
    }

    // Lists
    if (line.startsWith('* ') || line.startsWith('- ')) {
      html.push(`<li class="manual-li">${formatInline(line.slice(2))}</li>`);
      continue;
    }
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      html.push(`<div class="manual-step"><strong>${numMatch[1]}.</strong> ${formatInline(numMatch[2])}</div>`);
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      continue;
    }

    // Normal paragraph
    html.push(`<p class="manual-p">${formatInline(line)}</p>`);
  }

  if (inTable) {
    html.push('</tbody></table></div>');
  }

  return html.join('\n');
}

function formatInline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="manual-code">$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="manual-link">$1</a>');
}

const arHtml = simpleMdToHtml(arContent, true);
const enHtml = simpleMdToHtml(enContent, false);

const fullHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jinn Worx ERP — Comprehensive Illustrated Manual (الدليل المصور الشامل)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #4f46e5;
      --primary-hover: #4338ca;
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
      --accent: #f59e0b;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      padding: 0;
      margin: 0;
    }
    .top-nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 0.85rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .logo-container img {
      height: 36px;
      width: auto;
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .btn {
      padding: 0.5rem 1.15rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      border: 1px solid var(--border);
      background: var(--card-bg);
      color: var(--text);
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .btn:hover {
      background: var(--border);
    }
    .btn-primary {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }
    .btn-primary:hover {
      background: var(--primary-hover);
    }
    .main-wrapper {
      max-width: 1100px;
      margin: 2rem auto;
      padding: 0 1.5rem 4rem 1.5rem;
    }
    .lang-section {
      display: none;
    }
    .lang-section.active {
      display: block;
    }
    .manual-h1 {
      font-size: 2.1rem;
      font-weight: 900;
      color: #fff;
      margin-bottom: 0.5rem;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .manual-h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--accent);
      margin: 2.5rem 0 1rem 0;
      padding-bottom: 0.4rem;
      border-bottom: 2px solid rgba(245, 158, 11, 0.25);
    }
    .manual-h3 {
      font-size: 1.25rem;
      font-weight: 800;
      color: #93c5fd;
      margin: 2rem 0 0.75rem 0;
    }
    .manual-h4 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #e2e8f0;
      margin: 1.25rem 0 0.5rem 0;
    }
    .manual-p {
      margin-bottom: 1rem;
      color: #cbd5e1;
      font-size: 0.98rem;
    }
    .manual-li {
      margin-bottom: 0.5rem;
      margin-inline-start: 1.5rem;
      color: #cbd5e1;
    }
    .manual-step {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-bottom: 0.65rem;
      color: #e2e8f0;
    }
    .manual-hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 2rem 0;
    }
    .manual-figure {
      margin: 1.75rem 0;
    }
    .manual-window {
      border-radius: 12px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #000;
      box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.6);
    }
    .manual-window-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0.45rem 0.85rem;
      background: #1e293b;
      border-bottom: 1px solid var(--border);
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot.red { background: #ef4444; }
    .dot.yellow { background: #f59e0b; }
    .dot.green { background: #10b981; }
    .manual-window-title {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-inline-start: 8px;
      font-family: 'Inter', sans-serif;
    }
    .manual-img {
      width: 100%;
      height: auto;
      display: block;
      border-top: 1px solid #111827;
    }
    .manual-caption {
      text-align: center;
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
      font-weight: 600;
    }
    .table-container {
      overflow-x: auto;
      margin: 1.5rem 0;
      border-radius: 10px;
      border: 1px solid var(--border);
    }
    .manual-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
      background: var(--card-bg);
    }
    .manual-table th {
      background: #0f172a;
      padding: 0.75rem 1rem;
      font-weight: 800;
      color: #f1f5f9;
      text-align: inherit;
      border-bottom: 1px solid var(--border);
    }
    .manual-table td {
      padding: 0.7rem 1rem;
      border-bottom: 1px solid var(--border);
      color: #cbd5e1;
    }
    .manual-table tr:last-child td {
      border-bottom: none;
    }
    .manual-code {
      background: rgba(99, 102, 241, 0.15);
      color: #a5b4fc;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.88em;
    }
    .manual-link {
      color: #38bdf8;
      text-decoration: none;
    }
    .manual-link:hover {
      text-decoration: underline;
    }

    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
      }
      .top-nav {
        display: none !important;
      }
      .main-wrapper {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .manual-window {
        border: 1px solid #cccccc !important;
        box-shadow: none !important;
      }
      .manual-h1 {
        color: #000000 !important;
        -webkit-text-fill-color: initial !important;
      }
      .manual-h2 {
        color: #b45309 !important;
      }
      .manual-p, .manual-li, .manual-table td {
        color: #1e293b !important;
      }
      .manual-window-bar {
        background: #f1f5f9 !important;
      }
    }
  </style>
</head>
<body>

  <!-- Top Navigation & Controls -->
  <header class="top-nav">
    <div class="logo-container">
      <img src="/jinnworx-logo-dark.png" alt="Jinn Worx" />
      <div>
        <div style="font-size: 1.05rem; font-weight: 900; letter-spacing: -0.3px;">Jinn Worx ERP</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">Illustrated Enterprise Manual 2026</div>
      </div>
    </div>

    <div class="nav-actions">
      <button class="btn" onclick="toggleLanguage('ar')">🇸🇦 العربية</button>
      <button class="btn" onclick="toggleLanguage('en')">🇬🇧 English</button>
      <button class="btn btn-primary" onclick="window.print()">🖨️ طباعة / تصدير PDF</button>
    </div>
  </header>

  <!-- Content Wrapper -->
  <main class="main-wrapper">
    <div id="section-ar" class="lang-section active" dir="rtl">
      ${arHtml}
    </div>

    <div id="section-en" class="lang-section" dir="ltr" style="font-family: 'Inter', sans-serif;">
      ${enHtml}
    </div>
  </main>

  <script>
    function toggleLanguage(lang) {
      const arSec = document.getElementById('section-ar');
      const enSec = document.getElementById('section-en');
      if (lang === 'ar') {
        arSec.classList.add('active');
        enSec.classList.remove('active');
        document.documentElement.lang = 'ar';
        document.documentElement.dir = 'rtl';
      } else {
        enSec.classList.add('active');
        arSec.classList.remove('active');
        document.documentElement.lang = 'en';
        document.documentElement.dir = 'ltr';
      }
    }
  </script>

</body>
</html>
`;

fs.writeFileSync('c:\\xampp\\htdocs\\public\\manual.html', fullHtml, 'utf8');
fs.writeFileSync('C:\\Users\\amr\\.gemini\\antigravity-ide\\brain\\2c3e692a-69b6-4ca9-bf3a-2c4743e28fc4\\jinnworx_manual_complete.html', fullHtml, 'utf8');
console.log('Successfully built public/manual.html and artifact jinnworx_manual_complete.html!');
