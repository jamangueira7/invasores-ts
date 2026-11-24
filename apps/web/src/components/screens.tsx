import { useEffect, useRef, useState } from 'react';
import { type GameEvents, INVADER_TYPES, InvaderType, PLAYER_NAME_MAX, POINTS_BY_TYPE } from '@lab/domain';
import { drawInvader, INVADER_COLORS, INVADER_NAMES } from '../game/sprites';
import { saveResult } from '../api';

/** Invasor desenhado com a mesma função do jogo, para a legenda e as estatísticas. */
export function InvaderIcon({ type, size = 34 }: { type: InvaderType; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const scale = (size / 40) * Math.min(2, window.devicePixelRatio || 1);
    canvas.width = 40 * scale;
    canvas.height = 32 * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawInvader(ctx, type, 3, 4, 0);
  }, [type, size]);
  return <canvas ref={ref} className="invader-icon" style={{ width: size, height: size * 0.8 }} aria-hidden="true" />;
}

interface MenuProps {
  onPlay: () => void;
  onStats: () => void;
  onLoad: () => void;
  loadError: string | null;
}

export function MenuScreen({ onPlay, onStats, onLoad, loadError }: MenuProps) {
  return (
    <section className="menu card-dark">
      <p className="eyebrow">Laboratório 3</p>
      <h2 className="title">Invasores</h2>
      <p className="lead">Segure a base. Cada onda desce mais rápido que a anterior.</p>
      <ul className="legend">
        {[...INVADER_TYPES].reverse().map((t) => (
          <li key={t} style={{ '--c': INVADER_COLORS[t] } as React.CSSProperties}>
            <InvaderIcon type={t} />
            <span>{INVADER_NAMES[t]}</span>
            <strong>{POINTS_BY_TYPE[t]} pts</strong>
          </li>
        ))}
      </ul>
      <div className="menu-actions">
        <button className="btn btn-primary btn-big" onClick={onPlay} autoFocus>
          Jogar
        </button>
        <button className="btn btn-ghost" onClick={onLoad}>
          Continuar jogo salvo
        </button>
        <button className="btn btn-ghost" onClick={onStats}>
          Ranking e estatísticas
        </button>
      </div>
      {loadError && (
        <p className="hint" role="alert">
          {loadError}
        </p>
      )}
      <p className="keys muted">
        <kbd>←</kbd> <kbd>→</kbd> andam · <kbd>Espaço</kbd> atira · <kbd>P</kbd> pausa · <a href="#/debug">debug do save</a>
      </p>
    </section>
  );
}

interface OverProps {
  result: GameEvents['gameOver'];
  onAgain: () => void;
  onStats: () => void;
}

export function GameOverScreen({ result, onAgain, onStats }: OverProps) {
  const [name, setName] = useState(() => localStorage.getItem('invasores:name') ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Escreva um nome para entrar no ranking.');
      return;
    }
    setStatus('saving');
    setError(null);
    try {
      await saveResult({ name: trimmed, score: result.score, wave: result.wave, kills: result.kills });
      localStorage.setItem('invasores:name', trimmed);
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Falha ao salvar.');
    }
  };

  return (
    <section className="menu card-dark" aria-live="polite">
      <p className="eyebrow">Fim de jogo</p>
      <h2 className="title">{result.score.toLocaleString('pt-BR')} pontos</h2>
      <p className="lead">Você chegou à onda {result.wave}.</p>
      <ul className="legend">
        {[...INVADER_TYPES].reverse().map((t) => (
          <li key={t} style={{ '--c': INVADER_COLORS[t] } as React.CSSProperties}>
            <InvaderIcon type={t} />
            <span>{INVADER_NAMES[t]}</span>
            <strong>× {result.kills[t]}</strong>
          </li>
        ))}
      </ul>
      {status === 'saved' ? (
        <p className="gain">Pontuação salva no ranking.</p>
      ) : (
        <form className="save-form" onSubmit={submit}>
          <label htmlFor="player-name">Seu nome</label>
          <div className="save-row">
            <input
              id="player-name"
              value={name}
              maxLength={PLAYER_NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              placeholder="Piloto"
              autoComplete="nickname"
              autoFocus
            />
            <button className="btn btn-primary" disabled={status === 'saving'}>
              {status === 'saving' ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
      <div className="menu-actions">
        <button className="btn btn-secondary" onClick={onAgain}>
          Jogar de novo
        </button>
        <button className="btn btn-ghost" onClick={onStats}>
          Ver ranking
        </button>
      </div>
    </section>
  );
}
