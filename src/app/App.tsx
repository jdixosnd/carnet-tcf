import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Toaster, toast } from 'sonner';
import { TitleBar } from './TitleBar';
import { AppShell } from './AppShell';
import { BootGate } from './BootGate';
import { applyTheme } from './theme';
import { useHotkeys } from './useHotkeys';
import { useCarnet } from '../store/useCarnet';
import { initPlayer } from '../lib/audio/player';
import { StudyPage } from '../features/study/StudyPage';
import { SessionPage } from '../features/session/SessionPage';
import { CompletePage } from '../features/session/CompletePage';
import { SearchPage } from '../features/search/SearchPage';
import { ProgressPage } from '../features/progress/ProgressPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { WelcomePage } from '../features/onboarding/WelcomePage';

let warnedAudio = false;

/** Wiring that needs the loaded store: theme, audio, the day clock, first-run redirect, Ctrl+K. */
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
    if (!onboarded && loc.pathname !== '/welcome') navigate('/welcome', { replace: true });
  }, [onboarded, loc.pathname, navigate]);

  useHotkeys({
    'Ctrl+k': () => {
      if (loc.pathname === '/session' || loc.pathname === '/welcome') return;
      navigate('/search');
      setTimeout(() => document.getElementById('search-input')?.focus(), 0);
    },
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
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/study" element={<StudyPage />} />
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
