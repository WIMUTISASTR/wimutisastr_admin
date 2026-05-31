/* eslint-disable */
// Classic Web Worker that runs Ghostscript-WASM to compress PDFs off the main thread.
//
// Loaded as a CLASSIC worker on purpose: gs.js detects its environment via `importScripts`,
// which is undefined in module workers (it would misdetect a shell/node env and break path
// resolution). The WASM core + glue are copied to /public/ghostscript at build time.

importScripts('/ghostscript/browser.js', '/ghostscript/gs.js')

// browser.js seeds globalThis.exports, gs.js assigns the Emscripten module factory onto it.
var createGhostscript = self.exports && self.exports.Module

self.onmessage = async function (event) {
  var data = event.data || {}
  var id = data.id
  var bytes = data.bytes
  var args = data.args

  if (typeof createGhostscript !== 'function') {
    self.postMessage({ id: id, ok: false, error: 'Ghostscript module unavailable' })
    return
  }

  try {
    var gs = await createGhostscript({
      locateFile: function (file) {
        return '/ghostscript/' + file
      },
      print: function () {},
      printErr: function () {},
    })

    gs.FS.writeFile('input.pdf', new Uint8Array(bytes))
    gs.callMain(args)
    var output = gs.FS.readFile('output.pdf') // Uint8Array

    var buffer = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength)
    self.postMessage({ id: id, ok: true, bytes: buffer }, [buffer])
  } catch (err) {
    self.postMessage({
      id: id,
      ok: false,
      error: (err && err.message) ? err.message : String(err),
    })
  }
}
