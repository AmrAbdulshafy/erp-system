const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Notification, screen, nativeTheme } = require('electron');
const path = require('path');
const v8 = require('v8');
const http = require('http');
const net = require('net');
const fs = require('fs');
const { spawn } = require('child_process');

// ==========================================
// V8 ENGINE & CHROMIUM PERFORMANCE FLAGS
// ==========================================
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096 --expose-gc');
app.commandLine.appendSwitch('v8-cache-options', 'code');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-http-cache', 'false');

let mainWindow = null;
let embeddedServerProcess = null;
let isStartingServer = false;
const SERVER_PORT = parseInt(process.env.PORT || '3000', 10);
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`;

function isPortListening(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function ensureServerRunning() {
  if (embeddedServerProcess || isStartingServer) return;
  isStartingServer = true;

  try {
    // Check if port 3000 is already listening (e.g. started by pnpm desktop / pnpm dev or existing service)
    const alreadyListening = await isPortListening(SERVER_PORT, '127.0.0.1');
    if (alreadyListening) {
      console.log(`[Jin Engine Desktop] Server already listening on 127.0.0.1:${SERVER_PORT}, reusing existing instance.`);
      return;
    }

    const candidatePaths = [
      path.join(process.resourcesPath, 'standalone', 'server.js'),
      path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone', 'server.js'),
      path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js'),
      path.join(__dirname, '..', '.next', 'standalone', 'server.js')
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        console.log(`[Jin Engine Desktop] Starting standalone server from: ${p}`);
        embeddedServerProcess = spawn(process.execPath, [p], {
          cwd: path.dirname(p),
          env: {
            ...process.env,
            NODE_ENV: 'production',
            PORT: String(SERVER_PORT),
            HOSTNAME: '127.0.0.1',
            ELECTRON_RUN_AS_NODE: '1'
          },
          stdio: 'ignore',
          windowsHide: true
        });

        embeddedServerProcess.on('error', (err) => {
          console.error('[Jin Engine Desktop] Embedded server process error:', err);
          embeddedServerProcess = null;
        });

        embeddedServerProcess.on('exit', (code) => {
          console.log(`[Jin Engine Desktop] Embedded server process exited with code ${code}`);
          embeddedServerProcess = null;
        });
        break;
      }
    }
  } finally {
    isStartingServer = false;
  }
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: 'Jin Engine',
      submenu: [
        { role: 'about', label: 'About Jin Engine / حول النظام' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Exit / خروج' }
      ]
    }] : []),
    {
      label: 'File / ملف',
      submenu: [
        {
          label: 'Print Report / طباعة التقرير',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) mainWindow.webContents.print();
          }
        },
        {
          label: 'Save as PDF / تصدير PDF',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: async () => {
            if (!mainWindow) return;
            const { filePath } = await dialog.showSaveDialog(mainWindow, {
              title: 'Export PDF - Jin Engine',
              defaultPath: `JinEngine-Report-${Date.now()}.pdf`,
              filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
            });
            if (filePath) {
              const data = await mainWindow.webContents.printToPDF({});
              fs.writeFileSync(filePath, data);
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Export Complete / تم التصدير',
                message: `Report exported successfully to:\n${filePath}`
              });
            }
          }
        },
        { type: 'separator' },
        { role: isMac ? 'close' : 'quit', label: 'Exit / خروج' }
      ]
    },
    {
      label: 'Edit / تحرير',
      submenu: [
        { role: 'undo', label: 'Undo / تراجع' },
        { role: 'redo', label: 'Redo / إعادة' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut / قص' },
        { role: 'copy', label: 'Copy / نسخ' },
        { role: 'paste', label: 'Paste / لصق' },
        { role: 'selectAll', label: 'Select All / تحديد الكل' }
      ]
    },
    {
      label: 'View / عرض',
      submenu: [
        { role: 'reload', label: 'Refresh / تحديث' },
        { role: 'forceReload', label: 'Force Reload / إعادة تحميل إجبارية' },
        {
          label: 'Clear Cache & Reload / تفريغ الذاكرة المؤقتة وإعادة التحميل',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: async () => {
            if (mainWindow) {
              const session = mainWindow.webContents.session;
              await session.clearCache();
              await session.clearStorageData({
                storages: ['appcache', 'cachestorage', 'shadercache', 'serviceworkers']
              });
              mainWindow.webContents.reloadIgnoringCache();
            }
          }
        },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Actual Size / الحجم الفعلي' },
        { role: 'zoomIn', label: 'Zoom In / تكبير' },
        { role: 'zoomOut', label: 'Zoom Out / تصغير' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Fullscreen / ملء الشاشة' }
      ]
    },
    {
      label: 'Navigation / التنقل',
      submenu: [
        {
          label: 'Dashboard / لوحة التحكم',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow?.loadURL(`${SERVER_URL}/`)
        },
        {
          label: 'Sales Orders / المبيعات',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow?.loadURL(`${SERVER_URL}/sales`)
        },
        {
          label: 'Quotations / عروض الأسعار',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow?.loadURL(`${SERVER_URL}/quotations`)
        },
        {
          label: 'Work Orders / أوامر العمل والإنتاج',
          accelerator: 'CmdOrCtrl+4',
          click: () => mainWindow?.loadURL(`${SERVER_URL}/work-orders`)
        },
        {
          label: 'Inventory / المستودع والخامات',
          accelerator: 'CmdOrCtrl+5',
          click: () => mainWindow?.loadURL(`${SERVER_URL}/inventory`)
        },
        {
          label: 'Employees / الموظفون والرواتب',
          accelerator: 'CmdOrCtrl+6',
          click: () => mainWindow?.loadURL(`${SERVER_URL}/employees`)
        },
        {
          label: 'Reports / التقارير المالية',
          accelerator: 'CmdOrCtrl+7',
          click: () => mainWindow?.loadURL(`${SERVER_URL}/reports`)
        },
        {
          label: 'Interactive Tutorial / الدليل التفاعلي',
          accelerator: 'CmdOrCtrl+8',
          click: () => mainWindow?.loadURL(`${SERVER_URL}/tutorial`)
        },
        {
          label: 'System Settings / الإعدادات والصلاحيات',
          accelerator: 'CmdOrCtrl+9',
          click: () => mainWindow?.loadURL(`${SERVER_URL}/settings`)
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function checkServerReady(url, callback) {
  const req = http.get(url, (res) => {
    callback(true);
  });
  req.on('error', () => {
    callback(false);
  });
  req.setTimeout(1500, () => {
    req.destroy();
    callback(false);
  });
}

function loadServerWithRetry(win, maxAttempts = 60) {
  let attempts = 0;
  const interval = setInterval(() => {
    if (!win || win.isDestroyed()) {
      clearInterval(interval);
      return;
    }
    attempts++;
    ensureServerRunning();
    checkServerReady(SERVER_URL, (ready) => {
      if (!win || win.isDestroyed()) {
        clearInterval(interval);
        return;
      }
      if (ready) {
        clearInterval(interval);
        win.loadURL(SERVER_URL);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
          <div style="font-family:sans-serif;padding:40px;text-align:center;background:#0f172a;color:#f8fafc;height:100vh;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <h1 style="color:#f97316;font-size:2rem;margin-bottom:8px;">Jin Engine</h1>
            <p style="color:#94a3b8;font-size:1.1rem;margin-bottom:24px;">Starting local Jin Engine service at ${SERVER_URL}...</p>
            <button onclick="location.reload()" style="margin-top:20px;padding:12px 24px;background:#f97316;color:white;border:none;border-radius:8px;font-size:1rem;font-weight:bold;cursor:pointer;">
              Retry Connection / إعادة المحاولة
            </button>
          </div>
        `)}`);
      }
    });
  }, 800);
}

function getCreatorLogoDataUri(filename = 'jin-engine-wordmark-dark.svg') {
  const candidates = [
    path.join(__dirname, '..', 'public', filename),
    path.join(process.resourcesPath || '', 'standalone', 'public', filename),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', '.next', 'standalone', 'public', filename)
  ];
  const mime = filename.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const b64 = fs.readFileSync(p).toString('base64');
        return `data:${mime};base64,${b64}`;
      }
    } catch {
      // ignore
    }
  }
  return '';
}

function buildSplashHtml(initialDark = true) {
  const darkLogoUri = getCreatorLogoDataUri('jin-engine-wordmark-dark.svg');
  const lightLogoUri = getCreatorLogoDataUri('jin-engine-wordmark-light.svg') || darkLogoUri;
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" class="${initialDark ? 'dark' : 'light'}">
<head>
<meta charset="utf-8" />
<style>
  :root {
    --background: #FFFFFF;
    --bg-gradient: radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.08) 0%, rgba(249, 115, 22, 0.05) 45%, #F8FAFC 100%);
    --surface: #FFFFFF;
    --surface-hover: #F4F4F6;
    --text-main: #09090B;
    --text-muted: #71717A;
    --border: #E4E4E7;
    --primary: #2563eb;
    --orange: #f97316;
    --success: #10b981;
    --card-shadow: 0 18px 40px -15px rgba(9, 9, 11, 0.08);
  }
  html.dark {
    --background: #09090B;
    --bg-gradient: radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.14) 0%, rgba(249, 115, 22, 0.08) 45%, #09090B 100%);
    --surface: #121214;
    --surface-hover: #1A1A1E;
    --text-main: #FAFAFA;
    --text-muted: #A1A1AA;
    --border: #27272A;
    --primary: #2563eb;
    --orange: #f97316;
    --success: #10b981;
    --card-shadow: 0 22px 50px -15px rgba(0, 0, 0, 0.55);
  }
  @media (prefers-color-scheme: light) {
    html.auto-theme {
      --background: #FFFFFF;
      --bg-gradient: radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.08) 0%, rgba(249, 115, 22, 0.05) 45%, #F8FAFC 100%);
      --surface: #FFFFFF;
      --surface-hover: #F4F4F6;
      --text-main: #09090B;
      --text-muted: #71717A;
      --border: #E4E4E7;
      --card-shadow: 0 18px 40px -15px rgba(9, 9, 11, 0.08);
    }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    font-family: 'Segoe UI', Tahoma, sans-serif;
    background: var(--bg-gradient);
    background-color: var(--background);
    color: var(--text-main);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 2.5rem 2rem 2rem;
    user-select: none;
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  .top-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 1rem;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--card-shadow);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-muted);
    z-index: 2;
  }
  .top-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--success);
    box-shadow: 0 0 10px var(--success);
    animation: blink 1.4s ease-in-out infinite;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.45; transform: scale(0.85); }
  }
  .center-card {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 680px;
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 2.35rem 2.5rem 2rem;
    box-shadow: var(--card-shadow);
  }
  .orbital-box {
    position: relative;
    width: 112px;
    height: 112px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.35rem;
  }
  .ring-outer {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 3px solid rgba(37, 99, 235, 0.16);
    border-top-color: var(--primary);
    border-right-color: var(--orange);
    animation: spin 1.6s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite;
  }
  .ring-inner {
    position: absolute;
    inset: 11px;
    border-radius: 50%;
    border: 2.5px dashed rgba(249, 115, 22, 0.35);
    border-bottom-color: var(--primary);
    animation: spinReverse 2.5s linear infinite;
  }
  .core-badge {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    background: linear-gradient(135deg, var(--primary) 0%, #1d4ed8 55%, var(--orange) 100%);
    box-shadow: 0 12px 28px rgba(37, 99, 235, 0.32);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.95rem;
    font-weight: 900;
    color: #fff;
    animation: floatBadge 2.4s ease-in-out infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes spinReverse { to { transform: rotate(-360deg); } }
  @keyframes floatBadge {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-4px); }
  }
  .erp-title {
    font-size: 1.95rem;
    font-weight: 900;
    letter-spacing: 0.6px;
    color: var(--text-main);
    margin-bottom: 0.3rem;
  }
  .erp-title span {
    color: var(--primary);
  }
  .erp-subtitle {
    color: var(--text-muted);
    font-size: 0.94rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
  }
  .modules-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.65rem;
    width: 100%;
    margin-bottom: 1.5rem;
    text-align: right;
  }
  .mod-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0.85rem;
    border-radius: 12px;
    background: var(--surface-hover);
    border: 1px solid var(--border);
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-muted);
    transition: all 0.3s ease;
  }
  .mod-item.active {
    border-color: var(--primary);
    color: var(--text-main);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
  }
  .mod-item.done {
    border-color: rgba(16, 185, 129, 0.45);
    color: var(--text-main);
  }
  .mod-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    background: var(--surface);
    border: 1.5px solid var(--border);
    color: var(--text-muted);
    flex-shrink: 0;
  }
  .mod-item.active .mod-dot {
    border-color: var(--primary);
    background: var(--primary);
    color: #fff;
  }
  .mod-item.done .mod-dot {
    border-color: var(--success);
    background: var(--success);
    color: #fff;
  }
  .progress-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.82rem;
    font-weight: 700;
    margin-bottom: 0.45rem;
  }
  .progress-step {
    color: var(--primary);
  }
  .progress-pct {
    color: var(--orange);
    font-family: monospace;
    font-size: 0.92rem;
    font-weight: 900;
  }
  .progress-track {
    width: 100%;
    height: 9px;
    background: var(--surface-hover);
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .progress-bar {
    height: 100%;
    width: 4%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--primary) 0%, #3b82f6 55%, var(--orange) 100%);
    transition: width 0.18s linear;
  }
  .creator-footer {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 0.95rem 1.65rem;
    border-radius: 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--card-shadow);
    max-width: 680px;
    width: 100%;
  }
  .creator-logo {
    height: 34px;
    width: auto;
    object-fit: contain;
  }
  .creator-info {
    display: flex;
    flex-direction: column;
    text-align: left;
    direction: ltr;
    gap: 2px;
  }
  .creator-line1 {
    font-size: 0.84rem;
    font-weight: 700;
    color: var(--text-main);
  }
  .creator-line1 strong {
    color: var(--orange);
    font-weight: 900;
  }
  .creator-line2 {
    font-size: 0.78rem;
    color: var(--text-muted);
    font-weight: 600;
  }
  .creator-line2 strong {
    color: var(--primary);
    font-weight: 800;
  }
</style>
</head>
<body>
  <div class="top-pill">
    <span class="top-dot"></span>
    <span>Jin Engine Enterprise ERP v1.0 &bull; Local-First Hybrid Architecture</span>
  </div>

  <div class="center-card">
    <div class="orbital-box">
      <div class="ring-outer"></div>
      <div class="ring-inner"></div>
      <div class="core-badge">U</div>
    </div>
    <h1 class="erp-title">JIN ENGINE <span>ERP SYSTEM</span></h1>
    <p class="erp-subtitle">Jin Engine — المنظومة المتكاملة لإدارة وتخطيط مصانع التعبئة والتغليف والكرتون</p>

    <div class="modules-grid">
      <div id="mod0" class="mod-item active">
        <span class="mod-dot" id="dot0">1</span>
        <span>محرك قاعدة البيانات المحلية (IndexedDB)</span>
      </div>
      <div id="mod1" class="mod-item">
        <span class="mod-dot" id="dot1">2</span>
        <span>وحدات التصنيع والـ BOM والمخزون</span>
      </div>
      <div id="mod2" class="mod-item">
        <span class="mod-dot" id="dot2">3</span>
        <span>الحسابات والمبيعات ومسيرات الرواتب</span>
      </div>
      <div id="mod3" class="mod-item">
        <span class="mod-dot" id="dot3">4</span>
        <span>التشفير ومصفوفة الصلاحيات (RBAC)</span>
      </div>
    </div>

    <div class="progress-header">
      <span id="stepText" class="progress-step">جاري تهيئة محرك النظام وقاعدة البيانات...</span>
      <span id="pctText" class="progress-pct">0%</span>
    </div>
    <div class="progress-track">
      <div id="progBar" class="progress-bar"></div>
    </div>
  </div>

  <div class="creator-footer" dir="ltr">
    <img id="creatorLogo" src="${initialDark ? darkLogoUri : lightLogoUri}" alt="Jinnworx" class="creator-logo" />
    <div class="creator-info">
      <div class="creator-line1">Created &amp; Engineered by <strong>Jinnworx</strong></div>
      <div class="creator-line2">Developed by <strong>Amr Abdulshafy</strong></div>
    </div>
  </div>

  <script>
    const darkLogo = ${JSON.stringify(darkLogoUri)};
    const lightLogo = ${JSON.stringify(lightLogoUri)};
    function syncSystemTheme() {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
      document.documentElement.classList.toggle('light', !prefersDark);
      const logoEl = document.getElementById('creatorLogo');
      if (logoEl) logoEl.src = prefersDark ? darkLogo : lightLogo;
    }
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncSystemTheme);
    }

    const steps = [
      'جاري تهيئة محرك النظام وقاعدة البيانات... • Initializing Local ERP Engine...',
      'جاري فحص وتجهيز وحدات التصنيع والمخزون... • Loading Manufacturing & BOM...',
      'جاري تحميل الدفاتر المالية والمبيعات والرواتب... • Loading Financial Ledgers...',
      'جاري التحقق من التشفير والصلاحيات... • Verifying Security & RBAC Matrix...',
      'اكتمل التحميل — جاري فتح النظام... • Ready! Launching Jin Engine ERP...'
    ];

    let pct = 0;
    const totalDuration = 6800;
    const tick = 70;
    const increment = 100 / (totalDuration / tick);

    const timer = setInterval(() => {
      pct = Math.min(100, pct + increment);
      const rounded = Math.round(pct);
      const bar = document.getElementById('progBar');
      const pctEl = document.getElementById('pctText');
      const stepEl = document.getElementById('stepText');
      if (bar) bar.style.width = rounded + '%';
      if (pctEl) pctEl.textContent = rounded + '%';

      const stage = pct < 25 ? 0 : (pct < 50 ? 1 : (pct < 75 ? 2 : (pct < 96 ? 3 : 4)));
      if (stepEl) stepEl.textContent = steps[stage];

      for (let m = 0; m < 4; m++) {
        const modEl = document.getElementById('mod' + m);
        const dotEl = document.getElementById('dot' + m);
        if (!modEl || !dotEl) continue;
        if (m < stage) {
          modEl.className = 'mod-item done';
          dotEl.textContent = '✓';
        } else if (m === stage) {
          modEl.className = 'mod-item active';
          dotEl.textContent = String(m + 1);
        } else {
          modEl.className = 'mod-item';
          dotEl.textContent = String(m + 1);
        }
      }

      if (pct >= 100) clearInterval(timer);
    }, tick);
  </script>
</body>
</html>`;
}

