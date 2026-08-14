/**
 * electron-builder afterPack 钩子：
 * 把 dsh 运行时复制进 resources/dsh-runtime。
 *
 * 为什么不用 extraResources？
 * electron-builder 的 createFilter 会硬编码排除源目录顶层的
 * node_modules（util/filter.js），extraResources 无法带上依赖树。
 * afterPack 用 fs.cpSync 直接复制，绕开所有过滤规则。
 */
const fs = require('fs')
const path = require('path')

exports.default = async function afterPack(context) {
  const { appOutDir } = context
  const src = path.join(__dirname, '..', 'runtime')
  const dest = path.join(appOutDir, 'resources', 'dsh-runtime')

  if (!fs.existsSync(src)) {
    console.warn('[afterPack] runtime 目录不存在，跳过：' + src)
    return
  }

  console.log('[afterPack] copying runtime -> ' + dest)
  fs.cpSync(src, dest, { recursive: true })
  console.log('[afterPack] done, size=' +
    Math.round((fs.readdirSync(dest, { recursive: true }).length)))
}
