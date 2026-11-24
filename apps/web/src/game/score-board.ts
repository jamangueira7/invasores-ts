import { type Game, INVADER_TYPES, STARTING_LIVES } from '@lab/domain';
import { INVADER_COLORS, SHIP_COLOR } from './sprites';

const template = `
<style>
  :host { display: block; font-family: inherit; color: #e2e8f0; }
  .board { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 18px;
    padding: 10px 16px; border-radius: 14px; background: rgb(15 23 42 / 72%); border: 1px solid rgb(148 163 184 / 18%); }
  .group { display: flex; align-items: baseline; gap: 8px; }
  .label { font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: #94a3b8; }
  .value { font-size: 1.35rem; font-weight: 800; font-variant-numeric: tabular-nums; }
  #score { color: ${SHIP_COLOR}; min-width: 5ch; }
  .lives { display: flex; gap: 6px; align-self: center; }
  .life { width: 18px; height: 12px; background: ${SHIP_COLOR};
    clip-path: polygon(50% 0, 65% 40%, 100% 75%, 100% 100%, 0 100%, 0 75%, 35% 40%); transition: opacity .3s; }
  .life.lost { opacity: 0.18; }
  .kills { display: flex; gap: 10px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .kill::before { content: ''; display: inline-block; width: 9px; height: 9px; margin-right: 5px; border-radius: 3px;
    background: var(--c); }
  .flash { animation: flash .5s ease-out; }
  @keyframes flash { from { transform: scale(1.25); } }
  @media (prefers-reduced-motion: reduce) { .flash { animation: none; } }
</style>
<div class="board" part="board">
  <div class="group"><span class="label">Pontos</span><span class="value" id="score" aria-live="polite">0</span></div>
  <div class="group"><span class="label">Onda</span><span class="value" id="wave">1</span></div>
  <div class="kills" id="kills"></div>
  <div class="group"><span class="label">Vidas</span><div class="lives" id="lives" role="img"></div></div>
</div>`;

/**
 * Placar como Web Component (cap. 13). Ele só escuta os eventos do `Game` (cap. 11):
 * nunca consulta o jogo a cada quadro e nunca muda o estado dele.
 */
export class ScoreBoard extends HTMLElement {
  #off: (() => void)[] = [];
  #game: Game | undefined;
  readonly #root = this.attachShadow({ mode: 'open' });

  constructor() {
    super();
    this.#root.innerHTML = template;
  }

  set game(game: Game | undefined) {
    this.#detach();
    this.#game = game;
    if (!game) return;
    this.#off.push(
      game.on('invaderKilled', () => this.#render('score')),
      game.on('playerHit', () => this.#render('lives')),
      game.on('waveCleared', () => this.#render('wave')),
      game.on('gameOver', () => this.#render()),
    );
    this.#render();
  }

  disconnectedCallback(): void {
    this.#detach();
  }

  #detach(): void {
    for (const off of this.#off) off();
    this.#off = [];
  }

  #render(flash?: 'score' | 'lives' | 'wave'): void {
    const game = this.#game;
    if (!game) return;
    const $ = (id: string) => this.#root.getElementById(id)!;
    $('score').textContent = game.score.toLocaleString('pt-BR');
    $('wave').textContent = String(game.wave);
    $('kills').innerHTML = INVADER_TYPES.map(
      (t) => `<span class="kill" style="--c:${INVADER_COLORS[t]}">${game.kills[t]}</span>`,
    ).join('');
    const lives = $('lives');
    lives.setAttribute('aria-label', `${game.lives} vidas`);
    lives.innerHTML = Array.from(
      { length: STARTING_LIVES },
      (_, i) => `<span class="life${i < game.lives ? '' : ' lost'}"></span>`,
    ).join('');
    if (flash) {
      const el = flash === 'lives' ? lives : $(flash);
      el.classList.remove('flash');
      void el.offsetWidth;
      el.classList.add('flash');
    }
  }
}

if (!customElements.get('score-board')) customElements.define('score-board', ScoreBoard);

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'score-board': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
