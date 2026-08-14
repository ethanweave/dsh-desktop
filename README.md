# DeepSeek Harness Desktop

把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 打包成类 Codex 的桌面应用：
原生窗口、系统托盘常驻、关窗不退出、托盘退出才彻底关停。

## 特性

- 🖥️ **原生桌面窗口**：无地址栏、无菜单栏，看起来就是独立应用
- 🧭 **系统托盘常驻**：点 ❌ 只是隐藏窗口，后台服务与托盘保持运行
- 🚀 **开箱即用**：dsh 运行时随应用打包，用户机器**无需安装 Node.js / npm**
- 🛑 **彻底关停**：托盘右键「退出」才真正停止后台服务并退出应用
- 🔄 **自动恢复**：应用启动时自动拉起 dsh web 服务，崩溃自动检测

## 下载安装

从 [Releases](../../releases) 下载 `DeepSeek-Harness-Setup-x.y.z.exe`，
双击安装，桌面上会出现「DeepSeek Harness」图标。

## 使用

| 操作 | 行为 |
|---|---|
| 双击桌面图标 | 打开界面（服务未运行自动拉起） |
| 点窗口 ❌ | 隐藏到系统托盘，后台服务不中断 |
| 双击托盘图标 | 重新显示窗口 |
| 托盘右键 → 退出 | 彻底关停（关窗口 + 停服务 + 退出应用） |

## 从源码构建

前置要求：Node.js ≥ 20、npm。

```bash
# 1. 安装依赖（electron + electron-builder）
npm install

# 2. 安装 dsh 运行时（随应用打包，供安装版使用）
cd runtime
npm install --omit=dev
cd ..

# 3. 打包 NSIS 安装程序（输出在 dist/）
npm run dist
```

> 国内网络可加镜像加速：
> `npm install --registry=https://registry.npmmirror.com`

## 环境变量（可选）

| 变量 | 说明 | 默认 |
|---|---|---|
| `DSH_WEB_PORT` | 服务端口 | `3080` |
| `DSH_WORKSPACE` | 服务工作目录 | 用户主目录 |

## 工作原理

- 主进程 `main.js` 负责 dsh web 服务完整生命周期：
  启动时按端口检测，未运行则 spawn；退出时按进程树 + 端口双保险清理。
- 服务用 Electron 自带的 node 内核运行（`ELECTRON_RUN_AS_NODE`），
  无需系统级 Node.js。
- dsh 运行时位于 `<resources>/dsh-runtime`（安装版）或 `./runtime`（开发模式）。

## 致谢与许可

- 核心引擎：[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（MIT License, Copyright (c) 2026 DeepSeek）
- 本桌面壳：MIT License，见 [LICENSE](LICENSE)
