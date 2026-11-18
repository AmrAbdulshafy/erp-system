const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const URL = `http://127.0.0.1:${PORT}`;

function isServerRunning(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerRunning(url)) return true;
    await new Promise((r) => setTimeout(r, 800));
  }
  return false;
}

async function main() {
  console.log('🚀 [Jin Engine Desktop] Initializing Desktop Environment (V8 Engine)...');
  
  let serverProcess = null;
  const running = await isServerRunning(URL);

  if (running) {
    console.log(`✅ [Jin Engine Desktop] Server already running at ${URL}`);
  } else {
    console.log(`⚡ [Jin Engine Desktop] Starting local Next.js server on port ${PORT}...`);
    
    const standaloneServer = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
    let serverCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    let serverArgs = ['run', 'dev'];
    let useShell = true;

    if (fs.existsSync(standaloneServer)) {
      serverCmd = process.execPath;
      serverArgs = [standaloneServer];
      useShell = false;
      console.log(`📦 [Jin Engine Desktop] Executing standalone Next.js server (${standaloneServer})...`);
    } else {
      console.log(`📦 [Jin Engine Desktop] Executing: ${serverCmd} ${serverArgs.join(' ')}`);
    }

    serverProcess = spawn(serverCmd, serverArgs, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: useShell,
      env: { ...process.env, PORT: String(PORT), HOSTNAME: '127.0.0.1' }
    });

    serverProcess.on('error', (err) => {
      console.error('❌ Failed to start Next.js server:', err);
    });

    console.log('⏳ [Jin Engine Desktop] Waiting for server to be ready...');
    const ready = await waitForServer(URL, 45000);
    if (!ready) {
      console.warn('⚠️ Server took longer than expected to report ready, opening Electron window anyway...');
    } else {
      console.log('✅ [Jin Engine Desktop] Server is online and ready!');
    }
  }

  // Find local electron executable
  const electronPath = require('electron');
  console.log(`🖥️  [Jin Engine Desktop] Launching Electron with V8 Engine...`);

  const electronProcess = spawn(electronPath, [path.join(__dirname, 'main.js')], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, PORT: String(PORT) }
  });

  electronProcess.on('close', (code) => {
    console.log(`🛑 [Jin Engine Desktop] Electron window closed (exit code ${code}).`);
    if (serverProcess) {
      console.log('🧹 [Jin Engine Desktop] Terminating child Next.js server...');
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
      } else {
        serverProcess.kill('SIGINT');
      }
    }
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error('❌ Launcher error:', err);
  process.exit(1);
});
