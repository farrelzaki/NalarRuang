// Skrip uji/screenshot via Chrome DevTools Protocol tanpa dependensi.
// Pemakaian: node cdp.mjs <skenario.json>
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sk = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const W = sk.width ?? 1536, H = sk.height ?? 864;
const port = 9333 + Math.floor(Math.random() * 200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', `--remote-debugging-port=${port}`, `--window-size=${W},${H}`,
  '--hide-scrollbars', '--no-first-run', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'nrcdp'))}`, 'about:blank',
], { stdio: 'ignore' });

const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); if (target) break; } catch {}
  await tunggu(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const janji = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && janji.has(m.id)) { janji.get(m.id)(m); janji.delete(m.id); } });
const kirim = (method, params = {}) => new Promise((r) => { const i = ++id; janji.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await kirim('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: sk.scale ?? 1, mobile: false });
await kirim('Page.enable');
await kirim('Runtime.enable');
const evalJs = async (expr) => (await kirim('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

for (const l of sk.langkah) {
  if (l.buka) { await kirim('Page.navigate', { url: l.buka }); await tunggu(l.tunggu ?? 3000); }
  else if (l.klik) { for (const t of ['mousePressed', 'mouseReleased']) await kirim('Input.dispatchMouseEvent', { type: t, x: l.klik[0], y: l.klik[1], button: 'left', clickCount: 1 }); await tunggu(l.tunggu ?? 800); }
  else if (l.ketik) { await kirim('Input.insertText', { text: l.ketik }); await tunggu(l.tunggu ?? 300); }
  else if (l.tombol) { await kirim('Input.dispatchKeyEvent', { type: 'keyDown', key: l.tombol, ...(l.tombol === 'Enter' ? { text: String.fromCharCode(13) } : {}), code: l.tombol, windowsVirtualKeyCode: l.tombol === 'Enter' ? 13 : 27 }); await kirim('Input.dispatchKeyEvent', { type: 'keyUp', key: l.tombol, code: l.tombol, windowsVirtualKeyCode: l.tombol === 'Enter' ? 13 : 27 }); await tunggu(l.tunggu ?? 800); }
  else if (l.js) { console.log(JSON.stringify(await evalJs(l.js))); await tunggu(l.tunggu ?? 300); }
  else if (l.foto) { const r = await kirim('Page.captureScreenshot', { format: l.foto.endsWith('.jpg') ? 'jpeg' : 'png', quality: 88, ...(l.klip ? { clip: { ...l.klip, scale: 1 } } : {}) }); writeFileSync(l.foto, Buffer.from(r.result.data, 'base64')); console.log('foto', l.foto); }
}
ws.close(); chrome.kill();
process.exit(0);
