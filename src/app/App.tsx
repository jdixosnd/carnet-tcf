import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Toaster, toast } from 'sonner';
import { TitleBar } from './TitleBar';
import { AppShell } from './AppShell';
import { NAV } from './Sidebar';
import { BootGate } from './BootGate';
import { applyTheme } from './theme';
import { useHotkeys } from './useHotkeys';
import { useCarnet } from '../store/useCarnet';
import { initPlayer } from '../lib/audio/player';
import { StudyPage } from '../features/study/StudyPage';
import { SessionPage } from '../features/session/SessionPage';
import { CompletePage } from '../features/session/CompletePage';
import { SearchPage } from '../features/search/SearchPage';
import { WordsPage } from '../features/words/WordsPage';
import { ProgressPage } from '../features/progress/ProgressPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { WelcomePage } from '../features/onboarding/WelcomePage';
import { UpdateDialog } from '../features/update/UpdateDialog';
import { useUpdate } from '../store/useUpdate';
import { isTauri } from '../repo/env';

let warnedAudio = false;

/** Wiring that needs the loaded store: theme, audio, the day clock, update checks, first-run redirect, Ctrl+K and Ctrl+1…5. */
function Effects() {
  const theme = useCarnet(s => s.settings.theme);
  const onboarded = useCarnet(s => s.settings.onboarded);
  const audio = useCarnet(s => s.audio);
  const words = useCarnet(s => s.words);
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    if (!audio) return;
    initPlayer({
      index: audio, words,
      getVoice: () => useCarnet.getState().settings.voice,
      getSpeed: () => useCarnet.getState().settings.speed,
      onFallback: () => {
        if (warnedAudio) return;
        warnedAudio = true;
        toast('Using Windows voice for audio');
      },
    });
  }, [audio, words]);

  useEffect(() => {
    const tick = () => useCarnet.getState().tick();
    const id = setInterval(tick, 60_000);
    window.addEventListener('focus', tick);
    return () => { clearInterval(id); window.removeEventListener('focus', tick); };
  }, []);

  useEffect(() => {
    // The installed app only (not the browser dev build): 5 s after launch, then every 6 h.
    if (!isTauri() || import.meta.env.DEV) return;
    const check = () => void useUpdate.getState().check();
    const first = setTimeout(check, 5_000);
    const every = setInterval(check, 6 * 3_600_000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, []);

  useEffect(() => {
    if (!onboarded && loc.pathname !== '/welcome') navigate('/welcome', { replace: true });
  }, [onboarded, loc.pathname, navigate]);

  const inShell = loc.pathname !== '/session' && loc.pathname !== '/welcome' && loc.pathname !== '/complete';
  useHotkeys({
    'Ctrl+k': () => {
      if (loc.pathname === '/session' || loc.pathname === '/welcome') return;
      navigate('/search');
      setTimeout(() => document.getElementById('search-input')?.focus(), 0);
    },
    // Ctrl+1…5: the sidebar pages, in order.
    ...Object.fromEntries(NAV.map(({ to }, k) => [`Ctrl+${k + 1}`, () => { if (inShell) navigate(to); }])),
  });
  return null;
}

export function App() {
  return (
    <TooltipPrimitive.Provider>
      <div className="flex h-full flex-col bg-paper text-ink">
        <TitleBar />
        <BootGate>
          <HashRouter>
            <Effects />
            <UpdateDialog />
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/study" element={<StudyPage />} />
                <Route path="/words" element={<WordsPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="/session" element={<SessionPage />} />
              <Route path="/complete" element={<CompletePage />} />
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="*" element={<Navigate to="/study" replace />} />
            </Routes>
          </HashRouter>
        </BootGate>
      </div>
      <Toaster position="bottom-right" offset={24} toastOptions={{
        className: 'font-sans',
        style: { background: 'var(--c-ink)', color: 'var(--c-on-ink)', border: 'none', borderRadius: 10, fontSize: 14 },
      }} />
    </TooltipPrimitive.Provider>
  );
}
