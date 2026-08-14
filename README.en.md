# 🐋 DeepSeek Harness Desktop

> **Codex-style desktop app for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)** — native window, system tray, close-to-tray, quit-only-from-tray.

<p align="center">
  <img src="assets/dsh-logo-black.svg" alt="DeepSeek Harness Logo" width="120" />
</p>

[![Release](https://img.shields.io/github/v/release/ethanweave/dsh-desktop?style=for-the-badge&color=4d6bfe)](https://github.com/ethanweave/dsh-desktop/releases)
[![Windows](https://img.shields.io/badge/Windows-11_10-0078d6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/ethanweave/dsh-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron_43-47848f?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

Tired of running DeepSeek Harness in a browser tab? This app wraps `dsh web` into a **native desktop application** that feels exactly like Codex: a real window, a system tray icon, and a lifecycle that *you* control.

```
┌─────────────────────────────────────┐
│  🖥️ Native window (no URL bar)      │  ← double-click to open
├─────────────────────────────────────┤
│                                     │
│        DeepSeek Harness UI          │
│                                     │
├─────────────────────────────────────┤
│  ❌ click → hide to tray (keeps     │
│  running in background)             │
└─────────────────────────────────────┘
        🧭 tray icon →  Exit  → full shutdown
```

## ✨ Features

| | Feature | What it means |
|---|---|---|
| 🖥️ | **Native window** | No address bar, no menu bar — looks like a real desktop app, not a browser tab |
| 🧭 | **System tray residency** | Clicking ❌ only hides the window; the service and tray keep running |
| 🚀 | **Zero-dependency install** | The dsh runtime is bundled — users **do NOT need Node.js / npm** |
| 🛑 | **Full shutdown** | Only tray right-click → **Exit** truly stops the service and quits the app |
| 🔄 | **Auto recovery** | Auto-starts the `dsh web` service on launch; detects crashes |
| 🔒 | **Single instance** | Second launch focuses the existing window instead of duplicating |

## 📥 Download & Install

Grab **`DeepSeek-Harness-Setup-x.y.z.exe`** from the [Releases page](../../releases).

1. Double-click the installer
2. A **DeepSeek Harness** icon appears on your desktop
3. Done — no Node.js, no npm, no config

> The installer bundles the full dsh runtime (~150 MB), so it works on any clean Windows machine.

## 🎮 Usage

| Action | Behavior |
|---|---|
| **Double-click** desktop icon | Opens the UI (starts service automatically if not running) |
| **Click ❌** on window | Hides to system tray — background service keeps running |
| **Double-click** tray icon | Shows the window again |
| **Tray right-click → Exit** | **Full shutdown** — closes window, stops service, quits app |

## 🛠 Build from Source

Requirements: Node.js ≥ 20, npm.

```bash
# 1. Install build dependencies (electron + electron-builder)
npm install

# 2. Install the dsh runtime (bundled into the installer)
cd runtime && npm install --omit=dev && cd ..

# 3. Build the NSIS installer (outputs to dist/)
npm run dist
```

> China mirror: `npm install --registry=https://registry.npmmirror.com`

## ⚙️ Environment Variables (Optional)

| Variable | Description | Default |
|---|---|---|
| `DSH_WEB_PORT` | Service port | `3080` |
| `DSH_WORKSPACE` | Service working directory | User home |

## 🔧 How It Works

The main process (`main.js`) owns the **full lifecycle** of the dsh web service:

```
launch → port check → (not running?) → spawn dsh web → wait ready → open window
                                              │
quit   ← tray Exit ← hide ← ❌ click ← open window
   │
   └─ kill process tree + port cleanup (double safety)
```

- The service runs on **Electron's built-in Node core** (`ELECTRON_RUN_AS_NODE` + `--expose-internals`), so no system Node.js is required
- The dsh runtime lives at `<resources>/dsh-runtime` (installed) or `./runtime` (dev mode)
- `afterPack` hook copies the runtime into the installer, bypassing electron-builder's node_modules exclusion

## 🤔 Why not just use the browser?

| | Browser tab | This app |
|---|---|---|
| Window | Tab in a browser | Dedicated native window |
| Close | Loses your place | Hides to tray, instant reopen |
| Background | Must keep browser open | Service managed independently |
| Look & feel | Browser chrome everywhere | Clean desktop app |

## 📦 Project Layout

```
├── main.js               # Main process: window + tray + service lifecycle
├── runtime/              # dsh runtime (bundled into installer)
├── scripts/afterPack.js  # electron-builder hook: copies runtime
├── assets/               # Official black-white whale logo (SVG)
└── dist/                 # Build output (installer .exe)
```

## 📄 Credits & License

- Core engine: [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (MIT License, Copyright (c) 2026 DeepSeek)
- Logo: DeepSeek Harness official brand ([deepseek-ai](https://github.com/deepseek-ai))
- This desktop shell: [MIT License](LICENSE)

---

⭐ If this saves you from another browser tab, consider a star — it helps others find it.
