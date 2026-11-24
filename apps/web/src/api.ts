import type { GameResult, GameSnapshot } from '@lab/domain';

export interface Stats {
  ranking: { name: string; best: number; games: number; bestWave: number }[];
  killsByType: { type: string; total: number }[];
  pointsByDay: { day: string; points: number; games: number }[];
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Erro ${res.status} em ${url}`);
  }
  return res;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export async function saveResult(result: GameResult): Promise<void> {
  await request('/api/games', json(result));
}

export async function fetchStats(): Promise<Stats> {
  return (await request('/api/stats')).json() as Promise<Stats>;
}

export async function saveGame(snapshot: GameSnapshot): Promise<void> {
  await request('/api/save', { ...json(snapshot), method: 'PUT' });
}

/** Texto cru do save: quem interpreta (e acusa corrupção) é o domínio. */
export async function fetchSave(): Promise<Uint8Array> {
  const res = await request('/api/save');
  return new Uint8Array(await res.arrayBuffer());
}
