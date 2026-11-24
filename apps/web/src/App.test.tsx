import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { currentGame, forceGameOver, mockFetch, savedGameText, shootDown, STATS } from './test/helpers';

/** O placar é um Web Component com shadow DOM: lemos o que ele mostra pelo texto de cada campo. */
function board() {
  const root = document.querySelector('score-board')!.shadowRoot!;
  const text = (id: string) => root.getElementById(id)!.textContent;
  return {
    score: () => text('score'),
    wave: () => text('wave'),
    lives: () => root.getElementById('lives')!.getAttribute('aria-label'),
  };
}

describe('menu', () => {
  it('mostra a legenda dos três tipos com seus pontos e as ações principais', () => {
    render(<App />);
    const legend = screen.getByRole('list');
    const items = within(legend).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['Coroa30 pts', 'Ferrão20 pts', 'Drone10 pts']);
    expect(screen.getByRole('button', { name: 'Jogar' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Continuar jogo salvo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Ranking e estatísticas' })).toBeEnabled();
  });

  it('mostra a mensagem de erro quando o jogo salvo está corrompido', async () => {
    mockFetch({ 'GET /api/save': { text: 'isto não é um jogo' } });
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Continuar jogo salvo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('O jogo salvo está corrompido (o arquivo não é JSON)');
    expect(screen.getByRole('button', { name: 'Jogar' })).toBeInTheDocument();
  });

  it('avisa quando não existe jogo salvo', async () => {
    mockFetch({});
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Continuar jogo salvo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nenhum jogo salvo ainda.');
  });

  it('continua o jogo salvo: abre pausado com pontos, onda e vidas do arquivo', async () => {
    mockFetch({ 'GET /api/save': { text: savedGameText() } });
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Continuar jogo salvo' }));
    expect(await screen.findByRole('dialog', { name: 'Pausa' })).toBeInTheDocument();
    expect(board().score()).toBe('250');
    expect(board().wave()).toBe('3');
    expect(board().lives()).toBe('2 vidas');
  });
});

describe('partida', () => {
  it('começa com o placar zerado e o campo de batalha na tela', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Jogar' }));
    expect(screen.getByLabelText('Campo de batalha')).toBeInTheDocument();
    expect(board().score()).toBe('0');
    expect(board().wave()).toBe('1');
    expect(board().lives()).toBe('3 vidas');
    expect(screen.queryByRole('dialog', { name: 'Pausa' })).not.toBeInTheDocument();
  });

  it('o placar sobe quando o jogo derruba um invasor', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Jogar' }));
    shootDown(currentGame()); // um Drone da fileira de baixo
    expect(board().score()).toBe('10');
  });

  it('P pausa e P retoma; o jogo para enquanto está pausado', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Jogar' }));
    await user.keyboard('p');
    expect(await screen.findByRole('dialog', { name: 'Pausa' })).toBeInTheDocument();
    expect(currentGame().status).toBe('paused');
    await user.keyboard('p');
    expect(screen.queryByRole('dialog', { name: 'Pausa' })).not.toBeInTheDocument();
    expect(currentGame().status).toBe('playing');
  });

  it('o botão de pausa e o Continuar da pausa funcionam com o mouse', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Jogar' }));
    await user.click(screen.getByRole('button', { name: 'Pausar' }));
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));
    expect(screen.queryByRole('dialog', { name: 'Pausa' })).not.toBeInTheDocument();
    expect(currentGame().status).toBe('playing');
  });

  it('o teclado anda com as setas e atira com o espaço', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Jogar' }));
    const game = currentGame();
    await user.keyboard('{ArrowLeft>}');
    expect(game.controls.left).toBe(true);
    await user.keyboard('{/ArrowLeft}');
    expect(game.controls.left).toBe(false);
    expect(game.shots).toHaveLength(0);
    await user.keyboard(' ');
    expect(game.shots.filter((s) => s.owner === 'player')).toHaveLength(1);
  });

  it('os botões de toque chamam o jogo: andar enquanto segura e atirar', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Jogar' }));
    const game = currentGame();
    await user.pointer({ keys: '[MouseLeft>]', target: screen.getByRole('button', { name: 'Direita' }) });
    expect(game.controls.right).toBe(true);
    await user.pointer({ keys: '[/MouseLeft]' });
    expect(game.controls.right).toBe(false);
    await user.pointer({ keys: '[MouseLeft>]', target: screen.getByRole('button', { name: 'Atirar' }) });
    expect(game.shots).toHaveLength(1);
    await user.pointer({ keys: '[/MouseLeft]' });
  });

  it('salva o jogo pela pausa e confirma na tela', async () => {
    const fetch = mockFetch({ 'PUT /api/save': { status: 204 } });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Jogar' }));
    await user.keyboard('p');
    await user.click(await screen.findByRole('button', { name: 'Salvar jogo' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Jogo salvo');
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('/api/save');
    expect(JSON.parse(init!.body as string)).toMatchObject({ version: 1, score: 0, lives: 3, wave: 1 });
  });

  it('quando a partida acaba, mostra o fim de jogo com os pontos', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Jogar' }));
    shootDown(currentGame());
    forceGameOver(currentGame());
    expect(await screen.findByText('Fim de jogo', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '10 pontos' })).toBeInTheDocument();
    expect(screen.getByLabelText('Seu nome')).toHaveFocus();
  });
});

describe('ranking e debug', () => {
  it('mostra o ranking e os abates com os dados da API', async () => {
    mockFetch({ 'GET /api/stats': { body: STATS } });
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Ranking e estatísticas' }));
    const rows = await screen.findAllByRole('row');
    expect(rows.map((r) => r.textContent)).toEqual([
      '#PilotoRecordeOndaPartidas',
      '1Ana12.40045',
      '2Beto3.20022',
    ]);
    expect(screen.getByText('Drone')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('15.600')).toBeInTheDocument();
  });

  it('mostra o erro quando as estatísticas não carregam', async () => {
    mockFetch({ 'GET /api/stats': { status: 500, body: { error: 'Banco fora do ar' } } });
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Ranking e estatísticas' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Banco fora do ar');
  });

  it('#/debug mostra o save em hexadecimal, 16 bytes por linha', async () => {
    mockFetch({ 'GET /api/save': { text: '{"version":1,"score":40}' } });
    history.replaceState(null, '', '/#/debug');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Save em hexadecimal' })).toBeInTheDocument();
    const dump = await screen.findByText(/00000000/);
    expect(dump.textContent).toContain('7b 22 76 65 72 73 69 6f 6e 22 3a 31 2c 22 73 63  {"version":1,"sc');
    expect(dump.textContent).toContain('00000010');
  });
});
