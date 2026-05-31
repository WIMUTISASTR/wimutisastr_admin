// Copies WASM cores out of node_modules into public/ so they are served same-origin
// (keeps CSP connect-src 'self' and avoids committing large binaries to the repo).
// Wired into npm "postinstall" / "predev" / "prebuild".

import { cp, mkdir, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

/** @type {{ from: string; to: string }[]} */
const assets = [
  // ffmpeg.wasm single-thread core (UMD build, loaded via importScripts inside the worker)
  {
    from: 'node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js',
    to: 'public/ffmpeg/ffmpeg-core.js',
  },
  {
    from: 'node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm',
    to: 'public/ffmpeg/ffmpeg-core.wasm',
  },
  // Ghostscript WASM (PDF compression)
  { from: 'node_modules/@jspawn/ghostscript-wasm/gs.mjs', to: 'public/ghostscript/gs.mjs' },
  { from: 'node_modules/@jspawn/ghostscript-wasm/gs.js', to: 'public/ghostscript/gs.js' },
  { from: 'node_modules/@jspawn/ghostscript-wasm/browser.js', to: 'public/ghostscript/browser.js' },
  { from: 'node_modules/@jspawn/ghostscript-wasm/gs.wasm', to: 'public/ghostscript/gs.wasm' },
]

async function exists(p) {
  try {
    await access(p, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function main() {
  let copied = 0
  let missing = 0
  for (const asset of assets) {
    const src = path.join(root, asset.from)
    const dest = path.join(root, asset.to)

    if (!(await exists(src))) {
      console.warn(`[copy-wasm] source missing, skipping: ${asset.from}`)
      missing++
      continue
    }

    await mkdir(path.dirname(dest), { recursive: true })
    await cp(src, dest)
    copied++
  }

  console.log(`[copy-wasm] copied ${copied} asset(s)${missing ? `, ${missing} missing` : ''}`)
}

main().catch((err) => {
  // Don't fail install/build hard if assets can't be copied; the runtime falls back
  // to uploading the original (uncompressed) file.
  console.error('[copy-wasm] failed:', err)
})
