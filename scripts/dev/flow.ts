import fs from 'node:fs';
import { chromium, type Page } from '@playwright/test';
const [out, game, dark] = process.argv.slice(2);
const seed = JSON.parse(fs.readFileSync('/tmp/claude-1000/seed.json', 'utf8'));
seed.settings.game = game; seed.settings.levels = []; seed.settings.tests = null;
if (process.env.DIR) seed.settings.mcDirection = process.env.DIR;
if (process.env.LM) seed.settings.listenMode = process.env.LM;
const browser = await chromium.launch();
const page: Page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: dark ? 'dark' : 'light' });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('carnet-desktop-dev', s); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(seed));
await page.goto('http://localhost:1420/#/study');
await page.getByRole('button', { name: /Start session/ }).click();
await page.waitForTimeout(600);
const steps = (process.env.STEPS ?? 'shot').split(',');
let n = 0;
for (const s of steps) {
  if (s === 'shot') { await page.screenshot({ path: `${out}/${game}${dark ? '_dark' : ''}_${n++}.png` }); continue; }
  if (s.startsWith('type:')) { await page.keyboard.type(s.slice(5)); continue; }
  if (s.startsWith('wait')) { await page.waitForTimeout(+s.slice(4)); continue; }
  await page.keyboard.press(s);
  await page.waitForTimeout(450);
}
console.log('done', n);
await browser.close();
