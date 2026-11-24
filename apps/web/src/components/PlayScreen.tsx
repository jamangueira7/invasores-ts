import { useEffect, useRef, useState } from 'react';
import type { Game, GameEvents } from '@lab/domain';
import { runSession } from '../game/session';
import type { ScoreBoard } from '../game/score-board';
import '../game/score-board';

interface Props {
  game: Game;
  onGameOver: (result: GameEvents['gameOver']) => void;
  onQuit: () => void;
  onSave?: () => Promise<void>;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A tela da partida: canvas, placar, controles de toque e pausa. Só liga a tela ao `Game`. */
export function PlayScreen({ game, onGameOver, onQuit, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(game.status === 'paused');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    (boardRef.current as ScoreBoard | null)!.game = game;
    const controller = new AbortController();
    const togglePause = () => {
      game.togglePause();
      setPaused(game.status === 'paused');
    };
    const offOver = game.on('gameOver', (result) => {
      setTimeout(() => onGameOver(result), 1400);
    });
    runSession(game, canvas, controller.signal, { reducedMotion: reducedMotion(), onPause: togglePause }).catch(
      (err: unknown) => console.error(err),
    );
    return () => {
      offOver();
      controller.abort();
      Object.assign(game.controls, { left: false, right: false, fire: false });
    };
  }, [game, onGameOver]);

  const hold = (key: 'left' | 'right' | 'fire') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      game.controls[key] = true;
      if (key === 'fire') game.playerFire();
    },
    onPointerUp: () => (game.controls[key] = false),
    onPointerCancel: () => (game.controls[key] = false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const togglePause = () => {
    game.togglePause();
    setPaused(game.status === 'paused');
    setSaveMsg(null);
  };

  const save = async () => {
    if (!onSave) return;
    setSaveMsg('Salvando…');
    try {
      await onSave();
      setSaveMsg('Jogo salvo. Dá para continuar depois pelo menu.');
    } catch {
      setSaveMsg('Não deu para salvar agora.');
    }
  };

  return (
    <section className="play" aria-label="Partida">
      <score-board ref={boardRef} />
      <div className="stage">
        <canvas ref={canvasRef} className="screen" aria-label="Campo de batalha" />
        {paused && (
          <div className="overlay" role="dialog" aria-label="Pausa">
            <h2>Pausa</h2>
            <p className="muted">Aperte P para voltar.</p>
            <div className="overlay-actions">
              <button className="btn btn-primary" onClick={togglePause} autoFocus>
                Continuar
              </button>
              {onSave && (
                <button className="btn btn-ghost" onClick={save}>
                  Salvar jogo
                </button>
              )}
              <button className="btn btn-ghost" onClick={onQuit}>
                Sair
              </button>
            </div>
            {saveMsg && (
              <p className="hint" role="status">
                {saveMsg}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="touch" aria-label="Controles de toque">
        <button className="pad" aria-label="Esquerda" {...hold('left')}>
          ◀
        </button>
        <button className="pad" aria-label="Direita" {...hold('right')}>
          ▶
        </button>
        <button className="pad pad-pause" aria-label="Pausar" onClick={togglePause}>
          ❚❚
        </button>
        <button className="pad pad-fire" aria-label="Atirar" {...hold('fire')}>
          Fogo
        </button>
      </div>
      <p className="keys muted">
        <kbd>←</kbd> <kbd>→</kbd> ou <kbd>A</kbd> <kbd>D</kbd> andam · <kbd>Espaço</kbd> atira · <kbd>P</kbd> pausa
      </p>
    </section>
  );
}
