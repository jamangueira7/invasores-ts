import { describe, expect, it } from 'vitest';
import { Game } from '@lab/domain';
import { type ScoreBoard } from './score-board';
import './score-board';
import { shootDown } from '../test/helpers';

function mount(game: Game) {
  const el = document.createElement('score-board') as ScoreBoard;
  document.body.append(el);
  el.game = game;
  const read = (id: string) => el.shadowRoot!.getElementById(id)!.textContent;
  return { el, read, lost: () => el.shadowRoot!.querySelectorAll('.life.lost').length };
}

const quiet = () => new Game({ invaderFireRate: 0 });

describe('<score-board>', () => {
  it('mostra o estado inicial do jogo', () => {
    const board = mount(quiet());
    expect(board.read('score')).toBe('0');
    expect(board.read('wave')).toBe('1');
    expect(board.lost()).toBe(0);
  });

  it('reage ao evento de invasor abatido: pontos e contagem por tipo', () => {
    const game = quiet();
    const board = mount(game);
    shootDown(game);
    expect(board.read('score')).toBe('10');
    expect([...board.el.shadowRoot!.querySelectorAll('.kill')].map((k) => k.textContent)).toEqual(['1', '0', '0']);
  });

  it('reage ao tiro que acerta a nave: uma vida a menos', () => {
    const game = quiet();
    const board = mount(game);
    const shot = game.invaderFire()!;
    for (let t = 0; t < 400 && game.lives === 3; t++) {
      game.player.placeAt(shot.x - game.player.width / 2);
      game.update(16);
    }
    expect(game.lives).toBe(2);
    expect(board.lost()).toBe(1);
    expect(board.el.shadowRoot!.getElementById('lives')!.getAttribute('aria-label')).toBe('2 vidas');
  });

  it('reage à onda limpa: a onda sobe', () => {
    const game = quiet();
    const board = mount(game);
    // sobra um invasor só e a formação fica parada, para o tiro não errar
    Object.assign(game, { _invaders: game.invaders.slice(0, 1), stepClock: -1e9 });
    shootDown(game);
    expect(board.read('wave')).toBe('2');
  });

  it('para de escutar quando sai da página', () => {
    const game = quiet();
    const board = mount(game);
    board.el.remove();
    shootDown(game);
    expect(board.read('score')).toBe('0');
  });
});
