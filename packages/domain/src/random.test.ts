import { describe, expect, it } from 'vitest';
import { sequenceRandom } from './random';

describe('sequenceRandom', () => {
  it('devolve os valores em ciclo, dentro da faixa pedida', () => {
    const random = sequenceRandom([0, 7, 2]);
    expect(random.next(1, 5)).toBe(1);
    expect(random.next(1, 5)).toBe(4);
    expect(random.next(1, 5)).toBe(2);
    expect(random.next(1, 5)).toBe(1);
  });
});
