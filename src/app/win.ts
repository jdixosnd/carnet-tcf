// Window controls — no-ops outside Tauri (browser dev / tests).
import { isTauri } from '../repo/env';

async function current() {
  if (!isTauri()) return null;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}
export const minimize = async () => { await (await current())?.minimize(); };
export const toggleMaximize = async () => { await (await current())?.toggleMaximize(); };
export const closeWindow = async () => { if (isTauri()) await (await current())?.close(); else window.close(); };
