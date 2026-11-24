import { useEffect, useState } from 'react';

const TITLE = 'Invasores';
const SUBTITLE = 'Ondas de invasores no Canvas · Laboratório 3 em TypeScript';

/** Tela inicial do laboratório: troque pelo jogo seguindo o docs/cronograma.md. */
export function App() {
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => setApiOk(res.ok))
      .catch(() => setApiOk(false));
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            👾
          </span>
          <div>
            <h1>{TITLE}</h1>
            <p>{SUBTITLE}</p>
          </div>
        </div>
      </header>
      <main className="layout">
        <section className="card">
          <header className="card-header">
            <h2>Estrutura pronta</h2>
            <span className={apiOk ? 'gain' : 'loss'}>
              {apiOk === null ? 'conferindo a API…' : apiOk ? '● API no ar' : '● API fora do ar'}
            </span>
          </header>
          <p className="muted">
            React + Vite, Fastify, Postgres e Vitest sobem com <code>docker compose up</code>. O plano das
            semanas está em <code>docs/cronograma.md</code>.
          </p>
        </section>
      </main>
    </div>
  );
}
