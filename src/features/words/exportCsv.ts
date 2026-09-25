// Saves the Words CSV: the Tauri save dialog in the app, a download in dev.
import { isTauri } from '../../repo/env';

/** Returns false if the user cancelled. */
export async function saveCsvFile(csv: string, name = 'carnet-words.csv'): Promise<boolean> {
  if (isTauri()) {
    const [{ save }, { writeTextFile }] = await Promise.all([import('@tauri-apps/plugin-dialog'), import('@tauri-apps/plugin-fs')]);
    const path = await save({ defaultPath: name, filters: [{ name: 'CSV', extensions: ['csv'] }] });
    if (!path) return false;
    await writeTextFile(path, csv);
    return true;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
