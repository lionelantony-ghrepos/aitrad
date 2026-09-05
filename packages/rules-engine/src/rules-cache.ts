import type { DecisionTable } from "./evaluate";

export const RULES_PUBLISHED_EVENT = "rules:published" as const;

export type PublishedDomainTable = {
  domain: string;
  tableKey: string;
  version: number;
  table: DecisionTable;
};

export class PublishedRulesCache {
  private readonly byDomain = new Map<string, PublishedDomainTable[]>();
  private generation: string | null = null;

  invalidate(message?: { event?: string; type?: string }): void {
    if (
      !message ||
      message.event === RULES_PUBLISHED_EVENT ||
      message.type === RULES_PUBLISHED_EVENT
    ) {
      this.byDomain.clear();
    }
  }

  syncGeneration(token: string): void {
    if (this.generation !== token) {
      this.byDomain.clear();
      this.generation = token;
    }
  }

  async get(
    domain: string,
    loader: (domain: string) => Promise<PublishedDomainTable[]>,
  ): Promise<PublishedDomainTable[]> {
    const hit = this.byDomain.get(domain);
    if (hit) {
      return hit;
    }
    const loaded = await loader(domain);
    this.byDomain.set(domain, loaded);
    return loaded;
  }
}
