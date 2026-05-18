export class TTLCache<T> {
  private readonly items = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const item = this.items.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiresAt) {
      this.items.delete(key);
      return undefined;
    }
    return item.value;
  }

  set(key: string, value: T): void {
    this.items.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
