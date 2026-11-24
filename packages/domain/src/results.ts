import { INVADER_TYPES, InvaderType, isInvaderType } from './invader';

export const PLAYER_NAME_MAX = 20;
export const SCORE_MAX = 10_000_000;
export const WAVE_MAX = 1000;

/** Resultado de uma partida, como a tela manda para a API. */
export interface GameResult {
  name: string;
  score: number;
  wave: number;
  kills: Record<InvaderType, number>;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

const isCount = (n: unknown, max: number): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= max;

/** Mesma regra na tela e na API: nome de 1 a 20 caracteres, números inteiros e tipos conhecidos. */
export function validateGameResult(input: unknown): Validation<GameResult> {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'Corpo inválido.' };
  const body = input as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 1 || name.length > PLAYER_NAME_MAX) {
    return { ok: false, error: `O nome precisa ter de 1 a ${PLAYER_NAME_MAX} caracteres.` };
  }
  if (!isCount(body.score, SCORE_MAX)) return { ok: false, error: 'Pontuação inválida.' };
  if (!isCount(body.wave, WAVE_MAX) || body.wave < 1) return { ok: false, error: 'Onda inválida.' };
  const rawKills = body.kills;
  if (typeof rawKills !== 'object' || rawKills === null) return { ok: false, error: 'Abates inválidos.' };
  const kills = { [InvaderType.Drone]: 0, [InvaderType.Stinger]: 0, [InvaderType.Crown]: 0 };
  for (const [type, count] of Object.entries(rawKills)) {
    if (!isInvaderType(type) || !isCount(count, SCORE_MAX)) return { ok: false, error: `Abate inválido: ${type}.` };
    kills[type] = count;
  }
  for (const type of INVADER_TYPES) kills[type] ??= 0;
  return { ok: true, value: { name, score: body.score, wave: body.wave, kills } };
}
