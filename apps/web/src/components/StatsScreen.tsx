import { useEffect, useState } from 'react';
import { hexDump, isInvaderType } from '@lab/domain';
import { fetchSave, fetchStats, type Stats } from '../api';
import { INVADER_COLORS, INVADER_NAMES } from '../game/sprites';
import { InvaderIcon } from './screens';

export function StatsScreen({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Falha ao carregar.'));
  }, []);

  const maxKills = Math.max(1, ...(stats?.killsByType.map((k) => k.total) ?? []));
  const maxPoints = Math.max(1, ...(stats?.pointsByDay.map((d) => d.points) ?? []));

  return (
    <section className="stats card-dark printable">
      <header className="stats-header">
        <div>
          <p className="eyebrow">Estatísticas</p>
          <h2 className="title title-sm">Ranking de pilotos</h2>
        </div>
        <div className="menu-actions no-print">
          <button className="btn btn-primary" onClick={() => window.print()} disabled={!stats}>
            Imprimir
          </button>
          <button className="btn btn-ghost" onClick={onBack}>
            Voltar
          </button>
        </div>
      </header>
      {error && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
      {!stats && !error && <p className="muted">Carregando…</p>}
      {stats && (
        <div className="stats-grid">
          <div className="panel">
            <h3>Melhores pontuações</h3>
            {stats.ranking.length === 0 ? (
              <p className="muted">Ninguém no ranking ainda. Jogue e salve sua pontuação.</p>
            ) : (
              <table className="ranking">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Piloto</th>
                    <th>Recorde</th>
                    <th>Onda</th>
                    <th>Partidas</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.ranking.map((r, i) => (
                    <tr key={r.name}>
                      <td>{i + 1}</td>
                      <td>{r.name}</td>
                      <td className="num">{r.best.toLocaleString('pt-BR')}</td>
                      <td className="num">{r.bestWave}</td>
                      <td className="num">{r.games}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="panel">
            <h3>Abatidos por tipo</h3>
            <div className="bars">
              {stats.killsByType.map((k) =>
                isInvaderType(k.type) ? (
                  <div className="bar-row" key={k.type}>
                    <InvaderIcon type={k.type} size={26} />
                    <span>{INVADER_NAMES[k.type]}</span>
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{ width: `${(k.total / maxKills) * 100}%`, background: INVADER_COLORS[k.type] }}
                      />
                    </div>
                    <strong className="num">{k.total}</strong>
                  </div>
                ) : null,
              )}
              {stats.killsByType.length === 0 && <p className="muted">Sem abates registrados.</p>}
            </div>
            <h3>Pontos por dia</h3>
            <div className="bars">
              {stats.pointsByDay.map((d) => (
                <div className="bar-row bar-row-day" key={d.day}>
                  <span>{new Date(`${d.day}T12:00:00`).toLocaleDateString('pt-BR')}</span>
                  <div className="bar">
                    <div className="bar-fill" style={{ width: `${(d.points / maxPoints) * 100}%` }} />
                  </div>
                  <strong className="num">{d.points.toLocaleString('pt-BR')}</strong>
                </div>
              ))}
              {stats.pointsByDay.length === 0 && <p className="muted">Sem partidas salvas.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** Rota de debug: o arquivo de save byte a byte (cap. 9). */
export function DebugScreen({ onBack }: { onBack: () => void }) {
  const [lines, setLines] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSave()
      .then((bytes) => setLines(hexDump(bytes)))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Falha ao ler o save.'));
  }, []);

  return (
    <section className="stats card-dark">
      <header className="stats-header">
        <div>
          <p className="eyebrow">Debug</p>
          <h2 className="title title-sm">Save em hexadecimal</h2>
        </div>
        <button className="btn btn-ghost" onClick={onBack}>
          Voltar
        </button>
      </header>
      {error && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
      {lines && <pre className="hex">{lines.join('\n') || '(arquivo vazio)'}</pre>}
    </section>
  );
}
