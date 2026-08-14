# DeepSeek Harness Desktop

> English | [中文](README.md)

Package [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) into a Codex-style desktop app:
native window, system tray residency, close-to-tray (no background cleanup), and fully quits only from the tray.

## Features

- 🖥️ **Native desktop window** — no address bar, no menu bar; looks and feels like a standalone app
- 🧭 **System tray residency** — clicking ❌ only hides the window; the background service and tray keep running
- 🚀 **Out-of-the-box** — the dsh runtime is bundled; users do **NOT need to install Node.js / npm**
- 🛑 **Full shutdown** — only tray right-click → Exit truly stops the service and quits the app
- 🔄 **Auto recovery** — the app auto-starts the dsh web service on launch and detects crashes

## Download & Install

Download `DeepSeek-Harness-Setup-x.y.z.exe` from [Releases](../../releases),
double-click to install, and a "DeepSeek Harness" icon will appear on your desktop.

## Usage

| Action | Behavior |
|---|---|
| Double-click desktop icon | Opens the UI (starts the service if not running) |
| Click window ❌ | Hides to system tray; background service keeps running |
| Double-click tray icon | Shows the window again |
| Tray right-click → Exit | Full shutdown (close window + stop service + quit app) |

## Build from Source

Requirements: Node.js ≥ 20, npm.

```bash
# 1. Install dependencies (electron + electron-builder)
npm install

# 2. Install the dsh runtime (bundled into the installer)
cd runtime
npm install --omit=dev
cd ..

# 3. Build the NSIS installer (output in dist/)
npm run dist
```

> In China, you may want to use a faster npm mirror:
> `npm install --registry=https://registry.npmmirror.com`

## Environment Variables (Optional)

| Variable | Description | Default |
|---|---|---|
| `DSH_WEB_PORT` | Service port | `3080` |
| `DSH_WORKSPACE` | Service working directory | User home |

## How It Works

- The main process (`main.js`) owns the full lifecycle of the dsh web service:
  on startup it detects the port and spawns the service if not running; on exit it cleans up
  both the process tree and the port (double safety).
- The service runs on Electron's built-in Node core (`ELECTRON_RUN_AS_NODE`),
  so no system-level Node.js is required.
- The dsh runtime lives at `<resources>/dsh-runtime` (installed) or `./runtime` (dev mode).

## Credits & License

- Core engine: [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (MIT License, Copyright (c) 2026 DeepSeek)
- This desktop shell: MIT License, see [LICENSE](LICENSE)
