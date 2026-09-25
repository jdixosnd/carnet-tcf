import fs from 'node:fs';
import path from 'node:path';
import { APP_VERSION } from './defaults';

const root = path.resolve(import.meta.dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

// The updater compares the installed version with the release's: all four must move together.
test('the version is the same everywhere', () => {
  expect(JSON.parse(read('package.json')).version).toBe(APP_VERSION);
  expect(JSON.parse(read('src-tauri/tauri.conf.json')).version).toBe(APP_VERSION);
  expect(/^version = "(.+)"$/m.exec(read('src-tauri/Cargo.toml'))?.[1]).toBe(APP_VERSION);
});
