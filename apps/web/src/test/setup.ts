import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/** Contexto 2D de mentira: aceita qualquer chamada de desenho e não desenha nada. */
function fakeContext(canvas: HTMLCanvasElement) {
  const own: Record<string | symbol, unknown> = {
    canvas,
    createLinearGradient: () => ({ addColorStop: () => undefined }),
    createRadialGradient: () => ({ addColorStop: () => undefined }),
    measureText: () => ({ width: 0 }),
  };
  return new Proxy(own, { get: (target, prop) => (prop in target ? target[prop] : () => undefined) });
}

beforeEach(() => {
  vi.stubGlobal('OffscreenCanvas', undefined); // o Renderer cai no <canvas> comum
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    return fakeContext(this) as unknown as CanvasRenderingContext2D;
  } as never);
  // requestAnimationFrame controlado: um quadro a cada 16 ms do relógio (falso ou real) do teste.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    window.setTimeout(() => cb(performance.now()), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  Element.prototype.setPointerCapture = () => undefined;
  window.print = vi.fn();
  localStorage.clear();
  // Sem sorte: ninguém do lado inimigo atira durante os testes.
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  history.replaceState(null, '', '/');
});
