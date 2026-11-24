/** Emissor de eventos tipado (cap. 11): o `event` do C# com o tipo do argumento conferido pelo TS. */
export class TypedEmitter<Events extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof Events, Set<(payload: never) => void>>();

  /** Assina o evento e devolve a função que cancela a assinatura. */
  on<K extends keyof Events>(type: K, listener: (payload: Events[K]) => void): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener as (payload: never) => void);
    return () => this.off(type, listener);
  }

  off<K extends keyof Events>(type: K, listener: (payload: Events[K]) => void): void {
    this.listeners.get(type)?.delete(listener as (payload: never) => void);
  }

  protected emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      (listener as (payload: Events[K]) => void)(payload);
    }
  }
}
