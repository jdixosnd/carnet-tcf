// Dev helper: screenshots routes of the running dev server (npm run dev) at 1280×800.
// Usage: npx tsx scripts/shot.ts <outDir> <route>[@dark|@narrow][,...] [seedJsonFile]
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const [outDir, routes, seedFile] = process.argv.slice(2);
const seed = seedFile ? fs.readFileSync(seedFile, 'utf8') : JSON.stringify({ settings: { onboarded: true } });
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const spec of routes.split(',')) {
  const [route, mod] = spec.split('@');
  const page = await browser.newPage({ viewport: mod === 'narrow' ? { width: 1040, height: 720 } : { width: 1280, height: 800 }, colorScheme: mod === 'dark' ? 'dark' : 'light' });
  page.on('pageerror', e => console.log('pageerror', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
  await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('carnet-desktop-dev', s); sessionStorage.setItem('seeded', '1'); } }, seed);
  await page.goto(`http://localhost:1420/#${route}`);
  await page.waitForTimeout(700);
  if (process.env.TYPE) { await page.keyboard.type(process.env.TYPE); await page.waitForTimeout(300); }
  const name = `${route.replace(/\W+/g, '_')}${mod ? '_' + mod : ''}.png`;
  await page.screenshot({ path: `${outDir}/${name}` });
  console.log('shot', name);
  await page.close();
}
await browser.close();