function createWindow() {
  nativeTheme.themeSource = 'system';
  const isDark = nativeTheme.shouldUseDarkColors;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const iconPath = path.join(__dirname, '..', 'public', 'jin-engine-icon-512.png');

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 1024,
    minHeight: 700,
    fullscreen: false,
    fullscreenable: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    autoHideMenuBar: true,
    backgroundColor: isDark ? '#09090B' : '#FFFFFF',
    title: 'Jin Engine ERP System',
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false,
      spellcheck: true
    },
    show: true
  });

  createApplicationMenu();

  const bringWindowToFront = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.moveTop();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false);
      }
    }, 1200);
  };

  bringWindowToFront();

  mainWindow.once('ready-to-show', () => {
    bringWindowToFront();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      bringWindowToFront();
    }
  });

  // Show the animated Jin Engine ERP + Jinnworx splash screen briefly while starting the local server
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildSplashHtml(isDark))}`);
  ensureServerRunning();

  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    checkServerReady(SERVER_URL, (ready) => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (ready) {
        mainWindow.loadURL(SERVER_URL);
      } else {
        loadServerWithRetry(mainWindow);
      }
    });
  }, 1800);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==========================================
// IPC HANDLERS FOR V8 METRICS & DESKTOP APIS
// ==========================================
ipcMain.handle('get-v8-info', async () => {
  return {
    v8Version: process.versions.v8,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    heapStatistics: v8.getHeapStatistics(),
    heapSpaceStatistics: v8.getHeapSpaceStatistics(),
    memoryUsage: process.memoryUsage()
  };
});

ipcMain.handle('clear-cache', async () => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  try {
    const session = mainWindow.webContents.session;
    await session.clearCache();
    await session.clearStorageData({
      storages: ['appcache', 'cachestorage', 'shadercache', 'serviceworkers', 'websql']
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('print-to-pdf', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: options.title || 'Export PDF - Jin Engine',
      defaultPath: options.defaultPath || `JinEngine-${Date.now()}.pdf`,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
    });
    if (!filePath) return { success: false, canceled: true };
    const data = await mainWindow.webContents.printToPDF(options);
    fs.writeFileSync(filePath, data);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('print-silent', async () => {
  if (!mainWindow) return { success: false };
  mainWindow.webContents.print({ silent: false, printBackground: true });
  return { success: true };
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

ipcMain.handle('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'Jin Engine',
      body: body || ''
    }).show();
  }
});

// Single-instance lock so multiple clicks focus existing window instead of colliding on port 3000
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (embeddedServerProcess) {
    embeddedServerProcess.kill();
    embeddedServerProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (embeddedServerProcess) {
    embeddedServerProcess.kill();
    embeddedServerProcess = null;
  }
});
