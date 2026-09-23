// Backup file/clipboard actions: Tauri plugins in the app, browser APIs in dev.
import { isTauri } from '../../repo/env';
import { encodeBackup, parseBackupJson, toBackupJson, type BackupData } from '../../lib/backup';
import type { UserData } from '../../data/types';

const today = () => new Date().toISOString().slice(0, 10);

export async function copyBackupCode(d: UserData): Promise<void> {
  const code = encodeBackup(d);
  if (isTauri()) {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(code);
  } else await navigator.clipboard.writeText(code);
}

/** Returns false if the user cancelled. */
export async function saveBackupFile(d: UserData): Promise<boolean> {
  const json = toBackupJson(d);
  const name = `carnet-backup-${today()}.carnet`;
  if (isTauri()) {
    const [{ save }, { writeTextFile }] = await Promise.all([import('@tauri-apps/plugin-dialog'), import('@tauri-apps/plugin-fs')]);
    const path = await save({ defaultPath: name, filters: [{ name: 'Carnet backup', extensions: ['carnet'] }] });
    if (!path) return false;
    await writeTextFile(path, json);
    return true;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}

/** Returns null if the user cancelled; throws BackupError for a bad file. */
export async function openBackupFile(): Promise<BackupData | null> {
  if (isTauri()) {
    const [{ open }, { readTextFile }] = await Promise.all([import('@tauri-apps/plugin-dialog'), import('@tauri-apps/plugin-fs')]);
    const path = await open({ multiple: false, directory: false, filters: [{ name: 'Carnet backup', extensions: ['carnet', 'json'] }] });
    if (!path || Array.isArray(path)) return null;
    return parseBackupJson(await readTextFile(path));
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.carnet,.json';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      f.text().then(t => { try { resolve(parseBackupJson(t)); } catch (e) { reject(e); } }, reject);
    };
    input.click();
  });
}
