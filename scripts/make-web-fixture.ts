// Produces tests/fixtures/web-backup.txt: a real backup code exported by the web app
// after a short session with non-default settings. Usage: TCF_DATA=… npx tsx scripts/make-web-fixture.ts
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = [process.env.TCF_DATA, path.join(os.homedir(), 'Downloads/TCF Data/TCF Data'), path.join(os.homedir(), 'Downloads/TCF Data')]
  .filter((p): p is string => !!p).find(p => fs.existsSync(path.join(p, '4_app/carnet-tcf.html')));
if (!root) throw new Error('Set TCF_DATA to the folder containing 4_app/');
const dir = path.join(root, '4_app');

const server = http.createServer((req, res) => {
  const p = path.join(dir, decodeURIComponent((req.url ?? '/').split('?')[0]));
  if (!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; res.end(); return; }
  const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.mp3': 'audio/mpeg' };
  res.setHeader('Content-Type', types[path.extname(p)] ?? 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = (server.address() as { port: number }).port;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${port}/carnet-tcf.html`);
await page.click('#f-levels [data-lvl="A2"]');
await page.selectOption('#f-test', '7');
await page.click('.start-btn[data-action="start"]');
for (const grade of ['3', '1', '2']) {
  await page.keyboard.press('Space');
  await page.waitForSelector('[data-grade]');
  await page.keyboard.press(grade);
}
await page.keyboard.press('Escape');
await page.click('.tab[data-tab="progress"]');
await page.selectOption('#s-len', '20');
await page.click('#copy-backup');
const code = await page.inputValue('#backup-out');
fs.writeFileSync(path.resolve(import.meta.dirname, '../tests/fixtures/web-backup.txt'), code);
console.log(`wrote ${code.length} chars`);
await browser.close();
server.close();
