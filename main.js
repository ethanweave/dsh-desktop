/**
 * DeepSeek Harness 桌面应用主进程（类 Codex 桌面版）
 *
 * 行为对标 Codex：
 *  - 双击应用图标  → 打开原生窗口（无地址栏/菜单栏），服务未运行则自动拉起
 *  - 点窗口 ❌     → 隐藏到系统托盘，后台服务与托盘保持运行（不退出、不清理）
 *  - 双击托盘图标  → 重新显示窗口
 *  - 托盘右键「退出」→ 彻底关停：关闭窗口 + 停止后台服务 + 退出应用
 *
 * 服务托管：
 *  - 主进程负责 dsh web（@deepseek-ai/dsh 的 bin.js）的完整生命周期。
 *  - dsh 运行时随应用打包在 <resources>/dsh-runtime（安装版）或
 *    <app>/runtime（开发模式）。
 *  - 用 Electron 自带的 node 内核（ELECTRON_RUN_AS_NODE）启动服务，
 *    用户机器无需安装 Node.js。
 */
const { app, BrowserWindow, Tray, Menu, nativeImage, shell, dialog } = require('electron')
const { spawn, execFile } = require('child_process')
const net = require('net')
const fs = require('fs')
const path = require('path')

// ---- 配置（无任何本机硬编码路径）----
const PORT = Number(process.env.DSH_WEB_PORT || 3080)
const URL = `http://127.0.0.1:${PORT}`
const SERVER_READY_TIMEOUT_MS = 60_000

// 运行时定位：安装版在 resources/dsh-runtime，开发模式在 app 同级 runtime
function resolveRuntime() {
  const candidates = [
    path.join(process.resourcesPath, 'dsh-runtime'),
    path.join(__dirname, 'runtime'),
  ]
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir
  }
  return candidates[0]
}

const RUNTIME_DIR = resolveRuntime()
// bin.js 的解析：优先 node_modules/@deepseek-ai/dsh/lib/bin.js，兜底直接找 bin.js
function resolveDshBin() {
  const candidates = [
    path.join(RUNTIME_DIR, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
    path.join(RUNTIME_DIR, 'node_modules', '@deepseek-ai', 'dsh', 'bin.js'),
    path.join(RUNTIME_DIR, 'bin.js'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[0]
}

const DSH_BIN = resolveDshBin()

// 服务进程用 Electron 的 node 内核跑（无需系统 node）
const NODE_EXEC = process.execPath
const NODE_ENV = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }

// 工作目录：用户主目录（避免写死某台机器的路径）
const WORKSPACE = process.env.DSH_WORKSPACE || app.getPath('home')

let mainWindow = null
let tray = null
let serverProc = null
let quitting = false

// ---- 工具：端口是否已监听 ----
function isPortOpen(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host: '127.0.0.1' })
    sock.setTimeout(800)
    sock.once('connect', () => { sock.destroy(); resolve(true) })
    sock.once('timeout', () => { sock.destroy(); resolve(false) })
    sock.once('error', () => resolve(false))
  })
}

// ---- 服务托管 ----
function logFile() {
  return path.join(app.getPath('userData'), 'dsh-server.log')
}

function appendLog(text) {
  try { fs.appendFileSync(logFile(), `[${new Date().toISOString()}] ${text}\n`) } catch { /* ignore */ }
}

function ensureServer() {
  return new Promise(async (resolve, reject) => {
    if (await isPortOpen(PORT)) return resolve()

    if (!fs.existsSync(DSH_BIN)) {
      return reject(new Error(`找不到 dsh 运行时：${DSH_BIN}`))
    }

    try {
      const logFd = fs.openSync(logFile(), 'a')
      // --expose-internals：dsh web 的 HMR 服务必需（node 直接跑时默认有，
      // ELECTRON_RUN_AS_NODE 模式需显式传入）
      serverProc = spawn(NODE_EXEC, ['--expose-internals', DSH_BIN, 'web', '--port', String(PORT)], {
        cwd: WORKSPACE,
        windowsHide: true,
        env: NODE_ENV,
        stdio: ['ignore', logFd, logFd],
      })
      appendLog(`server spawned pid=${serverProc.pid} port=${PORT} bin=${DSH_BIN}`)
      serverProc.on('exit', (code, signal) => {
        appendLog(`server exited code=${code} signal=${signal}`)
        if (!quitting && mainWindow && !mainWindow.isDestroyed()) {
          dialog.showErrorBox('DeepSeek Harness 服务已退出',
            `后台服务进程意外退出（code=${code}）。请重新打开应用。`)
        }
        serverProc = null
      })
    } catch (err) {
      return reject(err)
    }

    // 轮询等待就绪
    const deadline = Date.now() + SERVER_READY_TIMEOUT_MS
    const poll = async () => {
      if (await isPortOpen(PORT)) return resolve()
      if (Date.now() > deadline) return reject(new Error('服务启动超时'))
      setTimeout(poll, 400)
    }
    poll()
  })
}

function stopServer() {
  // 1) 进程树清理（本应用 spawn 的服务）
  if (serverProc && serverProc.pid) {
    try { execFile('taskkill', ['/pid', String(serverProc.pid), '/T', '/F']) } catch { /* ignore */ }
    serverProc = null
  }
  // 2) 按端口清理（兜底：任何占用端口的监听进程）
  try {
    execFile('powershell.exe', [
      '-NoProfile', '-Command',
      `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`,
    ])
  } catch { /* ignore */ }
}

// ---- 窗口 ----
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: iconPath(),
    title: 'DeepSeek Harness',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.loadURL(URL)

  mainWindow.once('ready-to-show', () => { mainWindow.show() })

  // 外部链接用系统浏览器打开（不在应用内导航走）
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(URL)) { e.preventDefault(); shell.openExternal(url) }
  })

  // ❌ 关闭窗口 → 隐藏进托盘（不退出，不清理服务）
  mainWindow.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

function iconPath() {
  const candidates = [
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(__dirname, '..', 'dsh.ico'),
    path.join(__dirname, 'dsh.ico'),
  ]
  return candidates.find((p) => fs.existsSync(p)) || candidates[0]
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

// ---- 系统托盘 ----
function createTray() {
  let icon = nativeImage.createFromPath(iconPath())
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty()
  }
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('DeepSeek Harness')

  const menu = Menu.buildFromTemplate([
    { label: '打开 DeepSeek Harness', click: () => showWindow() },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        quitting = true
        stopServer()
        app.quit()
      },
    },
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => showWindow())
  tray.on('double-click', () => showWindow())
}

// ---- 应用生命周期 ----
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => showWindow())

  app.whenReady().then(async () => {
    try {
      await ensureServer()
    } catch (err) {
      appendLog(`server start failed: ${err.message}`)
      dialog.showErrorBox('DeepSeek Harness 启动失败',
        `后台服务未能就绪：\n${err.message}\n\n日志：${logFile()}`)
      app.quit()
      return
    }
    createWindow()
    createTray()
  })

  app.on('window-all-closed', () => {
    // 不退出：托盘常驻
  })

  app.on('before-quit', () => { quitting = true })

  app.on('will-quit', () => {
    if (!quitting) { stopServer() }
  })
}
