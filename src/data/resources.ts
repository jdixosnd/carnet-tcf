import { isTauri } from '../repo/env';

/** URL of a generated resource (words.json, audio/w000.mp3, …) in Tauri or in the browser build. */
export async function resourceUrl(rel: string): Promise<string> {
  if (!isTauri()) return `/resources/${rel}`;
  const { resolveResource } = await import('@tauri-apps/api/path');
  const { convertFileSrc } = await import('@tauri-apps/api/core');
  return convertFileSrc(await resolveResource(`resources/${rel}`));
}
