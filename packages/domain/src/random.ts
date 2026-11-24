/** Fonte de números aleatórios injetável: o `Random` do livro, trocável nos testes. */
export interface RandomSource {
  /** Inteiro entre `min` (incluso) e `max` (excluso), como `Random.Next(min, max)` do C#. */
  next(min: number, max: number): number;
}

export const mathRandom: RandomSource = {
  next: (min, max) => min + Math.floor(Math.random() * (max - min)),
};

/** Devolve os valores na ordem, em ciclo. Serve para testes com aleatório controlado. */
export function sequenceRandom(values: number[]): RandomSource {
  let i = 0;
  return {
    next: (min, max) => {
      const value = values[i % values.length] ?? min;
      i++;
      return Math.min(Math.max(value, min), max - 1);
    },
  };
}
