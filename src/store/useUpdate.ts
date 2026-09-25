// App updates (handoff §3.9): check on launch and every 6 h; download silently when autoUpdate is on.
import { create } from 'zustand';
import { toast } from 'sonner';
import { useCarnet } from './useCarnet';

/** The part of @tauri-apps/plugin-updater's Update that we use. */
export interface PendingUpdate {
  version: string;
  body?: string;
  download(onEvent?: (e: DownloadEvent) => void): Promise<void>;
  install(): Promise<void>;
}
export type DownloadEvent =
  | { event: 'Started'; data: { contentLength?: number } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished' };
export interface UpdaterApi { check(): Promise<PendingUpdate | null>; relaunch(): Promise<void>; }

async function tauriApi(): Promise<UpdaterApi> {
  const [{ check }, { relaunch }] = await Promise.all([import('@tauri-apps/plugin-updater'), import('@tauri-apps/plugin-process')]);
  return { check, relaunch };
}

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'installing';

interface UpdateState {
  status: UpdateStatus;
  version: string;
  notes: string[];
  /** Bytes; 0 until the download starts. */
  size: number;
  received: number;
  open: boolean;
  /** `manual`: the user pressed "Check now", so say when there's nothing new or the check failed. */
  check(o?: { manual?: boolean }): Promise<void>;
  install(): Promise<void>;
  later(): void;
  /** Tests inject a fake; the app uses the Tauri plugins. */
  setApi(api: UpdaterApi | null): void;
}

let api: UpdaterApi | null = null;
let pending: PendingUpdate | null = null;
/** A version the user said "Later" to: not shown again until the next launch. */
let snoozed = '';

/** Release notes → bullets: markdown list items, or else the non-empty lines. */
export function noteLines(body = ''): string[] {
  const lines = body.split(/\r?\n/).map(l => l.trim()).filter(Boolean).filter(l => !/^#/.test(l));
  const items = lines.filter(l => /^[-*•·]\s+/.test(l));
  return (items.length ? items : lines).map(l => l.replace(/^[-*•·]\s+/, '')).slice(0, 8);
}

export const useUpdate = create<UpdateState>()((set, get) => {
  const download = async () => {
    set({ status: 'downloading', received: 0 });
    await pending!.download(e => {
      if (e.event === 'Started') set({ size: e.data.contentLength ?? 0 });
      else if (e.event === 'Progress') set({ received: get().received + e.data.chunkLength });
    });
    set({ status: 'ready' });
  };

  return {
    status: 'idle', version: '', notes: [], size: 0, received: 0, open: false,

    async check({ manual = false } = {}) {
      const s = get().status;
      if (s !== 'idle') {
        if (manual && s !== 'checking') set({ open: true }); // already found: show it again
        return;
      }
      set({ status: 'checking' });
      try {
        api ??= await tauriApi();
        const u = await api.check();
        if (!u) {
          set({ status: 'idle' });
          if (manual) toast("You're on the latest version");
          return;
        }
        pending = u;
        set({ status: 'available', version: u.version, notes: noteLines(u.body), size: 0, received: 0 });
        if (useCarnet.getState().settings.autoUpdate) await download();
        if (manual || u.version !== snoozed) set({ open: true });
      } catch (e) {
        console.error('update check', e);
        // Start over at the next check (a failed background download included).
        pending = null;
        set({ status: 'idle', open: false });
        if (manual) toast.error("Couldn't check for updates");
      }
    },

    async install() {
      if (!pending || !api) return;
      try {
        if (get().status === 'available') await download();
        set({ status: 'installing' });
        await useCarnet.getState().closeForUpdate();
        await pending.install(); // on Windows the installer takes over and the app exits here
        await api.relaunch();
      } catch (e) {
        console.error('update install', e);
        set({ status: 'available', received: 0 });
        toast.error("Couldn't install the update. Try again later.");
      }
    },

    later() {
      snoozed = get().version;
      set({ open: false });
    },

    setApi(a) {
      api = a;
      pending = null;
      snoozed = '';
      set({ status: 'idle', version: '', notes: [], size: 0, received: 0, open: false });
    },
  };
});
