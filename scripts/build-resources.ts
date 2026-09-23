// Builds src-tauri/resources from an extracted "TCF Data" folder:
//   words.json (the web app's compact rows), audio_index.json, audio/*.mp3
// Usage: TCF_DATA="/path/to/TCF Data" npm run resources
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The archive comes in 4 parts; unzipped side by side, each part holds some of 4_app/audio.
// Accept one merged folder, or a folder containing the "TCF Data - part N of 4" folders.
const bases = [process.env.TCF_DATA, path.join(os.homedir(), 'Downloads/TCF Data')].filter((p): p is string => !!p);
const candidates = bases.flatMap(b => {
  const parts = fs.existsSync(b) ? fs.readdirSync(b).filter(d => /part \d+ of \d+$/.test(d)).map(d => path.join(b, d, 'TCF Data')) : [];
  return [b, path.join(b, 'TCF Data'), ...parts];
});
const roots = [...new Set(candidates)].filter(p => fs.existsSync(path.join(p, '4_app')));
const root = roots.find(p => fs.existsSync(path.join(p, '4_app/carnet-tcf.html')));
if (!root) {
  console.error(`Could not find "4_app/carnet-tcf.html". Unzip the TCF Data archives and set TCF_DATA to the folder that contains 4_app/.\nTried:\n  ${candidates.join('\n  ')}`);
  process.exit(1);
}
const out = path.resolve(import.meta.dirname, '../src-tauri/resources');
fs.mkdirSync(path.join(out, 'audio'), { recursive: true });

const html = fs.readFileSync(path.join(root, '4_app/carnet-tcf.html'), 'utf8');
const m = html.match(/<script type="application\/json" id="words-data">([\s\S]*?)<\/script>/);
if (!m) throw new Error('words-data block not found in carnet-tcf.html');
const rows = JSON.parse(m[1]) as unknown[];
if (rows.length !== 4842) throw new Error(`expected 4842 words, found ${rows.length}`);
fs.writeFileSync(path.join(out, 'words.json'), JSON.stringify(rows));
fs.copyFileSync(path.join(root, '4_app/audio_index.json'), path.join(out, 'audio_index.json'));

let copied = 0;
const packs = new Set<string>();
for (const r of roots) {
  const audioDir = path.join(r, '4_app/audio');
  if (!fs.existsSync(audioDir)) continue;
  for (const f of fs.readdirSync(audioDir)) {
    packs.add(f);
    const src = path.join(audioDir, f), dst = path.join(out, 'audio', f);
    if (fs.existsSync(dst) && fs.statSync(dst).size === fs.statSync(src).size) continue;
    fs.copyFileSync(src, dst); copied++;
  }
}
const index = JSON.parse(fs.readFileSync(path.join(out, 'audio_index.json'), 'utf8')) as { w: { files: string[] }; s: { files: string[] } };
const missing = [...index.w.files, ...index.s.files].map(f => path.basename(f)).filter(f => !packs.has(f));
if (missing.length) {
  console.error(`Missing ${missing.length} audio packs (e.g. ${missing.slice(0, 3).join(', ')}). Unzip all 4 parts of the TCF Data archive.`);
  process.exit(1);
}
console.log(`resources: ${rows.length} words, ${packs.size} audio packs (${copied} copied) from ${roots.length} folder(s)`);
