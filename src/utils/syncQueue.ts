const queues = new Map<string, Promise<void>>();

export function enqueue(key: string, fn: () => Promise<unknown>): void {
  const prev = queues.get(key) ?? Promise.resolve();
  const next: Promise<void> = prev.then(() => fn()).then(() => {});
  queues.set(key, next);
  next.catch(() => queues.delete(key));
}
