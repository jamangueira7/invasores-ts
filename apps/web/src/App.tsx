import { useCallback, useEffect, useState } from 'react';
import { Game, type GameEvents, loadGame, SaveCorruptedError, toSnapshot } from '@lab/domain';
import { fetchSave, saveGame } from './api';
import { PlayScreen } from './components/PlayScreen';
import { GameOverScreen, MenuScreen } from './components/screens';
import { DebugScreen, StatsScreen } from './components/StatsScreen';

type Screen =
  | { name: 'menu' }
  | { name: 'play'; game: Game }
  | { name: 'over'; result: GameEvents['gameOver'] }
  | { name: 'stats' }
  | { name: 'debug' };

/** Cap. 14: só registra no console quando um jogo antigo é coletado pelo GC. */
const collected = new FinalizationRegistry<string>((label) => console.info(`[gc] ${label} foi coletado`));
let created = 0;
function track(game: Game): Game {
  collected.register(game, `Game #${++created}`);
  return game;
}

const initial = (): Screen => (location.hash === '#/debug' ? { name: 'debug' } : { name: 'menu' });

export function App() {
  const [screen, setScreen] = useState<Screen>(initial);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => setScreen(initial());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const play = () => {
    setLoadError(null);
    setScreen({ name: 'play', game: track(new Game()) });
  };
  const toMenu = () => {
    if (location.hash) history.replaceState(null, '', location.pathname);
    setScreen({ name: 'menu' });
  };
  const onGameOver = useCallback((result: GameEvents['gameOver']) => setScreen({ name: 'over', result }), []);

  const load = async () => {
    setLoadError(null);
    try {
      const bytes = await fetchSave();
      setScreen({ name: 'play', game: track(loadGame(new TextDecoder().decode(bytes))) });
    } catch (err) {
      if (err instanceof SaveCorruptedError) {
        setLoadError(`O jogo salvo está corrompido (${err.reason}). Comece um jogo novo.`);
      } else {
        setLoadError(err instanceof Error ? err.message : 'Não deu para carregar o jogo.');
      }
    } finally {
      console.info('[save] tentativa de carga concluída');
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <button className="brand" onClick={toMenu} aria-label="Voltar ao menu">
          <svg className="brand-mark" viewBox="0 0 34 24" aria-hidden="true">
            <path d="M3 21V12Q17-1 31 12v9Z" fill="#f472b6" />
            <circle cx="11.5" cy="14" r="3" fill="#0b1020" />
            <circle cx="22.5" cy="14" r="3" fill="#0b1020" />
          </svg>
          <span>
            <strong>Invasores</strong>
            <small>Laboratório 3 · TypeScript</small>
          </span>
        </button>
      </header>
      <main>
        {screen.name === 'menu' && (
          <MenuScreen
            onPlay={play}
            onStats={() => setScreen({ name: 'stats' })}
            onLoad={load}
            loadError={loadError}
          />
        )}
        {screen.name === 'play' && (
          <PlayScreen
            key={created}
            game={screen.game}
            onGameOver={onGameOver}
            onQuit={toMenu}
            onSave={() => saveGame(toSnapshot(screen.game))}
          />
        )}
        {screen.name === 'over' && (
          <GameOverScreen result={screen.result} onAgain={play} onStats={() => setScreen({ name: 'stats' })} />
        )}
        {screen.name === 'stats' && <StatsScreen onBack={toMenu} />}
        {screen.name === 'debug' && <DebugScreen onBack={toMenu} />}
      </main>
    </div>
  );
}
