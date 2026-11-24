import type { Game } from '@lab/domain';
import type { Renderer } from './renderer';

// Polyfill: navegadores sem `Symbol.dispose` usam o mesmo símbolo que o TS/esbuild procuram.
(Symbol as { dispose?: symbol }).dispose ??= Symbol.for('Symbol.dispose');

export interface LoopOptions {
  /** prefers-reduced-motion: estrelas trocam bem menos. */
  reducedMotion?: boolean;
  /** Intervalo do relógio da lógica (setInterval). */
  logicMs?: number;
}

/**
 * Dois relógios (cap. 12): `requestAnimationFrame` desenha a cada quadro da tela e
 * `setInterval` avança a lógica (inclusive o passo da formação de invasores).
 */
export class GameLoop implements Disposable {
  private frame = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private frames = 0;

  constructor(
    private readonly game: Game,
    private readonly renderer: Renderer,
    private readonly options: LoopOptions = {},
  ) {}

  start(): void {
    let last = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      this.game.update(now - last);
      last = now;
    }, this.options.logicMs ?? 1000 / 120);

    const draw = (now: number) => {
      this.frames++;
      if (this.game.status === 'playing') {
        if (!this.options.reducedMotion) this.game.stars.twinkle(5);
        else if (this.frames % 30 === 0) this.game.stars.twinkle(1);
      }
      this.renderer.draw(now);
      this.frame = requestAnimationFrame(draw);
    };
    this.frame = requestAnimationFrame(draw);
  }

  [Symbol.dispose](): void {
    clearInterval(this.timer);
    cancelAnimationFrame(this.frame);
  }
}

/** Teclado: ←/→ ou A/D andam, espaço atira, P pausa. Remove os listeners ao ser descartado. */
export class Keyboard implements Disposable {
  private readonly controller = new AbortController();

  constructor(
    private readonly game: Game,
    onPause: () => void,
  ) {
    const set = (e: KeyboardEvent, pressed: boolean) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') this.game.controls.left = pressed;
      else if (key === 'arrowright' || key === 'd') this.game.controls.right = pressed;
      else if (key === ' ' || key === 'arrowup' || key === 'w') {
        // toque rápido também atira: não depende de o relógio da lógica ver a tecla apertada
        if (pressed && !e.repeat) this.game.playerFire();
        this.game.controls.fire = pressed;
      }
      else if ((key === 'p' || key === 'escape') && pressed && !e.repeat) onPause();
      else return;
      e.preventDefault();
    };
    const { signal } = this.controller;
    window.addEventListener('keydown', (e) => set(e, true), { signal });
    window.addEventListener('keyup', (e) => set(e, false), { signal });
    window.addEventListener('blur', () => Object.assign(this.game.controls, { left: false, right: false, fire: false }), {
      signal,
    });
  }

  [Symbol.dispose](): void {
    this.controller.abort();
  }
}
