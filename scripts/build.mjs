// 把 src/ 打包成 Hermes 能直接加载的单文件 ESM（plugin.js）。
// --watch：监听改动；--install：每次构建后复制到 $HERMES_HOME/desktop-plugins/claude-ui/，Hermes 会热重载。
import { build, context } from 'esbuild'
import { copyFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const watch = process.argv.includes('--watch')
const install = process.argv.includes('--install')

// Hermes 的加载器只认这三个说明符，其余一律拒载（runtime-loader.ts）。
const ALLOWED = ['@hermes/plugin-sdk', 'react', 'react/jsx-runtime']

const hermesHome =
  process.env.HERMES_HOME || (process.platform === 'win32' ? join(process.env.LOCALAPPDATA, 'hermes') : join(homedir(), '.hermes'))
const target = join(hermesHome, 'desktop-plugins', 'claude-ui')

const guard = {
  name: 'guard',
  setup(b) {
    b.onEnd(result => {
      if (result.errors.length) return
      const bad = result.metafile.outputs['plugin.js'].imports.map(i => i.path).filter(p => !ALLOWED.includes(p))
      if (bad.length) {
        console.error(`不允许的 import：${bad.join(', ')}`)
        if (!watch) process.exitCode = 1
        return
      }
      if (install) {
        mkdirSync(target, { recursive: true })
        copyFileSync('plugin.js', join(target, 'plugin.js'))
        console.log(`已安装到 ${target}`)
      }
    })
  }
}

const options = {
  entryPoints: ['src/plugin.tsx'],
  outfile: 'plugin.js',
  bundle: true,
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  external: ALLOWED,
  loader: { '.css': 'text' },
  legalComments: 'none',
  metafile: true,
  logLevel: 'info',
  plugins: [guard]
}

if (watch) await (await context(options)).watch()
else await build(options)
