import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GameOverScreen } from './screens';
import { mockFetch } from '../test/helpers';

const result = { score: 1230, wave: 3, kills: { drone: 20, stinger: 8, crown: 2 } } as never;

function setup() {
  const props = { onAgain: vi.fn(), onStats: vi.fn() };
  render(<GameOverScreen result={result} {...props} />);
  return props;
}

describe('fim de jogo', () => {
  it('mostra pontos, onda e abates por tipo', () => {
    setup();
    expect(screen.getByRole('heading', { name: '1.230 pontos' })).toBeInTheDocument();
    expect(screen.getByText('Você chegou à onda 3.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Coroa× 2',
      'Ferrão× 8',
      'Drone× 20',
    ]);
  });

  it('pede um nome antes de salvar e não chama a API', async () => {
    const fetch = mockFetch({});
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escreva um nome');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('envia o resultado com o nome digitado e lembra o nome', async () => {
    const fetch = mockFetch({ 'POST /api/games': { status: 201, body: { id: 1 } } });
    setup();
    await userEvent.type(screen.getByLabelText('Seu nome'), '  Ana ');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Pontuação salva no ranking.')).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toEqual({
      name: 'Ana',
      score: 1230,
      wave: 3,
      kills: { drone: 20, stinger: 8, crown: 2 },
    });
    expect(localStorage.getItem('invasores:name')).toBe('Ana');
    expect(screen.queryByLabelText('Seu nome')).not.toBeInTheDocument();
  });

  it('mostra o erro da API e deixa tentar de novo', async () => {
    mockFetch({ 'POST /api/games': { status: 400, body: { error: 'Pontuação inválida.' } } });
    setup();
    await userEvent.type(screen.getByLabelText('Seu nome'), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Pontuação inválida.');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });

  it('os botões de baixo jogam de novo e abrem o ranking', async () => {
    const { onAgain, onStats } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Jogar de novo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ver ranking' }));
    expect(onAgain).toHaveBeenCalledTimes(1);
    expect(onStats).toHaveBeenCalledTimes(1);
  });
});
